const { Client } = require('pg');
const { test, expect } = require('./fixtures');

// Promover a super_admin solo se puede por base de datos: corre contra el entorno local.
const TEST_DB_URL = process.env.TEST_DB_URL;
const sufijo = Date.now() % 99999;
const superAdmin = { email: `e2e_super_ui_${sufijo}@ternedata.com`, password: 'ClaveSuperUi123' };
const objetivo = { email: `e2e_objetivo_ui_${sufijo}@ternedata.com`, password: 'ClaveObjetivo123' };

test.describe('Panel de administración — usuarios globales (super_admin)', () => {
  test.skip(!TEST_DB_URL, 'requiere TEST_DB_URL (entorno local)');
  // Sesión propia: la guardada es la del admin común.
  test.use({ storageState: { cookies: [], origins: [] } });
  let db;

  test.beforeAll(async ({ request }) => {
    db = new Client({ connectionString: TEST_DB_URL });
    await db.connect();
    for (const [i, cuenta] of [superAdmin, objetivo].entries()) {
      const registro = await request.post(`${process.env.SECURITY_URL}/auth/register`, {
        data: { name: i ? 'TEST objetivo UI' : 'TEST super UI', email: cuenta.email, password: cuenta.password, telefono: `14${sufijo}${i}` },
      });
      expect([200, 201]).toContain(registro.status());
    }
    await db.query('UPDATE users SET email_verificado = true WHERE email = ANY($1)', [[superAdmin.email, objetivo.email]]);
    await db.query("UPDATE users SET rol = 'super_admin' WHERE email = $1", [superAdmin.email]);
    await db.query("UPDATE users SET rol = 'operario' WHERE email = $1", [objetivo.email]);
    // Sin establecimiento la web lo manda a la pantalla de bienvenida en vez del panel.
    await db.query(
      `WITH est AS (SELECT id_establecimiento AS id FROM users WHERE email = $2),
            alta AS (INSERT INTO user_establecimientos ("userId", "establecimientoId", rol)
                     SELECT u.id, est.id, 'dueno' FROM users u, est WHERE u.email = $1)
       UPDATE users SET id_establecimiento = est.id FROM est WHERE email = $1`,
      [superAdmin.email, process.env.TEST_EMAIL],
    );
  });

  test.afterAll(async () => {
    await db.query('DELETE FROM user_establecimientos WHERE "userId" IN (SELECT id FROM users WHERE email = $1)', [superAdmin.email]);
    await db.query('DELETE FROM users WHERE email = ANY($1)', [[superAdmin.email, objetivo.email]]);
    await db.end();
  });

  test('ve a todos los usuarios, filtra, cambia un rol y desactiva', async ({ page }) => {
    const rolEnBase = async () => (await db.query('SELECT rol, estado FROM users WHERE email = $1', [objetivo.email])).rows[0];
    // "Cambiar rol" pide el rol con un prompt y después confirma.
    page.on('dialog', (dialog) => dialog.accept(dialog.type() === 'prompt' ? 'veterinario' : undefined));

    await test.step('entrar como super_admin', async () => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', superAdmin.email);
      await page.fill('input[name="password"]', superAdmin.password);
      await page.getByRole('button', { name: 'Login' }).click();
      await page.waitForURL((url) => !url.pathname.includes('/auth/login'));
      // Llega al panel por el menú, como cualquier admin.
      await page.goto('/admin/dashboard');
      await page.getByRole('link', { name: 'Admin' }).first().click();
      await page.waitForURL('**/panel-admin');
      await expect(page.getByRole('heading', { name: 'Panel de Administración' })).toBeVisible();
    });

    const fila = page.locator('tr', { hasText: objetivo.email });

    await test.step('la pestaña global lista usuarios de toda la plataforma', async () => {
      await page.getByRole('button', { name: '🌐 Usuarios globales' }).click();
      await expect(page.getByRole('heading', { name: 'Usuarios globales' })).toBeVisible();
      await expect(fila).toContainText('operario');
      await expect(page.locator('tr', { hasText: process.env.TEST_EMAIL })).toContainText('admin');
    });

    await test.step('filtra por rol', async () => {
      const filtroRol = page.locator('select', { has: page.locator('option', { hasText: 'Todos los roles' }) });
      await filtroRol.selectOption('admin');
      await expect(fila).toHaveCount(0);
      await expect(page.locator('tr', { hasText: process.env.TEST_EMAIL })).toBeVisible();
      await filtroRol.selectOption('todos');
      await expect(fila).toBeVisible();
    });

    await test.step('cambia el rol', async () => {
      const guardado = page.waitForResponse((r) => r.url().includes('/change-role') && r.request().method() === 'PUT');
      await fila.getByRole('button', { name: 'Cambiar rol' }).click();
      expect((await guardado).status()).toBe(200);
      await expect(fila).toContainText('veterinario');
      expect((await rolEnBase()).rol).toBe('veterinario');
    });

    await test.step('desactiva y vuelve a activar', async () => {
      let guardado = page.waitForResponse((r) => r.url().includes('/toggle-status') && r.request().method() === 'PUT');
      await fila.getByRole('button', { name: 'Desactivar' }).click();
      expect((await guardado).status()).toBe(200);
      await expect(fila.getByRole('button', { name: 'Activar', exact: true })).toBeVisible();
      expect((await rolEnBase()).estado).toBe('inactivo');

      guardado = page.waitForResponse((r) => r.url().includes('/toggle-status') && r.request().method() === 'PUT');
      await fila.getByRole('button', { name: 'Activar', exact: true }).click();
      expect((await guardado).status()).toBe(200);
      await expect(fila.getByRole('button', { name: 'Desactivar' })).toBeVisible();
      expect((await rolEnBase()).estado).toBe('activo');
    });
  });
});
