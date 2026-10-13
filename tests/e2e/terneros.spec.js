const { test, expect } = require('./fixtures');
const {
  elegirEstablecimiento, irAlDashboard, borrarPorApi, crearPorApi, abrirPestana, elegirEnBuscador,
} = require('./helpers');

test.describe('Terneros y tratamientos desde la UI', () => {
  const creados = { tratamiento: null, ternero: null, madre: null };
  let idEstablecimiento = null;

  test.afterEach(async ({ page }) => {
    if (creados.tratamiento) await borrarPorApi(page, `/tratamientos/delete-tratamiento-by-id/${creados.tratamiento}`, idEstablecimiento);
    if (creados.ternero) await borrarPorApi(page, `/terneros/delete-ternero-by-id/${creados.ternero}`, idEstablecimiento);
    if (creados.madre) await borrarPorApi(page, `/madres/delete-madre-by-id/${creados.madre}`, idEstablecimiento);
  });

  test('registrar un ternero con su madre y cargarle un tratamiento', async ({ page }) => {
    const sufijo = Date.now() % 99999;
    const rpMadre = 810000 + sufijo;
    const rpTernero = 820000 + sufijo;
    page.on('dialog', (dialog) => dialog.accept());

    await irAlDashboard(page);
    await elegirEstablecimiento(page);
    idEstablecimiento = Number(await page.evaluate(() => localStorage.getItem('establecimientoActual')));
    expect(idEstablecimiento).toBeGreaterThan(0);

    const madre = await crearPorApi(page, '/madres/crear-madre', {
      nombre: 'TEST E2E Madre de ternero',
      rp_madre: rpMadre,
      estado: 'Seca',
      fecha_nacimiento: '2021-03-10',
    }, idEstablecimiento);
    creados.madre = madre.id_madre;

    await test.step('alta de ternero por formulario', async () => {
      await page.getByRole('button', { name: 'Ingresos', exact: true }).click();
      await abrirPestana(page, 'Terneros');
      await expect(page.getByRole('heading', { name: 'Registro de Ternero' })).toBeVisible();

      await page.fill('input[name="rp_ternero"]', String(rpTernero));
      await page.fill('input[name="peso_nacer"]', '36');
      await page.fill('input[name="fecha_nacimiento"]', '2026-09-20');
      await page.fill('input[name="semen"]', 'TEST E2E');
      await elegirEnBuscador(page, rpMadre);
      await page.fill('textarea[name="observaciones"]', 'Creado por test e2e');

      const alta = page.waitForResponse((r) => r.url().includes('/terneros') && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Registrar Ternero' }).click();
      const respuesta = await alta;
      expect([200, 201]).toContain(respuesta.status());
      creados.ternero = (await respuesta.json()).id_ternero;
      expect(creados.ternero).toBeTruthy();
    });

    await test.step('el ternero aparece en el listado', async () => {
      await page.getByRole('button', { name: 'Listados', exact: true }).click();
      await abrirPestana(page, 'Terneros');
      await expect(page.getByText(String(rpTernero)).filter({ visible: true }).first()).toBeVisible();
    });

    await test.step('alta de tratamiento para ese ternero', async () => {
      await page.getByRole('button', { name: 'Ingresos', exact: true }).click();
      await abrirPestana(page, 'Tratamiento');
      await expect(page.getByRole('heading', { name: 'Formulario Tratamiento' })).toBeVisible();

      await page.fill('input[name="nombre"]', 'TEST E2E Tratamiento');
      await page.fill('textarea[name="descripcion"]', 'Creado por test e2e');
      await page.locator('select[name="tipo_enfermedad"]').selectOption({ index: 1 });
      await page.locator('select[name="turno"]').selectOption({ index: 1 });
      await page.fill('input[name="fecha_tratamiento"]', '2026-10-01');
      await elegirEnBuscador(page, rpTernero);

      const alta = page.waitForResponse((r) => r.url().includes('/tratamientos') && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Guardar' }).click();
      const respuesta = await alta;
      expect([200, 201]).toContain(respuesta.status());
      const tratamiento = await respuesta.json();
      creados.tratamiento = tratamiento.id_tratamiento;
      expect(creados.tratamiento).toBeTruthy();
      expect(tratamiento.id_ternero ?? tratamiento.ternero?.id_ternero).toBe(creados.ternero);
    });
  });
});
