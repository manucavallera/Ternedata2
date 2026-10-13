const base = require('@playwright/test');

const BUSSINES_URL = process.env.BUSSINES_URL;
// Hosts de los backends (producción o local) para interceptar y esperar sus respuestas.
const escapar = (url) => new URL(url).host.replace(/[.]/g, '\\.');
const BACKENDS = new RegExp(`${escapar(BUSSINES_URL)}|${escapar(process.env.SECURITY_URL)}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const segundosDeEspera = (headers) => (Number(headers['retry-after']) || 30) + 1;

const test = base.test.extend({
  // El backend corta con 429 por minuto: los pedidos del navegador se reintentan solos.
  context: async ({ context }, use) => {
    await context.route(BACKENDS, async (route) => {
      try {
        let respuesta = await route.fetch();
        for (let i = 0; i < 3 && respuesta.status() === 429; i++) {
          await sleep(segundosDeEspera(respuesta.headers()) * 1000);
          respuesta = await route.fetch();
        }
        await route.fulfill({ response: respuesta });
      } catch {
        // La página se cerró con el pedido en vuelo.
      }
    });
    await use(context);
  },

  // Altas y bajas por API con la sesión y el establecimiento de la página. Lo creado se borra al terminar.
  api: async ({ page }, use) => {
    const aBorrar = [];
    const pedir = async (method, path, data) => {
      const sesion = await page.evaluate(() => ({
        token: localStorage.getItem('token'),
        establecimiento: localStorage.getItem('establecimientoActual'),
      }));
      for (let intento = 0; ; intento++) {
        const respuesta = await page.request.fetch(BUSSINES_URL + path, {
          method,
          headers: { Authorization: `Bearer ${sesion.token}` },
          params: { id_establecimiento: sesion.establecimiento },
          data,
        });
        if (respuesta.status() !== 429 || intento >= 3) return respuesta;
        await sleep(segundosDeEspera(respuesta.headers()) * 1000);
      }
    };
    const crear = async (path, data) => {
      const respuesta = await pedir('POST', path, data);
      base.expect([200, 201], `alta previa en ${path}`).toContain(respuesta.status());
      return respuesta.json();
    };
    const borrarAlFinal = (path) => aBorrar.push(path);

    await use({ pedir, crear, borrarAlFinal });

    for (const path of aBorrar.reverse()) {
      const respuesta = await pedir('DELETE', path);
      // 404/409/500: el propio test ya lo borró desde la UI (cada módulo responde distinto).
      base.expect([200, 204, 404, 409, 500], `limpieza de ${path}`).toContain(respuesta.status());
    }
  },
});

// Madre + ternero de prueba para los flujos que parten de animales existentes.
const sembrarAnimales = async (api) => {
  const sufijo = Date.now() % 99999;
  const rpMadre = 810000 + sufijo;
  const rpTernero = 820000 + sufijo;
  const madre = await api.crear('/madres/crear-madre', {
    nombre: 'TEST E2E Madre', rp_madre: rpMadre, estado: 'Seca', fecha_nacimiento: '2021-03-10',
  });
  api.borrarAlFinal(`/madres/delete-madre-by-id/${madre.id_madre}`);
  const ternero = await api.crear('/terneros/crear-ternero', {
    rp_ternero: rpTernero, sexo: 'Macho', estado: 'Vivo', peso_nacer: 35, fecha_nacimiento: '2026-09-01',
    id_madre: madre.id_madre, semen: 'TEST E2E', observaciones: 'TEST E2E',
  });
  api.borrarAlFinal(`/terneros/delete-ternero-by-id/${ternero.id_ternero}`);
  return { rpMadre, rpTernero, idMadre: madre.id_madre, idTernero: ternero.id_ternero };
};

// Espera la próxima escritura al backend y exige que haya salido bien.
const esperarEscritura = (page, fragmento) => page.waitForResponse((r) =>
  BACKENDS.test(r.url()) && r.url().includes(fragmento)
  && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.request().method()) && r.status() !== 429);

const abrirListado = async (page, pestana) => {
  const { irAlDashboard, abrirPestana } = require('./helpers');
  await irAlDashboard(page);
  await page.getByRole('button', { name: 'Listados', exact: true }).click();
  await abrirPestana(page, pestana);
};

const abrirIngreso = async (page, pestana) => {
  const { irAlDashboard, abrirPestana } = require('./helpers');
  await irAlDashboard(page);
  await page.getByRole('button', { name: 'Ingresos', exact: true }).click();
  await abrirPestana(page, pestana);
};

// Pulsa Eliminar en una fila y confirma en el modal propio de la app si aparece.
const eliminarFila = async (page, filaAEliminar) => {
  await filaAEliminar.getByRole('button', { name: 'Eliminar' }).click();
  const confirmar = page.locator('.fixed').filter({ hasText: 'Confirmar Eliminación' })
    .getByRole('button', { name: 'Eliminar' });
  if (await confirmar.waitFor({ timeout: 3000 }).then(() => true, () => false)) await confirmar.click();
};

const fila = (page, texto) => page.locator('tr', { hasText: String(texto) }).filter({ visible: true }).first();
const modal = (page, titulo) => page.locator('.fixed').filter({ has: page.getByRole('heading', { name: titulo }) }).last();

module.exports = {
  test, expect: base.expect, sembrarAnimales, esperarEscritura, abrirListado, abrirIngreso, fila, modal, eliminarFila,
};
