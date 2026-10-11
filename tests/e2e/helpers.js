const { expect } = require('@playwright/test');

const BUSSINES_URL = process.env.BUSSINES_URL;

// Elige el primer establecimiento real del selector del navbar.
// El backend limita pedidos por minuto (429) y la web deja el selector vacío: se espera y se recarga.
const elegirEstablecimiento = async (page) => {
  const selector = page.locator('select').first();
  for (let intento = 0; intento < 3; intento++) {
    await selector.waitFor();
    const cargado = await selector.locator('option').nth(1).waitFor({ state: 'attached', timeout: 10000 })
      .then(() => true, () => false);
    if (cargado) break;
    await page.waitForTimeout(61000);
    await page.reload();
  }
  // El primero que no sea forrajería (🌾): estos flujos son de ganadería.
  const opciones = await selector.locator('option').allInnerTexts();
  const indice = opciones.findIndex((texto, i) => i > 0 && !texto.includes('🌾'));
  await selector.selectOption({ index: indice });
  await page.waitForLoadState('networkidle');
};

const irAlDashboard = async (page) => {
  await page.goto('/admin/dashboard');
  await page.getByRole('button', { name: 'Ingresos', exact: true }).waitFor();
};

// Borra por API lo que el test creó desde la UI. El backend exige el establecimiento del registro.
const borrarPorApi = async (page, path, idEstablecimiento) => {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.delete(BUSSINES_URL + path, {
    headers: { Authorization: `Bearer ${token}` },
    params: { id_establecimiento: idEstablecimiento },
  });
  expect([200, 204], `limpieza de ${path}`).toContain(response.status());
};

// Crea por API un dato previo que el flujo de UI necesita (por ejemplo, la madre de un ternero).
const crearPorApi = async (page, path, data, idEstablecimiento) => {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.post(BUSSINES_URL + path, {
    headers: { Authorization: `Bearer ${token}` },
    params: { id_establecimiento: idEstablecimiento },
    data,
  });
  expect([200, 201], `alta previa en ${path}`).toContain(response.status());
  return response.json();
};

// Abre una pestaña del selector de formularios o listados (Madres, Terneros, Tratamiento...).
const abrirPestana = async (page, nombre) => {
  const pestanas = page.locator('ul > li', { hasText: nombre });
  await pestanas.first().waitFor();
  // La de texto más corto: "Terneros" no debe abrir "Diarrea Terneros".
  const textos = await pestanas.allInnerTexts();
  const indice = textos.reduce((mejor, texto, i) => (texto.length < textos[mejor].length ? i : mejor), 0);
  await pestanas.nth(indice).click();
};

// Elige una opción en un buscador react-select escribiendo y confirmando con Enter.
const elegirEnBuscador = async (page, texto) => {
  const buscador = page.locator('form input[role="combobox"]');
  await buscador.fill(String(texto));
  await page.getByRole('option').filter({ hasText: String(texto) }).first().waitFor();
  await buscador.press('Enter');
};

// Junta errores de JS de la página para poder afirmar que no hubo ninguno.
const escucharErrores = (page) => {
  const errores = [];
  page.on('pageerror', (error) => errores.push(error.message));
  return errores;
};

module.exports = {
  elegirEstablecimiento, irAlDashboard, borrarPorApi, crearPorApi, abrirPestana, elegirEnBuscador, escucharErrores,
};
