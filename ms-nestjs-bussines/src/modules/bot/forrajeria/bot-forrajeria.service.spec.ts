import { BotForrajeriaService } from './bot-forrajeria.service';
import { validarAccionForrajeria } from './prompt';

const productos = [
  {
    id_producto: 1,
    nombre: 'Fardo de alfalfa',
    unidad_venta: 'fardo',
    precio: 1000,
    stock_actual: 50,
    stock_minimo: 0,
    estado: 'activo',
  },
  {
    id_producto: 2,
    nombre: 'Maíz molido',
    unidad_venta: 'bolsa',
    precio: 500,
    stock_actual: 10,
    stock_minimo: 0,
    estado: 'activo',
  },
  {
    id_producto: 3,
    nombre: 'Maíz entero',
    unidad_venta: 'bolsa',
    precio: 450,
    stock_actual: 0,
    stock_minimo: 0,
    estado: 'inactivo',
  },
];
const clientes = [
  {
    id_contacto: 10,
    nombre: 'Juan Pérez',
    estado: 'activo',
    direccion: 'Ruta 12 km 3',
    zona: 'Crespo',
  },
  {
    id_contacto: 11,
    nombre: 'Ana Gómez',
    estado: 'activo',
    direccion: null,
    zona: null,
  },
];

const armar = (rol: 'admin' | 'operario' | null = 'admin') => {
  const deps = {
    rol: { rolEn: jest.fn().mockResolvedValue(rol) },
    contactos: {
      findContactos: jest.fn().mockResolvedValue(clientes),
      createContacto: jest.fn().mockResolvedValue({}),
    },
    cuentas: {
      getSaldos: jest
        .fn()
        .mockResolvedValue([{ id_contacto: 10, saldo: 3000 }]),
      registrarPago: jest.fn().mockResolvedValue({}),
      getCuenta: jest.fn().mockResolvedValue({ saldo: 0 }),
    },
    inventario: {
      registrarMovimiento: jest.fn().mockResolvedValue({ stock_nuevo: 60 }),
      findBajoStock: jest.fn().mockResolvedValue([]),
    },
    ventas: {
      createPedido: jest.fn().mockImplementation(async (_id, dto) => ({
        id_pedido: 7,
        total: dto.items.reduce(
          (s, i) =>
            s +
            i.cantidad *
              productos.find((p) => p.id_producto === i.id_producto)!.precio,
          0,
        ),
        forma_pago: dto.forma_pago,
        items: dto.items.map((i) => ({
          ...i,
          precio_unitario: 1000,
          subtotal: i.cantidad * 1000,
        })),
      })),
      findPedidos: jest.fn().mockResolvedValue([]),
      cambiarEstado: jest.fn().mockResolvedValue({}),
    },
    productoRepo: { find: jest.fn().mockResolvedValue(productos) },
  };
  const servicio = new BotForrajeriaService(
    deps.rol as any,
    deps.contactos as any,
    deps.cuentas as any,
    deps.inventario as any,
    deps.ventas as any,
    deps.productoRepo as any,
  );
  const ctx = {
    user: { id: 1, name: 'Manu', rol: 'admin', id_establecimiento: 5 } as any,
    idEstablecimiento: 5,
  };
  return { servicio, deps, ctx };
};

