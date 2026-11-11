// Capturas de la app mobile (PWA exportada) con los mismos datos de ejemplo que la web.
const { test, expect } = require('@playwright/test');
const { Client } = require('pg');
const { foto } = require('../helpers');
const { sembrarTambo, sembrarForrajeria } = require('../datos');

const BUSINESS_URL = process.env.BUSSINES_URL || 'http://localhost:3010';
const SECURITY_URL = process.env.SECURITY_URL || 'http://localhost:3011';
const DB_URL = process.env.TEST_DB_URL || 'postgres://postgres:postgres@localhost:5434/ganaderia_test';
const PASSWORD = 'Demo1234app';

// La pila de pantallas deja montadas (ocultas) las anteriores: se busca solo lo visible.
const ver = (locator) => locator.filter({ visible: true }).first();

// Cuenta nueva, verificada por SQL, con un establecimiento. Devuelve funciones para cargarle datos.
const cuentaDemo = async (request, nombre, establecimiento) => {
  const email = `demo_${Date.now()}@ternedata.test`;
  const registro = await request.post(`${SECURITY_URL}/auth/register`, { data: { name: nombre, email, password: PASSWORD } });
  expect([200, 201]).toContain(registro.status());
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  await db.query('UPDATE users SET email_verificado = true WHERE email = $1', [email]);
  await db.end();

  const token = async () => (await (await request.post(`${SECURITY_URL}/auth/login`, { data: { email, password: PASSWORD } })).json()).token;
  const est = await (await request.post(`${BUSINESS_URL}/establecimientos`, {
    headers: { Authorization: `Bearer ${await token()}` }, data: establecimiento,
  })).json();
  // Token nuevo: el acceso al establecimiento recién creado viaja en él.
  const headers = { Authorization: `Bearer ${await token()}` };
  const params = { id_establecimiento: est.id_establecimiento };
  const pedir = (method, path, data) => request.fetch(BUSINESS_URL + path, { method, headers, params, data });
  const api = {
    alta: async (path, data) => {
      const r = await pedir('POST', path, data);
      expect([200, 201], `alta en ${path}`).toContain(r.status());
      return r.json();
    },
    leer: async (path) => (await pedir('GET', path)).json(),
    cambiar: async (method, path, data) => (await pedir(method, path, data)).status(),
  };
  return { email, idEstablecimiento: est.id_establecimiento, api };
};

const entrar = async (page, email) => {
  await page.goto('/');
  await page.getByPlaceholder('email@gmail.com').fill(email);
  await page.getByPlaceholder('Contraseña').fill(PASSWORD);
  await page.getByText('Ingresar', { exact: true }).last().click();
  await page.getByText('Inicio', { exact: true }).first().waitFor();
};

// Abre una opción del menú "Más" desde cero, para no depender de la pantalla anterior.
const abrirMas = async (page, opcion) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Más/ }).click();
  if (opcion) await ver(page.getByText(opcion, { exact: true })).click();
  await page.waitForTimeout(800);
};

// Saca cada captura aunque otra falle, y al final informa las que no se pudieron sacar.
const capturador = (page) => {
  const fallas = [];
  const sacar = async (nombre, pasos) => {
    try {
      await pasos();
      await foto(page, `app/${nombre}`);
    } catch (error) {
      fallas.push(`${nombre}: ${error.message.split('\n')[0]}`);
    }
  };
  return { sacar, fallas };
};

// Si un paso no encuentra su botón, falla rápido y sigue con la próxima captura.
test.beforeEach(({ page }) => page.setDefaultTimeout(20000));

test('app: tambo', async ({ page, request }) => {
  const cuenta = await cuentaDemo(request, 'Tambo La Esperanza', { nombre: 'Tambo La Esperanza', ubicacion: 'Rafaela, Santa Fe', responsable: 'Demo' });
  const { rp } = await sembrarTambo(cuenta.api.alta, cuenta.idEstablecimiento);
  await entrar(page, cuenta.email);
  const { sacar, fallas } = capturador(page);

  await sacar('tambo-01-inicio', async () => {
    await page.goto('/');
    await page.getByText('Inicio', { exact: true }).first().waitFor();
  });
  await sacar('tambo-02-menu-mas', () => abrirMas(page));
  await sacar('tambo-03-rodeo-lechero', async () => {
    await abrirMas(page, 'Rodeo lechero');
    await ver(page.getByText('🐄 Rodeo lechero')).waitFor();
  });
  await sacar('tambo-04-pendiente-a-tactar', () => ver(page.getByText('A tactar', { exact: true })).click());
  await sacar('tambo-05-cargar-evento', async () => {
    await ver(page.getByText(/^Cargar .+ para estas vacas$/)).click();
    await ver(page.getByPlaceholder('Ej: 325, 328, 331')).waitFor();
  });
  await sacar('tambo-06-ficha-de-vaca', async () => {
    await abrirMas(page, 'Rodeo lechero');
    await ver(page.getByText(new RegExp(`^RP ${rp('Flor')}`))).click();
  });
  await sacar('tambo-07-control-lechero', async () => {
    await abrirMas(page, 'Rodeo lechero');
    await ver(page.getByText('🥛 Control lechero')).click();
  });
  await sacar('tambo-08-litros', async () => {
    await abrirMas(page, 'Litros de leche');
    await ver(page.getByText('🥛 Litros de leche')).waitFor();
  });
  await sacar('tambo-09-calendario', () => abrirMas(page, 'Calendario histórico'));

  expect(fallas, 'capturas que no se pudieron sacar').toEqual([]);
});

test('app: forrajería', async ({ page, request }) => {
  const cuenta = await cuentaDemo(request, 'Forrajería El Trébol', {
    nombre: 'Forrajería El Trébol', ubicacion: 'Esperanza, Santa Fe', responsable: 'Demo', tipo_organizacion: 'forrajeria',
  });
  await sembrarForrajeria(cuenta.api);
  await entrar(page, cuenta.email);
  const { sacar, fallas } = capturador(page);

  await sacar('forrajeria-01-inicio', async () => {
    await abrirMas(page, 'Forrajería');
    await ver(page.getByText('🌾 Forrajería')).waitFor();
  });
  await sacar('forrajeria-02-pedidos', () => ver(page.getByText('Pedidos', { exact: true })).click());
  await sacar('forrajeria-03-nuevo-pedido', () => ver(page.getByText('+ Nuevo pedido')).click());
  await sacar('forrajeria-04-clientes', async () => {
    await abrirMas(page, 'Forrajería');
    await ver(page.getByText('Clientes', { exact: true })).click();
  });
  await sacar('forrajeria-05-cuenta-cliente', () => ver(page.getByText('Establecimiento Don Pedro')).click());

  expect(fallas, 'capturas que no se pudieron sacar').toEqual([]);
});
