// Datos de ejemplo para las capturas. Sirven para la web y para la app.
// `alta(path, data)` da de alta y devuelve el JSON, `leer(path)` devuelve el JSON
// y `cambiar(method, path, data)` devuelve el status.
const { haceDias } = require('./helpers');

// Tambo: vacas en cada etapa del ciclo, litros de 60 días y tres controles lecheros.
const sembrarTambo = async (alta, idEstablecimiento) => {
  const rodeo = await alta('/rodeos', { nombre: 'Vacas en ordeñe', tipo: 'otro', id_establecimiento: idEstablecimiento });
  const base = 3000 + (Date.now() % 90) * 100;
  const vacas = [
    ['Aurora', 'En Tambo', [['parto', 20]]],
    ['Bonita', 'En Tambo', [['parto', 62]]],
    ['Canela', 'En Tambo', [['parto', 75], ['parche', 9]]],
    ['Dulce', 'En Tambo', [['parto', 95], ['inseminacion', 40, { toro: 'Pajuela Holando 512' }]]],
    ['Estrella', 'En Tambo', [['parto', 110], ['inseminacion', 38, { toro: 'Pajuela Holando 512' }]]],
    ['Flor', 'En Tambo', [['parto', 130], ['inseminacion', 75, { toro: 'Toro Jersey' }], ['tacto', 30, { resultado: 'preñada' }]]],
    ['Gaucha', 'En Tambo', [['parto', 140], ['inseminacion', 90], ['tacto', 50, { resultado: 'vacia' }]]],
    ['Hornera', 'En Tambo', [['parto', 330], ['inseminacion', 235, { toro: 'Pajuela Holando 512' }], ['tacto', 195, { resultado: 'preñada' }]]],
    ['Isla', 'En Tambo', [['parto', 160], ['inseminacion', 105], ['tacto', 65, { resultado: 'preñada' }]]],
    ['Jacinta', 'En Tambo', [['parto', 45]]],
    ['Luna', 'En Tambo', [['parto', 200], ['inseminacion', 140], ['tacto', 100, { resultado: 'preñada' }]]],
    ['Mora', 'Seca', [['inseminacion', 262, { toro: 'Toro Jersey' }], ['tacto', 220, { resultado: 'preñada' }], ['secado', 40]]],
    ['Nube', 'Seca', [['inseminacion', 200], ['tacto', 160, { resultado: 'preñada' }], ['secado', 10]]],
    ['Paloma', 'Vaquillona', []],
  ];
  const ids = {};
  for (const [i, [nombre, estado, eventos]] of vacas.entries()) {
    const vaca = await alta('/madres/crear-madre', {
      nombre, rp_madre: base + i + 1, estado, id_rodeo: rodeo.id_rodeo, fecha_nacimiento: '2020-08-15',
    });
    ids[nombre] = vaca.id_madre;
    for (const [tipo, dias, extra] of eventos) {
      await alta('/tambo/eventos', { id_madre: vaca.id_madre, tipo, fecha: haceDias(dias), ...extra });
    }
  }
  const rp = (nombre) => base + vacas.findIndex(([n]) => n === nombre) + 1;

  // Litros con una variación suave y algunos días con vacas en tratamiento.
  for (let dia = 60; dia >= 1; dia--) {
    const vacasOrdene = dia > 30 ? 10 : 11;
    const porVaca = 22 + Math.sin(dia / 5) * 2.5 + (dia % 7 === 0 ? -3 : 0);
    await alta('/litros/registrar', {
      fecha: haceDias(dia),
      litros_vendido: Math.round(vacasOrdene * porVaca),
      litros_terneros: 25,
      cantidad_vacas: vacasOrdene,
      vacas_en_tratamiento: dia % 9 === 0 ? 1 : 0,
    });
  }

  const enOrdene = vacas.filter(([, estado]) => estado === 'En Tambo').map(([nombre]) => nombre);
  for (const [dias, ajuste] of [[45, 1.5], [20, 0.5], [2, 0]]) {
    await alta('/tambo/controles', {
      fecha: haceDias(dias),
      vacas: enOrdene.map((nombre, i) => ({
        id_madre: ids[nombre], litros_manana: 11 + (i % 5) + ajuste, litros_tarde: 9 + (i % 4),
      })),
    });
  }
  return { rp, ids };
};

