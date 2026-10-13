const { test, expect, esperarEscritura } = require('./fixtures');

test.describe('Perfil y panel de administración', () => {
  test('perfil: editar el nombre y restaurarlo', async ({ page }) => {
    await page.goto('/perfil');
    const nombre = page.locator('input[type="text"]').first();
    await expect(nombre).toHaveValue(process.env.TEST_NAME);

    for (const valor of ['Usuario Test E2E', process.env.TEST_NAME]) {
      await nombre.fill(valor);
      const guardado = esperarEscritura(page, '/users');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      expect((await guardado).status()).toBeLessThan(300);
    }
    await page.reload();
    await expect(page.locator('input[type="text"]').first()).toHaveValue(process.env.TEST_NAME);
  });

  test('perfil: generar código de Telegram', async ({ page }) => {
    await page.goto('/perfil');
    const generado = esperarEscritura(page, '/generar-token-bot');
    await page.getByRole('button', { name: 'Generar código' }).click();
    const respuesta = await generado;
    expect(respuesta.status()).toBeLessThan(300);
    const { token } = await respuesta.json();
    await expect(page.getByText(token).first()).toBeVisible();
  });

  test('perfil: contraseñas distintas no se envían', async ({ page }) => {
    let enviado = false;
    page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/users')) enviado = true; });
    await page.goto('/perfil');
    await page.getByPlaceholder('Mínimo 6 caracteres').fill('ClaveNueva123');
    await page.getByPlaceholder('Repetí la contraseña').fill('OtraClave456');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByText(/no coinciden/i)).toBeVisible();
    expect(enviado).toBe(false);
  });

  test('panel de administración: abre y muestra sus pestañas', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const establecimiento = (await page.locator('select').first().locator('option').nth(1).innerText()).replace(/^\S+\s/, '');
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/panel-admin/);
    await expect(page.getByText('Total Usuarios')).toBeVisible();
    await page.getByRole('button', { name: /Establecimientos|Estabs\./ }).click();
    await expect(page.getByText(establecimiento).filter({ visible: true }).last()).toBeVisible();
  });

  test('dashboard: los indicadores cargan con números', async ({ page }) => {
    await page.goto('/admin/dashboard');
    for (const kpi of ['Total terneros', 'Terneros vivos', 'Mortalidad (30d)', 'Ganancia promedio', 'Calostrados', 'Con bajo crecimiento']) {
      await expect(page.getByText(kpi).first()).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Estado del rodeo' })).toBeVisible();
  });
});
