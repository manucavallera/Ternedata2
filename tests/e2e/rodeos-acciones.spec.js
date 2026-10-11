const { test, expect, sembrarAnimales, esperarEscritura, modal } = require('./fixtures');

test.describe('Rodeos: acciones sobre un rodeo', () => {
  test('editar, asignar animales, ver, cargar dieta y cambiar estado', async ({ page, api }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/dashboard');
    const nombre = `TEST E2E Rodeo ${Date.now() % 99999}`;
    const idEstablecimiento = Number(await page.evaluate(() => localStorage.getItem('establecimientoActual')));
    const rodeo = await api.crear('/rodeos', {
      nombre, tipo: 'cria', id_establecimiento: idEstablecimiento, descripcion: 'TEST E2E',
    });
    api.borrarAlFinal(`/rodeos/${rodeo.id_rodeo}`);
    // Los animales se crean después del rodeo para que la limpieza los borre antes que a él.
    const { rpTernero } = await sembrarAnimales(api);
    // La madre con ternero pasa sola al rodeo de tambo: para asignar se usa una madre seca aparte.
    const rpMadre = 840000 + (Date.now() % 99999);
    const madreSeca = await api.crear('/madres/crear-madre', {
      nombre: 'TEST E2E Madre seca', rp_madre: rpMadre, estado: 'Seca', fecha_nacimiento: '2020-05-05',
    });
    api.borrarAlFinal(`/madres/delete-madre-by-id/${madreSeca.id_madre}`);

    await page.goto('/rodeos');
    const tarjeta = page.locator('div')
      .filter({ has: page.getByRole('heading', { name: nombre }) })
      .filter({ has: page.getByRole('button', { name: 'Ver rodeo' }) })
      .last();
    await expect(tarjeta).toBeVisible();

    await test.step('editar', async () => {
      await tarjeta.getByRole('button', { name: 'Editar' }).click();
      const m = modal(page, 'Editar Rodeo');
      await m.locator('textarea').fill('TEST E2E descripción editada');
      const guardado = esperarEscritura(page, '/rodeos');
      await m.locator('button[type="submit"]').click();
      expect((await guardado).status()).toBeLessThan(300);
    });

    await test.step('asignar ternero y madre', async () => {
      await tarjeta.getByRole('button', { name: 'Asignar' }).click();
      await page.getByRole('checkbox', { name: new RegExp(`RP ${rpTernero}`) }).check();
      let guardado = esperarEscritura(page, '/rodeos');
      await page.getByRole('button', { name: 'Asignar al rodeo' }).click();
      expect((await guardado).status()).toBeLessThan(300);

      await page.getByRole('button', { name: '🐄 Madres' }).click();
      await page.getByRole('checkbox', { name: new RegExp(String(rpMadre)) }).check();
      guardado = esperarEscritura(page, '/rodeos');
      await page.getByRole('button', { name: 'Asignar al rodeo' }).click();
      expect((await guardado).status()).toBeLessThan(300);
      await page.getByRole('button', { name: 'Cerrar' }).filter({ visible: true }).last().click();
    });

    await test.step('ver rodeo muestra los animales asignados', async () => {
      await tarjeta.getByRole('button', { name: 'Ver rodeo' }).click();
      await expect(page.getByRole('button', { name: '🐮 Terneros (1)' })).toBeVisible();
      await expect(page.getByRole('button', { name: '🐄 Madres (1)' })).toBeVisible();
      await expect(page.getByText('Total Terneros').filter({ visible: true }).first()).toBeVisible();
      await page.getByRole('button', { name: 'Cerrar' }).filter({ visible: true }).last().click();
    });

    await test.step('cargar una dieta', async () => {
      await tarjeta.getByRole('button', { name: 'Dieta' }).click();
      await page.getByPlaceholder('Nombre de la dieta (opcional)').fill('TEST E2E Dieta');
      await page.getByPlaceholder('Ej: 3kg de balanceado + heno a voluntad').fill('TEST E2E 3kg balanceado');
      const guardado = esperarEscritura(page, '/dietas');
      await page.getByRole('button', { name: 'Agregar dieta' }).click();
      expect((await guardado).status()).toBeLessThan(300);
      await expect(page.getByText('TEST E2E Dieta').filter({ visible: true }).first()).toBeVisible();
      await page.getByRole('button', { name: 'Cerrar' }).filter({ visible: true }).last().click();
    });

    await test.step('sacar los animales del rodeo', async () => {
      await tarjeta.getByRole('button', { name: 'Asignar' }).click();
      await page.getByRole('checkbox', { name: new RegExp(`RP ${rpTernero}`) }).check();
      let guardado = esperarEscritura(page, '/rodeos');
      await page.getByRole('button', { name: 'Sacar del rodeo' }).click();
      expect((await guardado).status()).toBeLessThan(300);

      await page.getByRole('button', { name: '🐄 Madres' }).click();
      await page.getByRole('checkbox', { name: new RegExp(String(rpMadre)) }).check();
      guardado = esperarEscritura(page, '/rodeos');
      await page.getByRole('button', { name: 'Sacar del rodeo' }).click();
      expect((await guardado).status()).toBeLessThan(300);
      await page.getByRole('button', { name: 'Cerrar' }).filter({ visible: true }).last().click();
    });

    await test.step('cambiar estado', async () => {
      const guardado = esperarEscritura(page, '/rodeos');
      await tarjeta.getByRole('button', { name: '❌' }).click();
      expect((await guardado).status()).toBeLessThan(300);
    });
  });
});
