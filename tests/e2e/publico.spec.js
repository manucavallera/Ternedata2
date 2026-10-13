const { test, expect } = require('./fixtures');

test.describe('Sin sesión', () => {
  test('la pantalla de login muestra el formulario y los enlaces', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Registrarse' }).first()).toBeVisible();
  });

  test('contraseña incorrecta no inicia sesión', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', process.env.TEST_EMAIL);
    await page.fill('input[name="password"]', 'clave_incorrecta_123');
    const respuesta = page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Login' }).click();
    expect((await respuesta).status()).toBe(401);

    await expect(page).toHaveURL(/\/auth\/login/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('el dashboard sin sesión no muestra datos y manda al login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
  });

  for (const ruta of ['/auth/register', '/auth/forgot-password']) {
    test(`${ruta} carga`, async ({ page }) => {
      const respuesta = await page.goto(ruta);
      expect(respuesta.status()).toBe(200);
      await expect(page.locator('input').first()).toBeVisible();
    });
  }
});
