const { test, expect, esperarEscritura } = require('./fixtures');

const haceDias = (n) => new Date(Date.now() - 3 * 3600e3 - n * 86400e3).toISOString().slice(0, 10);

test.describe('Producción diaria del tambo', () => {
  test('avisa cargas raras, guarda igual y muestra gráficos y tablas', async ({ page, api }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/litros');
    const vaca = await api.crear('/madres/crear-madre', { nombre: 'TEST E2E Produccion', rp_madre: 840000 + (Date.now() % 9999), estado: 'En Tambo' });
    api.borrarAlFinal(`/madres/delete-madre-by-id/${vaca.id_madre}`);
    for (let i = 1; i <= 6; i++) {
      const r = await api.crear('/litros/registrar', { fecha: haceDias(i), litros_vendido: 2000, litros_terneros: 0, cantidad_vacas: 100 });
      api.borrarAlFinal(`/litros/${r.id_registro}`);
    }
    await page.reload();
    await expect(page.getByRole('heading', { name: /Litros de leche/ })).toBeVisible();

    await test.step('carga con 5000 vacas: avisa y guarda con un segundo click', async () => {
      const campo = (texto) => page.locator('form .grid > div').filter({ has: page.getByText(texto, { exact: true }) }).locator('input');
      await campo('Litros a fábrica').fill('1925');
      await campo('Litros terneros').fill('0');
      await campo('Vacas en ordeñe (opcional)').fill('5000');
      await campo('Vacas en tratamiento (opcional)').fill('4');
      await page.getByRole('button', { name: 'Registrar' }).click();
      const aviso = page.locator('form').getByRole('alert');
      await expect(aviso).toContainText('5000 vacas en ordeñe');
      await expect(aviso).toContainText('L por vaca está lejos de lo habitual');

      const alta = esperarEscritura(page, '/litros/registrar');
      await page.getByRole('button', { name: 'Guardar igual' }).click();
      const res = await alta;
      expect(res.status()).toBe(201);
      api.borrarAlFinal(`/litros/${(await res.json()).id_registro}`);
      await expect(page.locator('form').getByRole('alert')).toHaveCount(0);
      await expect(page.locator('tr').filter({ hasText: '(4 trat.)' }).first()).toContainText('5000');
    });

    await test.step('gráficos, tabla por mes y acumulado por año', async () => {
      for (const clave of ['por_vaca', 'total', 'vacas', 'litros']) {
        await expect(page.locator(`[data-grafico="${clave}"] svg.recharts-surface`)).toBeVisible();
      }
      await page.getByRole('button', { name: 'Por mes' }).click();
      await expect(page.locator('[data-tabla="meses"] tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'Acumulado por año' }).click();
      await expect(page.getByText(/acum\./).first()).toBeVisible();
    });
  });
});
