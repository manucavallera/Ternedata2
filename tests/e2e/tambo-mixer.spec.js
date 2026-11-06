const { test, expect, esperarEscritura } = require('./fixtures');

test.describe('Mixers del tambo', () => {
  test('crear un mixer, ver la tabla de carga, reordenar y borrar', async ({ page, api }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/tambo/mixer');
    const campo = Number(await page.evaluate(() => localStorage.getItem('establecimientoActual')));
    const nombreRodeo = `TEST E2E Mixer ${Date.now() % 99999}`;
    const rodeo = await api.crear('/rodeos', { nombre: nombreRodeo, tipo: 'otro', id_establecimiento: campo });
    api.borrarAlFinal(`/rodeos/${rodeo.id_rodeo}`);
    const vaca = await api.crear('/madres/crear-madre', { nombre: 'TEST E2E Mixer', rp_madre: 820000 + (Date.now() % 9999), estado: 'En Tambo', id_rodeo: rodeo.id_rodeo });
    api.borrarAlFinal(`/madres/delete-madre-by-id/${vaca.id_madre}`);
    await page.reload();
    await expect(page.getByRole('heading', { name: /Mixers/ })).toBeVisible();

    await page.getByRole('button', { name: '+ Nuevo mixer' }).click();
    await page.getByPlaceholder('Ej: Ración vacas en ordeñe').fill('TEST E2E ración');
    await page.locator('form select').nth(0).selectOption({ label: nombreRodeo });
    await page.locator('form input[type="number"]').fill('2');
    await page.getByLabel('Ingrediente 1', { exact: true }).fill('Silo');
    await page.getByLabel('Kg ingrediente 1').fill('40');
    await page.getByLabel('Ícono ingrediente 1').selectOption('🌽');
    await page.getByRole('button', { name: '+ Agregar ingrediente' }).click();
    await page.getByLabel('Ingrediente 2', { exact: true }).fill('Expeller');
    await page.getByLabel('Kg ingrediente 2').fill('10,5');
    const alta = esperarEscritura(page, '/dietas/crear');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    const res = await alta;
    expect(res.status()).toBe(201);
    api.borrarAlFinal(`/dietas/${(await res.json()).id_dieta}`);

    const tarjeta = page.locator('[data-mixer="TEST E2E ración"]');
    await expect(tarjeta).toContainText('1 cabezas · 2 cargas de 25,25 kg');
    const filas = tarjeta.locator('tbody tr');
    await expect(filas.nth(0)).toContainText('🌽');
    await expect(filas.nth(0).locator('td').nth(3)).toHaveText('20');
    await expect(filas.nth(1).locator('td').nth(4)).toHaveText('25,25');

    await tarjeta.getByRole('button', { name: 'Editar' }).click();
    await page.getByRole('button', { name: 'Subir' }).nth(1).click();
    const edicion = esperarEscritura(page, '/dietas/');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    expect((await edicion).status()).toBe(200);
    await expect(filas.nth(0)).toContainText('Expeller');
    await expect(filas.nth(1).locator('td').nth(4)).toHaveText('25,25');
    await expect(filas.nth(0).locator('td').nth(4)).toHaveText('5,25');

    const baja = esperarEscritura(page, '/dietas/');
    await tarjeta.getByRole('button', { name: 'Borrar' }).click();
    expect((await baja).status()).toBe(200);
    await expect(tarjeta).toHaveCount(0);
  });
});
