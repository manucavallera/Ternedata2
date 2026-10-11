const {
  test, expect, sembrarAnimales, esperarEscritura, abrirListado, fila,
} = require('./fixtures');

test.describe('Terneros: calostrado y seguimiento', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/dashboard');
  });

  test('registrar calostrado desde el listado', async ({ page, api }) => {
    const { rpTernero } = await sembrarAnimales(api);
    await abrirListado(page, 'Terneros');
    await fila(page, rpTernero).getByRole('button', { name: 'Calostrado' }).first().click();
    const m = page.locator('.fixed').filter({ hasText: 'Calostrado' }).last();
    await m.locator('select').first().selectOption('mamadera');
    await m.locator('input[type="number"]').first().fill('2.5');
    const guardado = esperarEscritura(page, '/terneros');
    await m.locator('button[type="submit"], button').filter({ hasText: /Guardar|Registrar|Actualizar/ }).last().click();
    expect((await guardado).status()).toBeLessThan(300);
  });

  test('seguimiento: cargar un pesaje y verlo en los registros del día', async ({ page, api }) => {
    const { rpTernero } = await sembrarAnimales(api);
    await abrirListado(page, 'Terneros');
    await fila(page, rpTernero).getByRole('button', { name: 'Seguimiento' }).click();
    await expect(page.getByRole('heading', { name: `RP ${rpTernero}` })).toBeVisible();
    const m = page.locator('.fixed').filter({ has: page.getByRole('heading', { name: `RP ${rpTernero}` }) }).last();
    await m.locator('input[type="date"]').first().fill('2026-09-20');
    await m.locator('input[type="number"]').first().fill('43.5');
    await m.getByRole('textbox', { name: 'Observaciones' }).fill('TEST E2E pesaje');
    const guardado = esperarEscritura(page, '/pesajes');
    await m.getByRole('button', { name: 'Guardar pesaje' }).click();
    expect((await guardado).status()).toBeLessThan(300);
    await expect(m.getByText('43.5').first()).toBeVisible();
  });
});
