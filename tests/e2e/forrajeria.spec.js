const { test, expect, esperarEscritura } = require('./fixtures');

test.describe('Forrajería desde la UI', () => {
  test('elegir una forrajería lleva a su inicio, se carga un producto y un movimiento de stock', async ({ page, api }) => {
    // Forrajería no tiene bajas: contra producción dejaría productos y establecimientos de prueba.
    test.skip(!/localhost/.test(process.env.WEB_URL), 'solo en entorno local');
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/dashboard');
    const nombre = `TEST E2E Forrajeria ${Date.now() % 99999}`;
    const producto = `TEST E2E Balanceado ${Date.now() % 99999}`;
    const forrajeria = await api.crear('/establecimientos', {
      nombre, ubicacion: 'TEST E2E', responsable: 'TEST E2E', tipo_organizacion: 'forrajeria',
    });
    api.borrarAlFinal(`/establecimientos/${forrajeria.id_establecimiento}`);
    const selector = page.locator('select').first();
    const ganaderia = await selector.inputValue();

    await test.step('cambiar a la forrajería redirige a /forrajeria', async () => {
      // El acceso a un establecimiento nuevo viaja en el token: se renueva como hace la app al crearlo.
      await page.evaluate(async (securityUrl) => {
        const respuesta = await fetch(`${securityUrl}/auth/refresh`, {
          method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        localStorage.setItem('token', (await respuesta.json()).token);
      }, process.env.SECURITY_URL);
      await page.reload();
      await expect(selector.locator('option', { hasText: nombre })).toBeAttached();
      await selector.selectOption(String(forrajeria.id_establecimiento));
      await expect(page).toHaveURL(/\/forrajeria$/);
      await expect(page.getByRole('heading', { name: 'Forrajería' })).toBeVisible();
      await expect(page.getByText('Todavía no h')).toBeVisible();
    });

    await test.step('alta de producto', async () => {
      await page.getByRole('link', { name: /producto/i }).first().click();
      await expect(page).toHaveURL(/\/forrajeria\/productos/);
      await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
      await page.getByPlaceholder('Nombre del producto').fill(producto);
      await page.getByPlaceholder('Precio').fill('1000');
      await page.getByPlaceholder('Costo').fill('700');
      const alta = esperarEscritura(page, '/forrajeria/productos');
      await page.locator('form button[type="submit"], form button:not([type])').first().click();
      expect((await alta).status()).toBeLessThan(300);
      await expect(page.getByText(producto).first()).toBeVisible();
    });

    await test.step('movimiento de stock', async () => {
      const filaProducto = page.locator('tr, li, article, div.rounded-xl').filter({ hasText: producto }).last();
      await filaProducto.locator('input[type="number"]').first().fill('12');
      const movimiento = esperarEscritura(page, '/movimientos');
      await filaProducto.getByRole('button').first().click();
      expect((await movimiento).status()).toBeLessThan(300);
      await expect(filaProducto).toContainText('12');
    });

    await test.step('el inicio de forrajería muestra el producto', async () => {
      await page.goto('/forrajeria');
      await expect(page.getByText(producto).first()).toBeVisible();
    });

    await test.step('volver a ganadería redirige al dashboard', async () => {
      await selector.selectOption(ganaderia);
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });
  });
});