describe('BotForrajeriaService', () => {
  it('arma el pedido con cliente y productos buscados por nombre', async () => {
    const { servicio, deps, ctx } = armar();
    const { mensaje } = await servicio.ejecutar(
      validarAccionForrajeria({
        accion: 'crear_pedido',
        cliente: 'juan',
        forma_pago: 'credito',
        items: [
          { producto: 'fardos alfalfa', cantidad: 3 },
          { producto: 'fardo de alfalfa', cantidad: '2' },
        ],
      }),
      ctx,
    );
    expect(deps.ventas.createPedido).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        id_cliente: 10,
        forma_pago: 'credito',
        forma_entrega: 'retiro',
        items: [{ id_producto: 1, cantidad: 5 }],
      }),
    );
    expect(mensaje).toContain('Pedido #7');
    expect(mensaje).toContain('Juan Pérez');
  });

  it('no arma el pedido si el producto es ambiguo o está dado de baja', async () => {
    const { servicio, deps, ctx } = armar();
    const { mensaje } = await servicio.ejecutar(
      validarAccionForrajeria({
        accion: 'crear_pedido',
        cliente: 'juan',
        items: [{ producto: 'maiz entero', cantidad: 1 }],
      }),
      ctx,
    );
    expect(mensaje).toContain('No encontré el producto');
    expect(deps.ventas.createPedido).not.toHaveBeenCalled();
  });

  it('pide dirección para reparto si el cliente no la tiene', async () => {
    const { servicio, deps, ctx } = armar();
    const { mensaje } = await servicio.ejecutar(
      validarAccionForrajeria({
        accion: 'crear_pedido',
        cliente: 'ana',
        forma_entrega: 'reparto',
        items: [{ producto: 'fardo', cantidad: 1 }],
      }),
      ctx,
    );
    expect(mensaje).toContain('no tiene dirección');
    expect(deps.ventas.createPedido).not.toHaveBeenCalled();
  });

  it('avisa del límite de crédito sin cargar el pedido', async () => {
    const { servicio, deps, ctx } = armar();
    deps.ventas.createPedido.mockRejectedValue({
      message: 'Supera el límite de crédito de $1.000: debe ...',
    });
    const { mensaje } = await servicio.ejecutar(
      validarAccionForrajeria({
        accion: 'crear_pedido',
        cliente: 'juan',
        forma_pago: 'credito',
        items: [{ producto: 'fardo', cantidad: 9 }],
      }),
      ctx,
    );
    expect(mensaje).toContain('No lo cargué');
  });

  it('lleva un pedido pendiente hasta entregado pasando por cada paso', async () => {
    const { servicio, deps, ctx } = armar('operario');
    deps.ventas.findPedidos.mockResolvedValue([
      {
        id_pedido: 7,
        estado: 'pendiente',
        forma_pago: 'credito',
        total: 3000,
        cliente: { nombre: 'Juan' },
        items: [],
      },
    ]);
    const { mensaje } = await servicio.ejecutar(
      { accion: 'avanzar_pedido', id_pedido: 7, estado: 'entregado' },
      ctx,
    );
    expect(deps.ventas.cambiarEstado.mock.calls.map((c) => c[2])).toEqual([
      'confirmado',
      'preparando',
      'listo',
      'entregado',
    ]);
    expect(mensaje).toContain('Se cargaron $3.000 en la cuenta de Juan');
  });

  it('encuentra el pedido por el cliente si tiene uno solo en curso', async () => {
    const { servicio, deps, ctx } = armar('operario');
    deps.ventas.findPedidos.mockImplementation(async (_id, f) =>
      f.id_cliente === 10
        ? [
            { id_pedido: 8, estado: 'listo', total: 100, items: [] },
            { id_pedido: 3, estado: 'entregado', total: 50, items: [] },
          ]
        : [
            {
              id_pedido: 8,
              estado: 'listo',
              forma_pago: 'contado',
              total: 100,
              cliente: { nombre: 'Juan' },
              items: [],
            },
          ],
    );
    const { mensaje } = await servicio.ejecutar(
      validarAccionForrajeria({
        accion: 'avanzar_pedido',
        id_pedido: 0,
        cliente: 'juan',
        estado: 'entregado',
      }),
      ctx,
    );
    expect(deps.ventas.cambiarEstado).toHaveBeenCalledWith(5, 8, 'entregado');
    expect(mensaje).toBe('✅ Pedido #8 entregado.');
  });

  it('un empleado no cancela pedidos ni anota pagos ni ve ventas', async () => {
    const { servicio, deps, ctx } = armar('operario');
    deps.ventas.findPedidos.mockResolvedValue([
      { id_pedido: 7, estado: 'pendiente', items: [] },
    ]);
    expect(
      (
        await servicio.ejecutar(
          { accion: 'avanzar_pedido', id_pedido: 7, estado: 'cancelado' },
          ctx,
        )
      ).mensaje,
    ).toContain('dueño');
    expect(
      (
        await servicio.ejecutar(
          { accion: 'registrar_pago', cliente: 'juan', monto: 100 },
          ctx,
        )
      ).mensaje,
    ).toContain('dueño');
    expect(
      (
        await servicio.ejecutar(
          { accion: 'consultar_ventas', periodo: 'hoy' },
          ctx,
        )
      ).mensaje,
    ).toContain('dueño');
    expect(deps.ventas.cambiarEstado).not.toHaveBeenCalled();
    expect(deps.cuentas.registrarPago).not.toHaveBeenCalled();
  });

  it('el pago se pregunta antes de anotarlo y se anota al confirmar', async () => {
    const { servicio, deps, ctx } = armar('admin');
    const r = await servicio.ejecutar(
      validarAccionForrajeria({
        accion: 'registrar_pago',
        cliente: 'perez',
        monto: '3000',
      }),
      ctx,
    );
    expect(r.mensaje).toContain('¿Anoto un pago de *$3.000* de *Juan Pérez*?');
    expect(deps.cuentas.registrarPago).not.toHaveBeenCalled();
    const final = await servicio.confirmarPago(r.pendiente, ctx);
    expect(deps.cuentas.registrarPago).toHaveBeenCalledWith(
      5,
      10,
      expect.objectContaining({ monto: 3000 }),
    );
    expect(final).toContain('Quedó al día');
  });

  it('registra la entrada de mercadería y dice el stock nuevo', async () => {
    const { servicio, deps, ctx } = armar('operario');
    const { mensaje } = await servicio.ejecutar(
      { accion: 'entrada_stock', producto: 'fardo', cantidad: 10 },
      ctx,
    );
    expect(deps.inventario.registrarMovimiento).toHaveBeenCalledWith(
      5,
      1,
      expect.objectContaining({ tipo: 'entrada', cantidad: 10 }),
    );
    expect(mensaje).toBe('✅ Entraron 10 × Fardo de alfalfa. Ahora hay 60.');
  });

  it('dice cuánto debe un cliente y la lista de deudores', async () => {
    const { servicio, ctx } = armar('operario');
    expect(
      (
        await servicio.ejecutar(
          { accion: 'consultar_deuda', cliente: 'juan' },
          ctx,
        )
      ).mensaje,
    ).toBe('💰 Juan Pérez debe $3.000.');
    expect(
      (await servicio.ejecutar({ accion: 'consultar_deuda', cliente: '' }, ctx))
        .mensaje,
    ).toContain('Te deben $3.000');
  });
});

describe('validarAccionForrajeria', () => {
  it('rechaza acciones de ganadería y sanea números y formas de pago', () => {
    expect(() =>
      validarAccionForrajeria({ accion: 'crear_ternero' }),
    ).toThrow();
    const a = validarAccionForrajeria({
      accion: 'crear_pedido',
      cliente: ' juan ',
      items: [{ producto: 'maiz', cantidad: '2,5' }, { cantidad: 3 }],
      forma_pago: 'fiado',
      id_establecimiento: 99,
    });
    expect(a).toEqual({
      accion: 'crear_pedido',
      cliente: 'juan',
      items: [{ producto: 'maiz', cantidad: 2.5 }],
      forma_pago: 'contado',
      forma_entrega: 'retiro',
    });
  });
});
