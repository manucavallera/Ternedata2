const { test, expect, esperarEscritura } = require('./fixtures');

test.describe('Litros, sustituto y calendario', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('litros: registrar un día, verlo en el historial y eliminarlo', async ({ page }) => {
    const nota = `TEST E2E litros ${Date.now() % 99999}`;
    await page.goto('/litros');
    await expect(page.getByRole('heading', { name: 'Anotar litros' })).toBeVisible();
    await page.locator('input[type="date"]').first().fill('2026-01-05');
    await page.getByPlaceholder('Ej: 1835').fill('1500');
    await page.getByPlaceholder('Ej: 58').fill('50');
    await page.locator('input[type="text"]').last().fill(nota);

    const alta = esperarEscritura(page, '/litros');
    await page.getByRole('button', { name: 'Registrar' }).click();
    expect((await alta).status()).toBeLessThan(300);

    const registro = page.locator('tr, li, div.border').filter({ hasText: nota }).filter({ visible: true }).last();
    await expect(registro).toBeVisible();
    const baja = esperarEscritura(page, '/litros');
    await registro.getByRole('button', { name: 'Eliminar' }).click();
    expect((await baja).status()).toBeLessThan(300);
    await expect(page.getByText(nota)).toHaveCount(0);
  });

  test('sustituto: calcular, guardar, verlo en el historial y eliminarlo', async ({ page }) => {
    await page.goto('/sustituto');
    await expect(page.getByRole('heading', { name: 'Cálculo de sustituto lácteo' })).toBeVisible();
    const numeros = page.locator('input[type="number"]');
    for (const [i, valor] of [[0, '20'], [1, '6'], [2, '3'], [3, '3'], [4, '0.125'], [5, '3.2'], [6, '1380'], [7, '500']]) {
      await numeros.nth(i).fill(valor);
    }
    await page.locator('input[type="text"]').last().fill('TEST E2E sustituto');
    // 20 terneros x 6 L = 120 L; a 0,125 kg/L son 15 kg de sustituto.
    await expect(page.getByText('120 L').first()).toBeVisible();
    const filas = page.locator('tbody tr').filter({ hasText: '120 L' });
    const antes = await filas.count();

    const alta = esperarEscritura(page, '/sustituto');
    await page.getByRole('button', { name: 'Guardar cálculo' }).click();
    expect((await alta).status()).toBeLessThan(300);

    await expect(filas).toHaveCount(antes + 1);
    await expect(filas.first()).toContainText('15');
    const baja = esperarEscritura(page, '/sustituto');
    await filas.first().getByRole('button', { name: 'Eliminar' }).click();
    expect((await baja).status()).toBeLessThan(300);
    await expect(filas).toHaveCount(antes);
  });

  test('calendario: cambiar de mes y abrir un día muestra el estado de esa fecha', async ({ page }) => {
    await page.goto('/calendario');
    await expect(page.getByRole('heading', { name: 'Calendario histórico' })).toBeVisible();
    const mes = page.getByRole('button', { name: 'Mes anterior' }).locator('xpath=following-sibling::span[1]');
    const antes = await mes.innerText();
    await page.getByRole('button', { name: 'Mes anterior' }).click();
    await expect(mes).not.toHaveText(antes);

    await page.getByRole('button', { name: '15', exact: true }).click();
    for (const seccion of ['Vacas', 'Terneros', 'Rodeos', 'Tratamientos', 'Eventos']) {
      await expect(page.getByRole('button', { name: new RegExp(`${seccion}.*\\(\\d+\\)`) }).first()).toBeVisible();
    }
  });
});
