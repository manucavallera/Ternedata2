const { test, expect, esperarEscritura } = require('./fixtures');

const haceDias = (n) => new Date(Date.now() - 3 * 3600e3 - n * 86400e3).toISOString().slice(0, 10);

test.describe('Rodeo lechero desde la UI', () => {
  test('pendientes, carga de eventos para varias vacas e historial', async ({ page, api }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/tambo');
    await expect(page.getByRole('heading', { name: /Rodeo lechero/ })).toBeVisible();

    const sufijo = Date.now() % 9999;
    const rp = { a: 870000 + sufijo, b: 880000 + sufijo, c: 890000 + sufijo };
    const id = {};
    for (const [clave, numero] of Object.entries(rp)) {
      const vaca = await api.crear('/madres/crear-madre', { nombre: `TEST E2E Tambo ${clave}`, rp_madre: numero, estado: 'En Tambo' });
      id[clave] = vaca.id_madre;
      api.borrarAlFinal(`/madres/delete-madre-by-id/${vaca.id_madre}`);
    }
    await api.crear('/tambo/eventos', { id_madre: id.a, tipo: 'parto', fecha: haceDias(90) });
    await api.crear('/tambo/eventos', { id_madre: id.a, tipo: 'inseminacion', fecha: haceDias(40) });
    await api.crear('/tambo/eventos', { id_madre: id.b, tipo: 'parto', fecha: haceDias(70) });
    await api.crear('/tambo/eventos', { id_madre: id.c, tipo: 'parto', fecha: haceDias(60) });
    await page.reload();

    const tarjeta = (texto) => page.getByRole('button', { name: new RegExp(`^\\d+\\s*${texto}$`) });
    const fila = (numero) => page.locator('li').filter({ hasText: String(numero) }).first();

    await test.step('la tarjeta "A tactar" filtra el listado', async () => {
      await tarjeta('A tactar').click();
      await expect(page.getByText('Mostrando:')).toContainText('A tactar');
      await expect(fila(rp.a)).toContainText('inseminada hace 40 días');
      await expect(page.locator('li').filter({ hasText: String(rp.b) })).toHaveCount(0);
      await page.getByRole('button', { name: 'Ver todas' }).click();
    });

    await test.step('tacto positivo desde el formulario', async () => {
      await page.getByRole('button', { name: '+ Cargar evento' }).click();
      await page.getByPlaceholder('Ej: 325, 328, 331').fill(String(rp.a));
      await page.locator('form select').first().selectOption('tacto');
      const alta = esperarEscritura(page, '/tambo/eventos');
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      expect((await alta).status()).toBe(201);
      await page.getByPlaceholder('Buscar por caravana o nombre').fill(String(rp.a));
      await expect(fila(rp.a)).toContainText('Preñada');
      await expect(fila(rp.a)).toContainText('Parto probable');
    });

    await test.step('parche para dos vacas a la vez', async () => {
      await page.getByRole('button', { name: '+ Cargar evento' }).click();
      await page.getByPlaceholder('Ej: 325, 328, 331').fill(`${rp.b}, ${rp.c}, 1`);
      await page.locator('form select').first().selectOption('parche');
      await page.getByRole('button', { name: /Guardar para 2 vacas/ }).click();
      await expect(page.getByText('No están en el rodeo: 1')).toBeVisible();
      await page.getByPlaceholder('Ej: 325, 328, 331').fill(`${rp.b}, ${rp.c}`);
      await page.getByRole('button', { name: /Guardar para 2 vacas/ }).click();
      await expect(page.getByRole('heading', { name: 'Cargar evento' })).toHaveCount(0);

      const eventos = await (await api.pedir('GET', '/tambo/eventos')).json();
      expect(eventos.filter((e) => e.id_madre === id.c).map((e) => e.tipo)).toEqual(['parche', 'parto']);
      expect(eventos.filter((e) => e.id_madre === id.b).map((e) => e.tipo)).toEqual(['parche', 'parto']);
    });

    await test.step('historial y borrado del tacto', async () => {
      await page.getByPlaceholder('Buscar por caravana o nombre').fill(String(rp.a));
      await fila(rp.a).getByRole('button', { name: 'Historial' }).click();
      const historial = fila(rp.a).locator('ul');
      await expect(historial).toContainText('Tacto / ecografía · preñada');
      await expect(historial).toContainText('Inseminación');
      const baja = esperarEscritura(page, '/tambo/eventos/');
      await historial.locator('li').filter({ hasText: 'Tacto' }).getByRole('button', { name: 'Borrar' }).click();
      expect((await baja).status()).toBe(200);
      await expect(fila(rp.a)).toContainText('Inseminada');
    });
  });
});
