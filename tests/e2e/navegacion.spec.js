const { test, expect } = require('./fixtures');
const { escucharErrores } = require('./helpers');

const PANTALLAS = [
  { ruta: '/admin/dashboard', titulo: 'Estado del rodeo' },
  { ruta: '/rodeos', titulo: 'Gestión de Rodeos' },
  { ruta: '/calendario', titulo: 'Calendario histórico' },
  { ruta: '/litros', titulo: 'Litros de leche' },
  { ruta: '/sustituto', titulo: 'Cálculo de sustituto lácteo' },
  { ruta: '/perfil', titulo: 'Mis datos' },
];

test.describe('Navegación con sesión', () => {
  for (const { ruta, titulo } of PANTALLAS) {
    test(`${ruta} carga sin errores`, async ({ page }) => {
      const errores = escucharErrores(page);
      const fallidas = [];
      page.on('response', (r) => { if (r.status() >= 500) fallidas.push(`${r.status()} ${r.url()}`); });

      await page.goto(ruta);
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
      await page.waitForLoadState('networkidle');

      expect(fallidas, 'respuestas 5xx').toEqual([]);
      expect(errores, 'errores de JS').toEqual([]);
    });

    test(`${ruta} muestra el navbar con sesión al cargar directo`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ingresos', exact: true })).toBeVisible();
    });
  }

  test('el perfil muestra el email del usuario', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page.locator('input[type="email"]')).toHaveValue(process.env.TEST_EMAIL);
  });

  test('Salir cierra la sesión', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // El disparador del menú de perfil no tiene nombre accesible.
    await page.locator('li.relative > button').click();
    await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
    await expect(page.getByRole('link', { name: 'Ingresar' }).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });
});