// Forrajería: stock, clientes, proveedores, pedidos en cada estado, una compra y pagos.
const sembrarForrajeria = async ({ alta, leer, cambiar }) => {
  await cambiar('POST', '/forrajeria/catalogo-base', {});
  const productos = (await leer('/forrajeria/productos')).slice(0, 8);
  if (productos.length < 4) throw new Error('La forrajería no tiene el catálogo base');

  const precios = [[18500, 13200], [9800, 7100], [42000, 31000], [15600, 11400], [7300, 5200], [26000, 19500], [12400, 8900], [5600, 3900]];
  for (const [i, p] of productos.entries()) {
    const [precio, costo] = precios[i];
    await cambiar('PATCH', `/forrajeria/productos/${p.id_producto}`, { precio, costo, stock_minimo: 10 });
    // El último queda por debajo del mínimo para que aparezca el aviso de bajo stock.
    const cantidad = i === productos.length - 1 ? 4 : 30 + i * 9;
    await alta(`/forrajeria/inventario/productos/${p.id_producto}/movimientos`, { tipo: 'entrada', cantidad, motivo: 'Stock inicial' });
  }

  const contacto = (datos) => alta('/forrajeria/contactos', datos);
  const clientes = [
    await contacto({ tipo: 'cliente', es_productor: true, nombre: 'Establecimiento Don Pedro', documento: '30715553331', telefono: '3492445566', zona: 'Zona rural norte', limite_credito: 900000 }),
    await contacto({ tipo: 'cliente', nombre: 'Agropecuaria Los Álamos', documento: '30714448882', telefono: '3492112233', zona: 'Humboldt' }),
    await contacto({ tipo: 'cliente', es_productor: true, nombre: 'Martín Gómez', telefono: '3496556677', zona: 'Pilar' }),
    await contacto({ tipo: 'cliente', nombre: 'Haras La Querencia', telefono: '3492778899', zona: 'Esperanza' }),
  ];
  const proveedor = await contacto({ tipo: 'proveedor', nombre: 'Molino San José', documento: '30709990001', telefono: '3424998877' });
  await contacto({ tipo: 'proveedor', nombre: 'Semillería del Litoral', telefono: '3424112200' });

  await alta('/forrajeria/compras', {
    id_proveedor: proveedor.id_contacto, forma_pago: 'credito', comprobante: 'A-0001-00004512',
    items: [
      { id_producto: productos[0].id_producto, cantidad: 40, costo_unitario: 13200 },
      { id_producto: productos[1].id_producto, cantidad: 25, costo_unitario: 7100 },
    ],
  });
  await alta(`/forrajeria/cuentas/proveedores/${proveedor.id_contacto}/pagos`, { monto: 350000, concepto: 'Transferencia' });

  const pedido = async (cliente, items, extra, estados) => {
    const nuevo = await alta('/forrajeria/pedidos', {
      id_cliente: cliente.id_contacto,
      items: items.map(([i, cantidad]) => ({ id_producto: productos[i].id_producto, cantidad })),
      ...extra,
    });
    for (const estado of estados) {
      const status = await cambiar('PATCH', `/forrajeria/pedidos/${nuevo.id_pedido}/estado`, { estado });
      if (status >= 300) throw new Error(`pedido ${nuevo.id_pedido} a ${estado}: ${status}`);
    }
    return nuevo;
  };
  const entregado = await pedido(clientes[0], [[0, 10], [2, 2]], { forma_pago: 'credito', forma_entrega: 'reparto' },
    ['confirmado', 'preparando', 'listo', 'entregado']);
  await pedido(clientes[1], [[1, 15], [4, 6]], { forma_pago: 'contado', forma_entrega: 'retiro' }, ['confirmado', 'preparando', 'listo', 'entregado']);
  await pedido(clientes[2], [[3, 8]], { forma_pago: 'credito', forma_entrega: 'reparto' }, ['confirmado', 'preparando']);
  await pedido(clientes[3], [[5, 4], [6, 5]], { forma_pago: 'contado', forma_entrega: 'retiro' }, ['confirmado']);
  await pedido(clientes[0], [[1, 12]], { forma_pago: 'credito', forma_entrega: 'reparto' }, []);
  await pedido(clientes[2], [[0, 3]], { forma_pago: 'contado', forma_entrega: 'retiro' }, ['cancelado']);
  await alta(`/forrajeria/cuentas/clientes/${clientes[0].id_contacto}/pagos`, { monto: 120000, concepto: 'Pago a cuenta' });
  return { clientes, proveedor, entregado };
};

module.exports = { sembrarTambo, sembrarForrajeria };
