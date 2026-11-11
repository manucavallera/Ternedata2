const { test, expect } = require('../e2e/fixtures');
const { foto, nuevoEstablecimiento } = require('./helpers');
const { sembrarForrajeria } = require('./datos');

// Forrajería de ejemplo (ver datos.js) y una captura por pantalla.
test('forrajería: stock, clientes, pedidos, compras y reportes', async ({ page, api }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await nuevoEstablecimiento(page, api, {
    nombre: 'Forrajería El Trébol', ubicacion: 'Esperanza, Santa Fe', responsable: 'Demo', tipo_organizacion: 'forrajeria',
  });
  const { clientes, proveedor, entregado } = await sembrarForrajeria({
    alta: api.crear,
    leer: async (path) => (await api.pedir('GET', path)).json(),
    cambiar: async (method, path, data) => (await api.pedir(method, path, data)).status(),
  });

  const pantallas = [
    ['/forrajeria', '01-inicio'],
    ['/forrajeria/productos', '02-catalogo-y-stock'],
    ['/forrajeria/productos/valorizado', '03-stock-valorizado'],
    ['/forrajeria/productos/historial', '04-historial-de-stock'],
    ['/forrajeria/clientes', '05-clientes'],
    [`/forrajeria/clientes/${clientes[0].id_contacto}`, '06-cuenta-corriente-cliente'],
    ['/forrajeria/pedidos', '07-pedidos'],
    ['/forrajeria/pedidos/nuevo', '08-nuevo-pedido'],
    [`/forrajeria/pedidos/${entregado.id_pedido}/remito`, '09-remito'],
    ['/forrajeria/compras', '10-compras'],
    ['/forrajeria/compras/nueva', '11-nueva-compra'],
    ['/forrajeria/proveedores', '12-proveedores'],
    [`/forrajeria/proveedores/${proveedor.id_contacto}`, '13-cuenta-proveedor'],
    ['/forrajeria/reportes', '14-reportes-de-ventas'],
  ];
  for (const [ruta, nombre] of pantallas) {
    await test.step(nombre, async () => {
      await page.goto(ruta);
      await expect(page).toHaveURL(new RegExp(ruta.replace(/\//g, '\\/') + '$'));
      await foto(page, `web/forrajeria/${nombre}`);
    });
  }
});
