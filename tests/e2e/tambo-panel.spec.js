const { test, expect } = require('./fixtures');

const haceDias = (n) => new Date(Date.now() - 3 * 3600e3 - n * 86400e3).toISOString().slice(0, 10);

test.describe('Panel del tambo en el dashboard', () => {
  test('muestra categorías, días en leche, litros del mes y gráfico de litros por vaca', async ({ page, api }) => {
    await page.goto('/admin/dashboard');
    const vaca = await api.crear('/madres/crear-madre', { nombre: 'TEST E2E Panel', rp_madre: 830000 + (Date.now() % 9999), estado: 'En Tambo' });
    api.borrarAlFinal(`/madres/delete-madre-by-id/${vaca.id_madre}`);
    await api.crear('/tambo/eventos', { id_madre: vaca.id_madre, tipo: 'parto', fecha: haceDias(40) });
    for (const [dias, litros] of [[2, 1500], [1, 1600]]) {
      const r = await api.crear('/litros/registrar', { fecha: haceDias(dias), litros_vendido: litros, litros_terneros: 0, cantidad_vacas: 80 });
      api.borrarAlFinal(`/litros/${r.id_registro}`);
    }
    await page.reload();

    const panel = page.locator('[data-panel="tambo"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/En Tambo: [1-9]/);
    await expect(panel).toContainText('Días en leche promedio');
    await expect(panel).toContainText('Litros últimos 30 días');
    await expect(panel).toContainText(/20\s*Litros por vaca/);
    await expect(panel.locator('[data-grafico="panel_por_vaca"] svg.recharts-surface')).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Rodeo lechero →' })).toHaveAttribute('href', '/tambo');
  });
});
