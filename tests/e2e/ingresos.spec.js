const {
  test, expect, sembrarAnimales, esperarEscritura, abrirIngreso, abrirListado, fila,
} = require('./fixtures');

// Elige una opción en un buscador react-select concreto.
const elegirOpcion = async (page, buscador, texto) => {
  await buscador.fill(String(texto));
  await page.getByRole('option').filter({ hasText: String(texto) }).first().waitFor();
  await buscador.press('Enter');
};

test.describe('Ingresos: evento y diarrea desde la UI', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/dashboard');
  });

  test('registrar un evento con ternero y madre y verlo en el listado', async ({ page, api }) => {
    const { rpTernero, rpMadre } = await sembrarAnimales(api);
    const observacion = `TEST E2E Evento UI ${Date.now() % 99999}`;
    await abrirIngreso(page, 'Evento');
    await expect(page.getByRole('heading', { name: 'Registro de Múltiples Eventos' })).toBeVisible();

    await page.fill('input[name="fecha_evento"]', '2026-10-02');
    await page.fill('textarea[name="observacion"]', observacion);
    const buscadores = page.locator('input[role="combobox"]');
    await elegirOpcion(page, buscadores.nth(0), rpTernero);
    await elegirOpcion(page, buscadores.nth(1), rpMadre);
    await page.getByRole('button', { name: 'Agregar a la Lista' }).click();
    await expect(page.getByRole('heading', { name: 'Eventos Preparados (1)' })).toBeVisible();

    const alta = esperarEscritura(page, '/eventos');
    await page.getByRole('button', { name: /Registrar 1 Evento/ }).click();
    const respuesta = await alta;
    expect(respuesta.status()).toBeLessThan(300);
    const cuerpo = await respuesta.json();
    for (const evento of [].concat(cuerpo.data || cuerpo)) {
      if (evento?.id_evento) api.borrarAlFinal(`/eventos/delete-evento-by-id/${evento.id_evento}`);
    }

    await abrirListado(page, 'Eventos');
    await expect(fila(page, observacion)).toBeVisible();
  });

  test('registrar un episodio de diarrea y verlo en el listado', async ({ page, api }) => {
    const { rpTernero } = await sembrarAnimales(api);
    await abrirIngreso(page, 'Diarrea Ternero');
    await expect(page.getByRole('heading', { name: 'Registro de Diarrea en Ternero' })).toBeVisible();

    await elegirOpcion(page, page.locator('input[role="combobox"]').first(), rpTernero);
    await page.locator('form input[type="date"]').fill('2026-10-03');
    await page.locator('form select').selectOption({ index: 1 });
    await page.locator('form textarea').fill('TEST E2E diarrea UI');

    const alta = esperarEscritura(page, '/diarrea-terneros');
    await page.getByRole('button', { name: 'Registrar Episodio' }).click();
    const respuesta = await alta;
    expect(respuesta.status()).toBeLessThan(300);
    const creado = await respuesta.json();
    api.borrarAlFinal(`/diarrea-terneros/delete-diarrea-by-id/${creado.id_diarrea_ternero}`);

    await abrirListado(page, 'Diarrea Terneros');
    await expect(fila(page, rpTernero)).toContainText('TEST E2E diarrea UI');
  });
});
