require('dotenv').config({ path: __dirname + '/.env.test' });
const axios = require('axios');
const { Client } = require('pg');
const { retryOn429 } = require('./helpers/http');

const securityApi = axios.create({ baseURL: process.env.SECURITY_URL, timeout: 20000 });
const businessApi = axios.create({ baseURL: process.env.BUSSINES_URL, timeout: 20000, validateStatus: (status) => status !== 429 }); // el 429 se reintenta
retryOn429(securityApi);
retryOn429(businessApi);

const state = { token: null, forrajeriaA: null, forrajeriaB: null, ganaderia: null };
const sufijo = Date.now() % 99999;

const en = (idEstablecimiento) => ({
  headers: { Authorization: `Bearer ${state.token}` },
  params: { id_establecimiento: idEstablecimiento },
});

const crearEstablecimiento = async (nombre, tipo) => {
  const res = await businessApi.post('/establecimientos', {
    nombre, ubicacion: 'TEST forrajería', responsable: 'TEST QA', tipo_organizacion: tipo,
  }, { headers: { Authorization: `Bearer ${state.token}` } });
  expect([200, 201]).toContain(res.status);
  expect(res.data.tipo_organizacion).toBe(tipo);
  const refresh = await securityApi.post('/auth/refresh', {}, { headers: { Authorization: `Bearer ${state.token}` } });
  state.token = refresh.data.token;
  return res.data.id_establecimiento;
};

