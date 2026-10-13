const { test, expect } = require('./fixtures');
const { borrarPorApi, elegirEstablecimiento, irAlDashboard } = require('./helpers');

test.describe('Rodeos desde la UI', () => {
  let idRodeo = null;
  let idEstablecimiento = null;

  test.afterEach(async ({ page }) => {
    if (idRodeo) await borrarPorApi(page, `/rodeos/${idRodeo}`, idEstablecimiento);
    idRodeo = null;
  });

  test('crear un rodeo y verlo en la lista', async ({ page }) => {
    const nombre = `TEST E2E Rodeo ${Date.now()}`;
    page.on('dialog', (dialog) => dialog.accept());

    // Se elige en el dashboard: el selector puede redirigir al inicio del establecimiento.
    await irAlDashboard(page);
    await elegirEstablecimiento(page);
    await page.getByRole('button', { name: 'Rodeos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gestión de Rodeos' })).toBeVisible();
    await page.getByRole('button', { name: '➕ Crear Rodeo', exact: true }).click();
    await page.fill('input[placeholder="Ej: Rodeo Destete 2024"]', nombre);
    // El rodeo va al establecimiento activo (puede haber otros, incluso forrajerías).
    const activo = (await page.locator('select').first().locator('option:checked').innerText()).replace(/^\S+\s/, '');
    const destino = page.locator('select[required]');
    await destino.selectOption({ label: await destino.locator('option', { hasText: activo }).first().innerText() });
    await page.fill('textarea', 'Creado por test e2e');

    const alta = page.waitForResponse((r) => r.url().includes('/rodeos') && r.request().method() === 'POST');
    await page.getByRole('button', { name: '➕ Crear', exact: true }).click();
    const respuesta = await alta;
    expect([200, 201]).toContain(respuesta.status());
    const creado = await respuesta.json();
    idRodeo = creado.id_rodeo;
    idEstablecimiento = creado.id_establecimiento;
    expect(idRodeo).toBeTruthy();

    await expect(page.getByText(nombre).first()).toBeVisible();
  });
});
