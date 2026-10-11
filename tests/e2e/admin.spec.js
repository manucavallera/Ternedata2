const { test, expect, esperarEscritura, modal } = require('./fixtures');

const ES_LOCAL = /localhost/.test(process.env.WEB_URL);

const abrirPanel = async (page, pestana) => {
  await page.goto('/panel-admin');
  await expect(page.getByRole('heading', { name: 'Panel de Administración' })).toBeVisible();
  await page.getByRole('button', { name: pestana }).click();
};

test.describe('Panel de administración', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('establecimientos: crear, usar sin volver a loguearse, editar, desactivar y eliminar', async ({ page }) => {
    const nombre = `TEST E2E Estab ${Date.now() % 99999}`;
    await page.goto('/admin/dashboard');
    const original = await page.evaluate(() => localStorage.getItem('establecimientoActual'));
    await abrirPanel(page, '🏢 Establecimientos');
    const tarjeta = (texto) => page.locator('div')
      .filter({ has: page.getByRole('heading', { name: texto }) })
      .filter({ has: page.getByRole('button', { name: 'Editar' }) }).last();

    await test.step('crear', async () => {
      await page.getByRole('button', { name: '➕ Crear Establecimiento' }).click();
      const m = modal(page, 'Crear Establecimiento');
      await m.getByPlaceholder('Estancia La Esperanza').fill(nombre);
      await m.getByPlaceholder('Ruta 14, Km 87').fill('TEST E2E ubicación');
      await m.getByPlaceholder('Roberto Martínez').fill('TEST E2E');
      const alta = esperarEscritura(page, '/establecimientos');
      await m.getByRole('button', { name: '➕ Crear' }).click();
      expect((await alta).status()).toBeLessThan(300);
      await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
    });

    await test.step('el establecimiento nuevo se puede usar enseguida', async () => {
      const selector = page.locator('select').first();
      const anterior = await selector.inputValue();
      const kpis = page.waitForResponse((r) => r.url().includes('/terneros/resumen-dashboard') && r.status() !== 429);
      await page.goto('/admin/dashboard');
      await kpis;
      const delNuevo = page.waitForResponse((r) => r.url().includes('/terneros/resumen-dashboard') && r.status() !== 429);
      await selector.selectOption({ label: await selector.locator('option', { hasText: nombre }).innerText() });
      expect((await delNuevo).status()).toBe(200);
      await selector.selectOption(anterior);
    });

    await test.step('editar', async () => {
      await abrirPanel(page, '🏢 Establecimientos');
      await tarjeta(nombre).getByRole('button', { name: 'Editar' }).click();
      const m = modal(page, 'Editar Establecimiento');
      await m.getByPlaceholder('Roberto Martínez').fill('TEST E2E editado');
      const guardado = esperarEscritura(page, '/establecimientos');
      await m.locator('button').last().click();
      expect((await guardado).status()).toBeLessThan(300);
      await expect(tarjeta(nombre)).toContainText('TEST E2E editado');
    });

    await test.step('desactivar', async () => {
      const guardado = esperarEscritura(page, '/toggle-estado');
      await tarjeta(nombre).getByRole('button', { name: 'Desactivar' }).click();
      expect((await guardado).status()).toBeLessThan(300);
      await expect(tarjeta(nombre).getByRole('button', { name: 'Activar' })).toBeVisible();
    });

    await test.step('eliminar', async () => {
      // Comportamiento actual: quien crea el establecimiento queda asignado a él y la app no deja eliminarlo.
      await tarjeta(nombre).getByRole('button', { name: 'Eliminar' }).click();
      await expect(page.getByText(/No se puede eliminar/)).toBeVisible();
    });

    await test.step('limpieza por API', async () => {
      const sesion = await page.evaluate(() => ({
        token: localStorage.getItem('token'), usuario: JSON.parse(localStorage.getItem('userSelected')).id,
      }));
      const headers = { Authorization: `Bearer ${sesion.token}` };
      const reasignado = await page.request.post(`${process.env.SECURITY_URL}/users/assign-establishment`, {
        headers, data: { userId: sesion.usuario, establecimientoId: Number(original) },
      });
      expect(reasignado.status()).toBeLessThan(300);
      const creado = await tarjeta(nombre).innerText();
      const lista = await (await page.request.get(`${process.env.BUSSINES_URL}/establecimientos`, { headers })).json();
      const id = lista.find((e) => e.nombre === nombre).id_establecimiento;
      const baja = await page.request.delete(`${process.env.BUSSINES_URL}/establecimientos/${id}`, { headers });
      expect([200, 204], `baja de ${creado.slice(0, 30)}`).toContain(baja.status());
    });
  });

  test('usuarios: crear un operario, verlo en la tabla, desactivarlo y eliminarlo', async ({ page }) => {
    // La baja de usuario es lógica: contra producción dejaría usuarios de prueba para siempre.
    test.skip(!ES_LOCAL, 'solo en entorno local');
    const email = `e2e_operario_${Date.now() % 99999}@ternedata.com`;
    await page.goto('/admin/dashboard');
    const establecimiento = (await page.locator('select').first().locator('option:checked').innerText()).replace(/^\S+\s/, '');
    await abrirPanel(page, '👥 Gestión de Usuarios');
    const filaUsuario = page.locator('tr', { hasText: email });

    await test.step('crear', async () => {
      await page.getByRole('button', { name: '➕ Crear Usuario' }).click();
      const m = modal(page, 'Crear Usuario');
      await m.getByPlaceholder('Juan Pérez').fill('TEST E2E Operario');
      await m.getByPlaceholder('juan@ejemplo.com').fill(email);
      await m.getByPlaceholder('Mínimo 6 caracteres').fill('ClaveE2E123');
      // Se asigna al establecimiento activo: el admin solo gestiona usuarios de sus establecimientos.
      const asignacion = m.locator('select').nth(1);
      const opcion = await asignacion.locator('option', { hasText: establecimiento }).first().innerText();
      await asignacion.selectOption({ label: opcion });
      const alta = esperarEscritura(page, '/users');
      await m.getByRole('button', { name: '➕ Crear' }).click();
      expect((await alta).status()).toBeLessThan(300);
      await expect(filaUsuario).toBeVisible();
      await expect(filaUsuario).toContainText('TEST E2E Operario');
    });

    await test.step('desactivar', async () => {
      const guardado = esperarEscritura(page, '/toggle-status');
      await filaUsuario.getByRole('button', { name: 'activo', exact: true }).click();
      const respuesta = await guardado;
      expect(respuesta.status(), `${respuesta.url()} ${await respuesta.text()}`).toBeLessThan(300);
      await expect(filaUsuario.getByRole('button', { name: 'inactivo' })).toBeVisible();
    });

    await test.step('reactivar', async () => {
      const guardado = esperarEscritura(page, '/toggle-status');
      await filaUsuario.getByRole('button', { name: 'inactivo' }).click();
      expect((await guardado).status()).toBeLessThan(300);
      await expect(filaUsuario.getByRole('button', { name: 'activo', exact: true })).toBeVisible();
    });

    await test.step('eliminar lo deja desactivado (baja lógica)', async () => {
      const baja = esperarEscritura(page, '/users');
      await filaUsuario.getByRole('button', { name: '🗑️' }).click();
      expect((await baja).status()).toBeLessThan(300);
      await expect(filaUsuario.getByRole('button', { name: 'inactivo' })).toBeVisible();
    });
  });

  test('equipo: invitar a una persona, verla en pendientes y revocar', async ({ page }) => {
    const email = `e2e_invitado_${Date.now() % 99999}@ternedata.com`;
    await abrirPanel(page, '🚜 Equipo');
    await page.getByRole('button', { name: 'Invitar persona' }).click();
    await page.locator('input[type="email"]').filter({ visible: true }).last().fill(email);
    const invitacion = page.waitForResponse((r) => /generar-token|invitaci/i.test(r.url()) && r.request().method() !== 'OPTIONS' && r.status() !== 429);
    await page.getByRole('button', { name: /Generar|Enviar|Crear/ }).filter({ visible: true }).last().click();
    const respuestaInvitacion = await invitacion;
    expect(respuestaInvitacion.status(), `${respuestaInvitacion.url()} ${await respuestaInvitacion.text()}`).toBeLessThan(300);
    await expect(page.getByRole('button', { name: 'Copiar link' })).toBeVisible();
    await page.getByRole('button', { name: 'Listo' }).click();
    await page.getByRole('button', { name: /Pendientes/ }).click();
    const pendiente = page.locator('tr', { hasText: email });
    await expect(pendiente).toBeVisible();
    const revocado = esperarEscritura(page, '/invitaciones/revocar');
    await pendiente.getByRole('button').last().click();
    expect((await revocado).status()).toBeLessThan(300);
    await expect(pendiente).toHaveCount(0);
  });

  test('dashboard comparativo y configuración cargan', async ({ page }) => {
    await abrirPanel(page, '📊 Dashboard Comparativo');
    await expect(page.getByRole('heading', { name: 'Ranking de Establecimientos' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Mortalidad' })).toBeVisible();
    await page.getByRole('button', { name: '⚙️ Config' }).click();
    await expect(page.locator('main, body').getByRole('heading').filter({ hasText: /Config|Alert/i }).first()).toBeVisible();
  });
});