describe('🌾 FORRAJERÍA — catálogo, stock, clientes, pedidos y cuentas', () => {
  const f = {};

  beforeAll(async () => {
    const login = await securityApi.post('/auth/login', {
      email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD,
    });
    state.token = login.data.token;
    state.forrajeriaA = await crearEstablecimiento(`TEST_Forrajeria_A_${sufijo}`, 'forrajeria');
    state.forrajeriaB = await crearEstablecimiento(`TEST_Forrajeria_B_${sufijo}`, 'forrajeria');
    state.ganaderia = await crearEstablecimiento(`TEST_Ganaderia_${sufijo}`, 'ganaderia');
  }, 240000);

  afterAll(async () => {
    // Forrajería no expone bajas: se borran los establecimientos de prueba si el backend lo permite.
    for (const id of [state.forrajeriaA, state.forrajeriaB, state.ganaderia]) {
      if (id) await businessApi.delete(`/establecimientos/${id}`, { headers: { Authorization: `Bearer ${state.token}` } });
    }
  });

  test('un establecimiento ganadero no puede usar forrajería', async () => {
    for (const ruta of ['/forrajeria/productos', '/forrajeria/contactos', '/forrajeria/pedidos', '/forrajeria/inventario/movimientos']) {
      const res = await businessApi.get(ruta, en(state.ganaderia));
      expect(res.status).toBe(403);
    }
  });

  test('sin token responde 401', async () => {
    const res = await businessApi.get('/forrajeria/productos', { params: { id_establecimiento: state.forrajeriaA } });
    expect(res.status).toBe(401);
  });

  test('una forrajería nueva arranca con el catálogo base, sin avisos de stock', async () => {
    const productos = await businessApi.get('/forrajeria/productos', en(state.forrajeriaB));
    expect(productos.status).toBe(200);
    const nombres = productos.data.map((p) => p.nombre);
    expect(nombres).toEqual(expect.arrayContaining(['Fardo de alfalfa', 'Maíz partido', 'Balanceado ternero (iniciador)']));
    expect(productos.data.every((p) => Number(p.precio) === 0 && Number(p.stock_actual) === 0)).toBe(true);
    const categorias = await businessApi.get('/forrajeria/categorias', en(state.forrajeriaB));
    expect(categorias.data.map((c) => c.nombre)).toContain('Fardos y rollos');
    // Stock 0 con mínimo 0 no es "bajo stock".
    expect((await businessApi.get('/forrajeria/inventario/bajo-stock', en(state.forrajeriaB))).data).toEqual([]);

    // Volver a pedirlo no duplica nada.
    const otraVez = await businessApi.post('/forrajeria/catalogo-base', {}, en(state.forrajeriaB));
    expect([200, 201]).toContain(otraVez.status);
    expect(otraVez.data).toEqual({ categorias: 0, productos: 0 });
    expect((await businessApi.get('/forrajeria/productos', en(state.forrajeriaB))).data).toHaveLength(productos.data.length);
  });

  test('crear categoría y producto y listarlos', async () => {
    const categoria = await businessApi.post('/forrajeria/categorias', { nombre: `TEST Balanceados ${sufijo}` }, en(state.forrajeriaA));
    expect([200, 201]).toContain(categoria.status);
    f.categoria = categoria.data.id_categoria;

    const producto = await businessApi.post('/forrajeria/productos', {
      nombre: `TEST Balanceado ternero ${sufijo}`, id_categoria: f.categoria, sku: `TEST-${sufijo}`,
      unidad_venta: 'bolsa', costo: 700, precio: 1000, stock_minimo: 5,
    }, en(state.forrajeriaA));
    expect([200, 201]).toContain(producto.status);
    f.producto = producto.data.id_producto;
    expect(Number(producto.data.stock_actual || 0)).toBe(0);

    const listado = await businessApi.get('/forrajeria/productos', en(state.forrajeriaA));
    expect(listado.status).toBe(200);
    expect(listado.data.map((p) => p.id_producto)).toContain(f.producto);
    const categorias = await businessApi.get('/forrajeria/categorias', en(state.forrajeriaA));
    expect(categorias.data.map((c) => c.id_categoria)).toContain(f.categoria);
  });

  test('producto inválido se rechaza', async () => {
    for (const cuerpo of [{ nombre: 'TEST sin precio', unidad_venta: 'bolsa' }, { nombre: 'TEST unidad mala', unidad_venta: 'litro', precio: 10 }, { nombre: 'TEST precio negativo', unidad_venta: 'kg', precio: -5 }]) {
      const res = await businessApi.post('/forrajeria/productos', cuerpo, en(state.forrajeriaA));
      expect(res.status).toBe(400);
    }
  });

  test('otra forrajería no ve ni mueve los productos de la primera', async () => {
    const listado = await businessApi.get('/forrajeria/productos', en(state.forrajeriaB));
    expect(listado.status).toBe(200);
    expect(listado.data.map((p) => p.id_producto)).not.toContain(f.producto);
    const movimiento = await businessApi.post(`/forrajeria/inventario/productos/${f.producto}/movimientos`, { tipo: 'entrada', cantidad: 5 }, en(state.forrajeriaB));
    expect(movimiento.status).toBe(404);
  });

  test('stock: entrada, salida, ajuste, sin negativos y aviso de bajo stock', async () => {
    const mover = (tipo, cantidad) => businessApi.post(`/forrajeria/inventario/productos/${f.producto}/movimientos`, { tipo, cantidad, motivo: 'TEST' }, en(state.forrajeriaA));

    const entrada = await mover('entrada', 10);
    expect([200, 201]).toContain(entrada.status);
    expect(entrada.data.stock_nuevo).toBe(10);

    const negativo = await mover('salida', 20);
    expect(negativo.status).toBe(400);

    const salida = await mover('salida', 6);
    expect(salida.data.stock_nuevo).toBe(4);
    const bajo = await businessApi.get('/forrajeria/inventario/bajo-stock', en(state.forrajeriaA));
    expect(bajo.status).toBe(200);
    expect(bajo.data.map((p) => p.id_producto)).toContain(f.producto);

    const ajuste = await mover('ajuste', 10);
    expect(ajuste.data.stock_nuevo).toBe(10);
    for (const invalido of [['entrada', -3], ['entrada', 0], ['robo', 1]]) {
      expect((await mover(...invalido)).status).toBe(400);
    }

    const movimientos = await businessApi.get('/forrajeria/inventario/movimientos', en(state.forrajeriaA));
    expect(movimientos.status).toBe(200);
    expect(movimientos.data.filter((m) => m.id_producto === f.producto)).toHaveLength(3);
  });

  test('clientes: alta, documento duplicado, edición y aislamiento', async () => {
    const datos = { tipo: 'cliente', es_productor: true, nombre: `TEST Productor ${sufijo}`, documento: `20${sufijo}`, telefono: '3794000000', limite_credito: 50000 };
    const cliente = await businessApi.post('/forrajeria/contactos', datos, en(state.forrajeriaA));
    expect([200, 201]).toContain(cliente.status);
    f.cliente = cliente.data.id_contacto;

    const duplicado = await businessApi.post('/forrajeria/contactos', { ...datos, nombre: 'TEST duplicado' }, en(state.forrajeriaA));
    expect(duplicado.status).toBe(409);

    const editado = await businessApi.patch(`/forrajeria/contactos/${f.cliente}`, { zona: 'TEST zona norte' }, en(state.forrajeriaA));
    expect(editado.status).toBe(200);
    expect(editado.data.zona).toBe('TEST zona norte');

    const ajeno = await businessApi.patch(`/forrajeria/contactos/${f.cliente}`, { zona: 'intruso' }, en(state.forrajeriaB));
    expect(ajeno.status).toBe(404);
    const listadoB = await businessApi.get('/forrajeria/contactos', en(state.forrajeriaB));
    expect(listadoB.data.map((c) => c.id_contacto)).not.toContain(f.cliente);
  });

  test('pedido: valida cliente, productos y stock', async () => {
    const pedir = (cuerpo) => businessApi.post('/forrajeria/pedidos', cuerpo, en(state.forrajeriaA));
    expect((await pedir({ id_cliente: 99999999, items: [{ id_producto: f.producto, cantidad: 1 }] })).status).toBe(404);
    expect((await pedir({ id_cliente: f.cliente, items: [] })).status).toBe(400);
    expect((await pedir({ id_cliente: f.cliente, items: [{ id_producto: 99999999, cantidad: 1 }] })).status).toBe(404);

    const excesivo = await pedir({ id_cliente: f.cliente, items: [{ id_producto: f.producto, cantidad: 500 }] });
    expect([200, 201]).toContain(excesivo.status);
    const confirmar = await businessApi.patch(`/forrajeria/pedidos/${excesivo.data.id_pedido}/estado`, { estado: 'confirmado' }, en(state.forrajeriaA));
    expect(confirmar.status).toBe(400);
  });

  test('pedido a crédito: confirma, descuenta stock, entrega y deja deuda; el pago la baja', async () => {
    const pedido = await businessApi.post('/forrajeria/pedidos', {
      id_cliente: f.cliente, items: [{ id_producto: f.producto, cantidad: 3 }], forma_pago: 'credito', forma_entrega: 'retiro',
    }, en(state.forrajeriaA));
    expect([200, 201]).toContain(pedido.status);
    expect(pedido.data.estado).toBe('pendiente');
    expect(Number(pedido.data.total)).toBe(3000);
    const cambiar = (estado) => businessApi.patch(`/forrajeria/pedidos/${pedido.data.id_pedido}/estado`, { estado }, en(state.forrajeriaA));

    expect((await cambiar('entregado')).status).toBe(400);
    expect((await cambiar('confirmado')).status).toBe(200);
    const stock = async () => Number((await businessApi.get('/forrajeria/productos', en(state.forrajeriaA))).data.find((p) => p.id_producto === f.producto).stock_actual);
    expect(await stock()).toBe(7);

    for (const estado of ['preparando', 'listo', 'entregado']) expect((await cambiar(estado)).status).toBe(200);
    expect((await cambiar('cancelado')).status).toBe(400);

    const cuenta = await businessApi.get(`/forrajeria/cuentas/clientes/${f.cliente}`, en(state.forrajeriaA));
    expect(cuenta.status).toBe(200);
    expect(Number(cuenta.data.saldo)).toBe(3000);

    const pago = await businessApi.post(`/forrajeria/cuentas/clientes/${f.cliente}/pagos`, { monto: 1200, concepto: 'TEST pago parcial' }, en(state.forrajeriaA));
    expect([200, 201]).toContain(pago.status);
    const despues = await businessApi.get(`/forrajeria/cuentas/clientes/${f.cliente}`, en(state.forrajeriaA));
    expect(Number(despues.data.saldo)).toBe(1800);
    for (const monto of [0, -100]) {
      expect((await businessApi.post(`/forrajeria/cuentas/clientes/${f.cliente}/pagos`, { monto }, en(state.forrajeriaA))).status).toBe(400);
    }
  });

  test('cancelar un pedido confirmado devuelve el stock', async () => {
    const pedido = await businessApi.post('/forrajeria/pedidos', {
      id_cliente: f.cliente, items: [{ id_producto: f.producto, cantidad: 2 }],
    }, en(state.forrajeriaA));
    const cambiar = (estado) => businessApi.patch(`/forrajeria/pedidos/${pedido.data.id_pedido}/estado`, { estado }, en(state.forrajeriaA));
    const stock = async () => Number((await businessApi.get('/forrajeria/productos', en(state.forrajeriaA))).data.find((p) => p.id_producto === f.producto).stock_actual);
    expect((await cambiar('confirmado')).status).toBe(200);
    expect(await stock()).toBe(5);
    expect((await cambiar('cancelado')).status).toBe(200);
    expect(await stock()).toBe(7);
  });

  test('el dueño edita precio, categoría y da de baja un producto; el stock no se edita así', async () => {
    const editado = await businessApi.patch(`/forrajeria/productos/${f.producto}`, { precio: 1200, stock_actual: 999 }, en(state.forrajeriaA));
    expect(editado.status).toBe(200);
    expect(Number(editado.data.precio)).toBe(1200);
    expect(Number(editado.data.stock_actual)).not.toBe(999);

    const categoria = await businessApi.patch(`/forrajeria/categorias/${f.categoria}`, { nombre: `TEST Balanceados editada ${sufijo}` }, en(state.forrajeriaA));
    expect(categoria.status).toBe(200);
    expect((await businessApi.patch(`/forrajeria/productos/${f.producto}`, { precio: 1 }, en(state.forrajeriaB))).status).toBe(404);

    const otro = await businessApi.post('/forrajeria/productos', { nombre: `TEST Rollo baja ${sufijo}`, unidad_venta: 'rollo', precio: 10 }, en(state.forrajeriaA));
    const baja = await businessApi.patch(`/forrajeria/productos/${otro.data.id_producto}`, { estado: 'inactivo' }, en(state.forrajeriaA));
    expect(baja.data.estado).toBe('inactivo');
    const pedido = await businessApi.post('/forrajeria/pedidos', { id_cliente: f.cliente, items: [{ id_producto: otro.data.id_producto, cantidad: 1 }] }, en(state.forrajeriaA));
    expect(pedido.status).toBe(400);
  });

  // Un operario de la forrajería: carga pedidos, clientes y entradas, pero no toca precios ni plata.
  (process.env.TEST_DB_URL ? describe : describe.skip)('permisos del operario', () => {
    const operario = { email: `e2e_operario_forr_${sufijo}@ternedata.test`, password: 'ClaveOperario123' };
    let db;
    let tokenOperario;
    const comoOperario = () => ({ headers: { Authorization: `Bearer ${tokenOperario}` }, params: { id_establecimiento: state.forrajeriaA } });

    beforeAll(async () => {
      db = new Client({ connectionString: process.env.TEST_DB_URL });
      await db.connect();
      const registro = await securityApi.post('/auth/register', { name: 'TEST operario forrajería', ...operario });
      expect([200, 201]).toContain(registro.status);
      const { rows } = await db.query(
        "UPDATE users SET email_verificado = true, rol = 'operario' WHERE email = $1 RETURNING id", [operario.email],
      );
      await db.query(
        'INSERT INTO user_establecimientos ("userId", "establecimientoId", rol) VALUES ($1, $2, $3)',
        [rows[0].id, state.forrajeriaA, 'operario'],
      );
      tokenOperario = (await securityApi.post('/auth/login', operario)).data.token;
    });

    afterAll(async () => {
      await db.query('DELETE FROM user_establecimientos WHERE "userId" IN (SELECT id FROM users WHERE email = $1)', [operario.email]);
      await db.query('DELETE FROM users WHERE email = $1', [operario.email]);
      await db.end();
    });

    test('ve el catálogo y registra mercadería que entra', async () => {
      expect((await businessApi.get('/forrajeria/productos', comoOperario())).status).toBe(200);
      const entrada = await businessApi.post(`/forrajeria/inventario/productos/${f.producto}/movimientos`, { tipo: 'entrada', cantidad: 1 }, comoOperario());
      expect([200, 201]).toContain(entrada.status);
    });

    test('carga un pedido y lo avanza, pero no lo cancela', async () => {
      const pedido = await businessApi.post('/forrajeria/pedidos', { id_cliente: f.cliente, items: [{ id_producto: f.producto, cantidad: 1 }] }, comoOperario());
      expect([200, 201]).toContain(pedido.status);
      const estado = (e) => businessApi.patch(`/forrajeria/pedidos/${pedido.data.id_pedido}/estado`, { estado: e }, comoOperario());
      expect((await estado('confirmado')).status).toBe(200);
      expect((await estado('cancelado')).status).toBe(403);
    });

    test('no cambia precios, no saca stock, no edita clientes ni cobra', async () => {
      expect((await businessApi.patch(`/forrajeria/productos/${f.producto}`, { precio: 1 }, comoOperario())).status).toBe(403);
      expect((await businessApi.post('/forrajeria/productos', { nombre: 'x', unidad_venta: 'kg', precio: 1 }, comoOperario())).status).toBe(403);
      expect((await businessApi.post('/forrajeria/catalogo-base', {}, comoOperario())).status).toBe(403);
      for (const tipo of ['salida', 'ajuste']) {
        expect((await businessApi.post(`/forrajeria/inventario/productos/${f.producto}/movimientos`, { tipo, cantidad: 1 }, comoOperario())).status).toBe(403);
      }
      expect((await businessApi.patch(`/forrajeria/contactos/${f.cliente}`, { limite_credito: 9999999 }, comoOperario())).status).toBe(403);
      expect((await businessApi.post(`/forrajeria/cuentas/clientes/${f.cliente}/pagos`, { monto: 1 }, comoOperario())).status).toBe(403);
      // El precio sigue siendo el que puso el dueño.
      const productos = (await businessApi.get('/forrajeria/productos', en(state.forrajeriaA))).data;
      expect(Number(productos.find((p) => p.id_producto === f.producto).precio)).toBe(1200);
    });
  });
});
