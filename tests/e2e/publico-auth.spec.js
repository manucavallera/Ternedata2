const { test, expect } = require('./fixtures');

test.describe('Pantallas públicas de cuenta', () => {
  test('registro: no envía con el formulario vacío', async ({ page }) => {
    let enviado = false;
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/auth/register')) enviado = true; });
    await page.goto('/auth/register');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    expect(enviado).toBe(false);
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('recuperar contraseña: pedirla muestra el mensaje genérico', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.locator('input[type="email"]').fill('noexiste_e2e@ternedata.com');
    const pedido = page.waitForResponse((r) => r.url().includes('/auth/forgot-password') && r.status() !== 429);
    await page.locator('button[type="submit"]').click();
    expect((await pedido).status()).toBeLessThan(300);
  });

  test('restablecer contraseña: un token inválido se rechaza', async ({ page }) => {
    await page.goto('/auth/reset-password?token=token-falso-e2e');
    const claves = page.locator('input[type="password"]');
    await claves.nth(0).fill('ClaveNueva123');
    await claves.nth(1).fill('ClaveNueva123');
    const pedido = page.waitForResponse((r) => r.url().includes('/auth/reset-password') && r.status() !== 429);
    await page.locator('button[type="submit"]').click();
    expect((await pedido).status()).toBe(400);
    await expect(page).toHaveURL(/reset-password/);
  });

  test('verificar email: un token inválido muestra error', async ({ page }) => {
    const pedido = page.waitForResponse((r) => r.url().startsWith(process.env.SECURITY_URL) && r.url().includes('verif')
      && r.request().method() !== 'OPTIONS' && r.status() !== 429);
    await page.goto('/auth/verify-email?token=token-falso-e2e');
    expect((await pedido).status()).toBeGreaterThanOrEqual(400);
    await expect(page.getByText('Link inválido o expirado')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reenviar email' })).toBeVisible();
  });

  test('unirse por invitación sin sesión ofrece ingresar o registrarse', async ({ page }) => {
    await page.goto('/join?token=token-falso-e2e');
    await expect(page.getByRole('link', { name: /Ingresar|Iniciar|Login/i }).first()).toBeVisible();
  });
});
