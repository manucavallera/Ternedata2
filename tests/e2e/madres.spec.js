const { test, expect } = require('./fixtures');
const { elegirEstablecimiento, irAlDashboard, borrarPorApi } = require('./helpers');

test.describe('Madres desde la UI', () => {
  let idMadre = null;
  let idEstablecimiento = null;

  test.afterEach(async ({ page }) => {
    if (idMadre) await borrarPorApi(page, `/madres/delete-madre-by-id/${idMadre}`, idEstablecimiento);
    idMadre = null;
  });

  test('crear una madre y encontrarla en el listado', async ({ page }) => {
    const rp = 800000 + (Date.now() % 99999);
    page.on('dialog', (dialog) => dialog.accept());

    await irAlDashboard(page);
    await elegirEstablecimiento(page);
    await page.getByRole('button', { name: 'Ingresos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Registro de Madre' })).toBeVisible();

    await page.fill('input[name="rp_madre"]', String(rp));
    await page.fill('input[name="nombre"]', 'TEST E2E Madre');
    await page.fill('input[name="fecha_nacimiento"]', '2021-03-10');

    const alta = page.waitForResponse((r) => r.url().includes('/madres') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Guardar Madre' }).click();
    const respuesta = await alta;
    expect([200, 201]).toContain(respuesta.status());
    const creado = await respuesta.json();
    idMadre = creado.id_madre;
    idEstablecimiento = creado.id_establecimiento;
    expect(idMadre).toBeTruthy();

    await page.getByRole('button', { name: 'Listados', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Listado de Madres' })).toBeVisible();
    await page.fill('input[placeholder="Buscar por nombre o RP..."]', String(rp));
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(String(rp)).filter({ visible: true }).first()).toBeVisible();
  });

  test('el formulario no envía sin RP', async ({ page }) => {
    let enviado = false;
    page.on('request', (r) => { if (r.url().includes('/madres') && r.method() === 'POST') enviado = true; });
    page.on('dialog', (dialog) => dialog.accept());

    await irAlDashboard(page);
    await elegirEstablecimiento(page);
    await page.getByRole('button', { name: 'Ingresos', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar Madre' }).click();
    await page.waitForTimeout(1500);

    expect(enviado).toBe(false);
  });
});
