const {
  test, expect, sembrarAnimales, esperarEscritura, abrirListado, fila, modal, eliminarFila,
} = require('./fixtures');

test.describe('Listados: edición y baja', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/dashboard');
  });

  test('madre: el modal de edición trae sus datos, guarda y se puede eliminar', async ({ page, api }) => {
    const { rpMadre } = await sembrarAnimales(api);
    await abrirListado(page, 'Madres');

    await fila(page, rpMadre).getByRole('button', { name: 'Editar' }).click();
    const edicion = modal(page, 'Editar Madre');
    await expect(edicion.locator('input[type="number"]')).toHaveValue(String(rpMadre));
    // Regla del backend: al registrarle un ternero la madre pasa a "En Tambo".
    await expect(edicion.locator('select')).toHaveValue('En Tambo');

    await edicion.locator('input[type="text"]').fill('TEST E2E Madre editada');
    const guardado = esperarEscritura(page, '/madres');
    await edicion.getByRole('button', { name: 'Guardar' }).click();
    expect((await guardado).status()).toBeLessThan(300);
    await expect(fila(page, rpMadre)).toContainText('TEST E2E Madre editada');
  });

  test('ternero: peso diario, peso oficial y edición guardan', async ({ page, api }) => {
    const { rpTernero } = await sembrarAnimales(api);
    await abrirListado(page, 'Terneros');

    await test.step('peso diario', async () => {
      await fila(page, rpTernero).getByRole('button', { name: 'Peso Diario' }).click();
      const m = modal(page, 'Registrar Peso Diario');
      await m.locator('input[type="number"]').fill('41.5');
      const guardado = esperarEscritura(page, '/terneros');
      await m.getByRole('button', { name: 'Registrar Peso' }).click();
      expect((await guardado).status()).toBeLessThan(300);
    });

    await test.step('peso oficial', async () => {
      await fila(page, rpTernero).getByRole('button', { name: 'Peso Oficial' }).click();
      const m = modal(page, 'Actualizar Peso Oficial');
      await m.locator('select').selectOption('15d');
      await m.locator('input[type="number"]').fill('46');
      const guardado = esperarEscritura(page, '/terneros');
      await m.getByRole('button', { name: 'Actualizar Peso' }).click();
      expect((await guardado).status()).toBeLessThan(300);
    });

    await test.step('edición', async () => {
      await fila(page, rpTernero).getByRole('button', { name: '✏️ Editar' }).click();
      const m = modal(page, 'Editar Ternero');
      await m.locator('input[type="text"]').fill('TEST E2E semen editado');
      const guardado = esperarEscritura(page, '/terneros');
      await m.getByRole('button', { name: 'Guardar' }).click();
      expect((await guardado).status()).toBeLessThan(300);
    });

    await test.step('seguimiento abre con el RP del ternero', async () => {
      await fila(page, rpTernero).getByRole('button', { name: 'Seguimiento' }).click();
      await expect(page.getByRole('heading', { name: `RP ${rpTernero}` })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Hitos de crecimiento' })).toBeVisible();
    });
  });

  test('ternero: se puede eliminar desde el listado', async ({ page, api }) => {
    const { rpTernero } = await sembrarAnimales(api);
    await abrirListado(page, 'Terneros');
    const baja = esperarEscritura(page, '/terneros');
    await eliminarFila(page, fila(page, rpTernero));
    expect((await baja).status()).toBeLessThan(300);
    await expect(page.locator('tr', { hasText: String(rpTernero) })).toHaveCount(0);
  });

  test('tratamiento: editar y eliminar', async ({ page, api }) => {
    const { idTernero } = await sembrarAnimales(api);
    const nombre = `TEST E2E Trat ${Date.now() % 99999}`;
    const tratamiento = await api.crear('/tratamientos/crear-tratamiento', {
      nombre, descripcion: 'TEST E2E', tipo_enfermedad: 'Diarrea', turno: 'mañana',
      fecha_tratamiento: '2026-10-01', id_ternero: idTernero,
    });
    api.borrarAlFinal(`/tratamientos/delete-tratamiento-by-id/${tratamiento.id_tratamiento}`);
    await abrirListado(page, 'Tratamientos');

    await fila(page, nombre).getByRole('button', { name: 'Editar' }).click();
    const m = modal(page, 'Editar Tratamiento');
    await expect(m.locator('input[type="text"]').first()).toHaveValue(nombre);
    await m.locator('textarea').fill('TEST E2E descripción editada');
    const guardado = esperarEscritura(page, '/tratamientos');
    await m.getByRole('button', { name: 'Guardar Cambios' }).click();
    expect((await guardado).status()).toBeLessThan(300);
    await expect(fila(page, nombre)).toContainText('TEST E2E descripción editada');

    const baja = esperarEscritura(page, '/tratamientos');
    await eliminarFila(page, fila(page, nombre));
    expect((await baja).status()).toBeLessThan(300);
    await expect(page.locator('tr', { hasText: nombre })).toHaveCount(0);
  });

  test('evento: editar y eliminar', async ({ page, api }) => {
    const { idTernero, idMadre } = await sembrarAnimales(api);
    const observacion = `TEST E2E Evento ${Date.now() % 99999}`;
    const creado = await api.crear('/eventos/crear-evento', {
      fecha_evento: '2026-10-01', observacion, id_ternero: [idTernero], id_madre: [idMadre],
    });
    const evento = Array.isArray(creado) ? creado[0] : (creado.data || creado);
    api.borrarAlFinal(`/eventos/delete-evento-by-id/${evento.id_evento}`);
    await abrirListado(page, 'Eventos');

    await fila(page, observacion).getByRole('button', { name: 'Editar' }).click();
    const m = modal(page, 'Editar Evento');
    await m.locator('textarea').fill(`${observacion} editado`);
    const guardado = esperarEscritura(page, '/eventos');
    await m.getByRole('button', { name: 'Guardar' }).click();
    expect((await guardado).status()).toBeLessThan(300);
    await expect(fila(page, `${observacion} editado`)).toBeVisible();

    const baja = esperarEscritura(page, '/eventos');
    await eliminarFila(page, fila(page, observacion));
    expect((await baja).status()).toBeLessThan(300);
    await expect(page.locator('tr', { hasText: observacion })).toHaveCount(0);
  });

  test('diarrea: editar y eliminar', async ({ page, api }) => {
    const { idTernero, rpTernero } = await sembrarAnimales(api);
    const diarrea = await api.crear('/diarrea-terneros/crear-diarrea-ternero', {
      fecha_diarrea_ternero: '2026-10-01', severidad: 'Moderada', id_ternero: idTernero, observaciones: 'TEST E2E diarrea',
    });
    api.borrarAlFinal(`/diarrea-terneros/delete-diarrea-by-id/${diarrea.id_diarrea_ternero}`);
    await abrirListado(page, 'Diarrea Terneros');

    await fila(page, rpTernero).getByRole('button', { name: 'Editar' }).click();
    const m = modal(page, 'Editar Registro de Diarrea');
    await expect(m.locator('select')).toHaveValue('Moderada');
    await m.locator('select').selectOption('Severa');
    await m.locator('textarea').fill('TEST E2E diarrea editada');
    const guardado = esperarEscritura(page, '/diarrea-terneros');
    await m.getByRole('button', { name: 'Guardar' }).click();
    expect((await guardado).status()).toBeLessThan(300);
    await expect(fila(page, rpTernero)).toContainText('TEST E2E diarrea editada');

    const baja = esperarEscritura(page, '/diarrea-terneros');
    await eliminarFila(page, fila(page, rpTernero));
    expect((await baja).status()).toBeLessThan(300);
    await expect(page.locator('tr', { hasText: String(rpTernero) })).toHaveCount(0);
  });

  test('madre: se puede eliminar desde el listado', async ({ page, api }) => {
    const sufijo = Date.now() % 99999;
    const madre = await api.crear('/madres/crear-madre', {
      nombre: 'TEST E2E Madre a borrar', rp_madre: 830000 + sufijo, estado: 'Seca', fecha_nacimiento: '2021-03-10',
    });
    api.borrarAlFinal(`/madres/delete-madre-by-id/${madre.id_madre}`);
    await abrirListado(page, 'Madres');
    const baja = esperarEscritura(page, '/madres');
    await eliminarFila(page, fila(page, 830000 + sufijo));
    expect((await baja).status()).toBeLessThan(300);
    await expect(page.locator('tr', { hasText: String(830000 + sufijo) })).toHaveCount(0);
  });

  test('resumen de salud carga sus indicadores', async ({ page }) => {
    await abrirListado(page, 'Resumen Salud');
    for (const titulo of ['Indicadores Clave', 'Tratamientos', 'Diarreas', 'Análisis Cruzado']) {
      await expect(page.getByRole('heading', { name: titulo }).first()).toBeVisible({ timeout: 90000 }); // puede esperar el reintento de un 429
    }
  });
});
