const { test, expect } = require('@playwright/test');
const { STORAGE } = require('../playwright.config');
const { elegirEstablecimiento } = require('./helpers');

// El usuario de prueba necesita al menos un establecimiento para operar.
const asegurarEstablecimiento = async (request) => {
  const login = await request.post(`${process.env.SECURITY_URL}/auth/login`, {
    data: { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD },
  });
  expect([200, 201]).toContain(login.status());
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const existentes = await request.get(`${process.env.BUSSINES_URL}/establecimientos`, { headers });
  if ((await existentes.json()).length > 0) return;
  const alta = await request.post(`${process.env.BUSSINES_URL}/establecimientos`, {
    headers,
    data: { nombre: 'TEST E2E Establecimiento', ubicacion: 'TEST E2E', responsable: 'TEST E2E' },
  });
  expect([200, 201]).toContain(alta.status());
};

test('login por UI y guardar sesión', async ({ page, request }) => {
  await asegurarEstablecimiento(request);
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', process.env.TEST_EMAIL);
  await page.fill('input[name="password"]', process.env.TEST_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();

  await page.waitForURL('**/admin/dashboard');
  await expect(page.getByRole('button', { name: 'Ingresos', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeTruthy();

  // Se deja un establecimiento elegido: la web lo recuerda en localStorage.
  await elegirEstablecimiento(page);
  expect(Number(await page.evaluate(() => localStorage.getItem('establecimientoActual')))).toBeGreaterThan(0);

  await page.context().storageState({ path: STORAGE });
});
