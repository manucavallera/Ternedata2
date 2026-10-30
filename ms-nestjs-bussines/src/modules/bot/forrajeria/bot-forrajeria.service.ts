import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolEstablecimientoService } from '../../auth/rol-establecimiento.service';
import { UserEntity } from '../../users/entity/users.entity';
import { ProductoForrajeria } from '../../forrajeria/catalogo/entities/producto.entity';
import {
  ContactoForrajeria,
  TipoContacto,
} from '../../forrajeria/contactos/entities/contacto.entity';
import { ContactosService } from '../../forrajeria/contactos/contactos.service';
import { CuentasService } from '../../forrajeria/cuentas/cuentas.service';
import { InventarioService } from '../../forrajeria/inventario/inventario.service';
import { TipoMovimientoStock } from '../../forrajeria/inventario/entities/movimiento-stock.entity';
import { VentasService } from '../../forrajeria/ventas/ventas.service';
import {
  FormaEntrega,
  FormaPago,
  PedidoEstado,
} from '../../forrajeria/ventas/entities/pedido.entity';
import { buscarPorNombre, Coincidencia, normalizar } from './coincidir';

export interface ContextoForrajeria {
  user: UserEntity;
  idEstablecimiento: number;
}

// Lo que devuelve cada acción: el texto para WhatsApp y, si hay que confirmar algo, la pregunta pendiente.
export interface RespuestaForrajeria {
  mensaje: string;
  pendiente?: Record<string, any>;
}

const plata = (valor: number) =>
  `$${Number(valor || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
const cant = (valor: number) =>
  Number(valor || 0).toLocaleString('es-AR', { maximumFractionDigits: 3 });
const PLURAL: Record<string, string> = {
  fardo: 'fardos',
  rollo: 'rollos',
  bolsa: 'bolsas',
  tonelada: 'toneladas',
  unidad: 'unidades',
};
const unidades = (cantidad: number, unidad: string) =>
  Number(cantidad) === 1 ? unidad : PLURAL[unidad] || unidad;
// "5 fardos de Fardo de alfalfa" se lee mal: si el nombre ya dice la unidad, va "5 × Fardo de alfalfa".
const cuanto = (
  cantidad: number,
  p: { nombre: string; unidad_venta: string },
) =>
  normalizar(p.nombre).startsWith(p.unidad_venta)
    ? `${cant(cantidad)} × ${p.nombre}`
    : `${cant(cantidad)} ${unidades(cantidad, p.unidad_venta)} de ${p.nombre}`;

// Orden de los pasos de un pedido (mismo que el backend).
const PASOS = [
  PedidoEstado.PENDIENTE,
  PedidoEstado.CONFIRMADO,
  PedidoEstado.PREPARANDO,
  PedidoEstado.LISTO,
  PedidoEstado.ENTREGADO,
];
const EN_CURSO = PASOS.slice(0, 4);
const ETIQUETA: Record<string, string> = {
  pendiente: 'pendiente',
  confirmado: 'confirmado',
  preparando: 'preparando',
  listo: 'listo',
  entregado: 'entregado',
  cancelado: 'cancelado',
};

export const AYUDA_FORRAJERIA =
  'Puedo tomar pedidos ("Juan quiere 10 fardos de alfalfa, a cuenta"), decirte precio y stock ("¿cuánto sale el maíz?"), ' +
  'anotar mercadería que entra ("llegaron 50 rollos"), mostrar pedidos pendientes, avanzar un pedido ("entregué el 15"), ' +
  'decirte quién te debe y anotar pagos ("Pérez pagó 20000").';

@Injectable()
export class BotForrajeriaService {
  constructor(
    private readonly rolEstablecimiento: RolEstablecimientoService,
    private readonly contactosService: ContactosService,
    private readonly cuentasService: CuentasService,
    private readonly inventarioService: InventarioService,
    private readonly ventasService: VentasService,
    @InjectRepository(ProductoForrajeria)
    private readonly productoRepo: Repository<ProductoForrajeria>,
  ) {}

  private async esDueno(ctx: ContextoForrajeria): Promise<boolean> {
    const { user } = ctx;
    const rol = await this.rolEstablecimiento.rolEn(
      {
        userId: user.id,
        rol: user.rol,
        id_establecimiento: user.id_establecimiento,
      },
      ctx.idEstablecimiento,
    );
    return rol === 'admin';
  }

  private async productosActivos(idEstablecimiento: number) {
    const todos = await this.productoRepo.find({
      where: { id_establecimiento: idEstablecimiento },
      order: { nombre: 'ASC' },
    });
    return todos.filter((p) => p.estado !== 'inactivo');
  }

  private async clientesActivos(idEstablecimiento: number) {
    const todos = await this.contactosService.findContactos(
      idEstablecimiento,
      TipoContacto.CLIENTE,
    );
    return todos.filter((c) => c.estado !== 'inactivo');
  }

  // Texto para cuando un nombre no se encuentra o es ambiguo. null si se encontró uno solo.
  private problemaNombre<T extends { nombre: string }>(
    r: Coincidencia<T>,
    que: string,
    buscado: string,
  ): string | null {
    if (r.tipo === 'unico') return null;
    if (r.tipo === 'varios') {
      return `🤔 Hay varios ${que} que coinciden con "${buscado}":\n${r.items
        .slice(0, 6)
        .map((x) => `• ${x.nombre}`)
        .join('\n')}\nDecime cuál.`;
    }
    return que === 'clientes'
      ? `🤔 No encontré el cliente "${buscado}". Si es nuevo, escribime "cliente nuevo ${buscado}".`
      : `🤔 No encontré el producto "${buscado}". Fijate el nombre o cargalo desde la app.`;
  }

  async ejecutar(
    accion: Record<string, any>,
    ctx: ContextoForrajeria,
  ): Promise<RespuestaForrajeria> {
    switch (accion.accion) {
      case 'consultar_producto':
        return { mensaje: await this.consultarProducto(accion, ctx) };
      case 'consultar_bajo_stock':
        return { mensaje: await this.consultarBajoStock(ctx) };
      case 'entrada_stock':
        return { mensaje: await this.entradaStock(accion, ctx) };
      case 'crear_cliente':
        return { mensaje: await this.crearCliente(accion, ctx) };
      case 'crear_pedido':
        return { mensaje: await this.crearPedido(accion, ctx) };
      case 'consultar_pedidos':
        return { mensaje: await this.consultarPedidos(ctx) };
      case 'avanzar_pedido':
        return { mensaje: await this.avanzarPedido(accion, ctx) };
      case 'consultar_deuda':
        return { mensaje: await this.consultarDeuda(accion, ctx) };
      case 'registrar_pago':
        return this.pedirConfirmacionPago(accion, ctx);
      case 'consultar_ventas':
        return { mensaje: await this.consultarVentas(accion, ctx) };
      default:
        return {
          mensaje: `🤔 Eso no lo sé hacer todavía. ${AYUDA_FORRAJERIA}`,
        };
    }
  }

  private async consultarProducto(accion: any, ctx: ContextoForrajeria) {
    if (!accion.producto)
      return '🤔 ¿De qué producto? Por ejemplo: "¿cuánto sale el fardo de alfalfa?"';
    const r = buscarPorNombre(
      await this.productosActivos(ctx.idEstablecimiento),
      accion.producto,
    );
    const lista =
      r.tipo === 'unico'
        ? [r.item]
        : r.tipo === 'varios'
          ? r.items.slice(0, 6)
          : [];
    if (!lista.length)
      return this.problemaNombre(r, 'productos', accion.producto)!;
    return lista
      .map(
        (p) =>
          `📦 *${p.nombre}*: ${Number(p.precio) > 0 ? `${plata(p.precio)} / ${p.unidad_venta}` : 'sin precio cargado'} · quedan ${cant(p.stock_actual)} ${unidades(p.stock_actual, p.unidad_venta)}`,
      )
      .join('\n');
  }

  private async consultarBajoStock(ctx: ContextoForrajeria) {
    const bajos = await this.inventarioService.findBajoStock(
      ctx.idEstablecimiento,
    );
    if (!bajos.length) return '✅ No hay productos por debajo del mínimo.';
    return `⚠️ Para reponer:\n${bajos
      .slice(0, 15)
      .map(
        (p) =>
          `• ${p.nombre}: quedan ${cant(p.stock_actual)} (mínimo ${cant(p.stock_minimo)})`,
      )
      .join('\n')}`;
  }

  private async entradaStock(accion: any, ctx: ContextoForrajeria) {
    if (!(accion.cantidad > 0))
      return '🤔 ¿Cuánto entró? Por ejemplo: "llegaron 50 rollos".';
    const r = buscarPorNombre(
      await this.productosActivos(ctx.idEstablecimiento),
      accion.producto,
    );
    const problema = this.problemaNombre(r, 'productos', accion.producto);
    if (problema || r.tipo !== 'unico') return problema!;
    const { stock_nuevo } = await this.inventarioService.registrarMovimiento(
      ctx.idEstablecimiento,
      r.item.id_producto,
      {
        tipo: TipoMovimientoStock.ENTRADA,
        cantidad: accion.cantidad,
        motivo: accion.motivo || `Entrada por WhatsApp (${ctx.user.name})`,
      } as any,
    );
    return `✅ Entraron ${cuanto(accion.cantidad, r.item)}. Ahora hay ${cant(stock_nuevo)}.`;
  }

  private async crearCliente(accion: any, ctx: ContextoForrajeria) {
    const nombre = (accion.nombre || '').slice(0, 150);
    if (!nombre)
      return '🤔 ¿Cómo se llama el cliente? Por ejemplo: "cliente nuevo Juan Pérez, zona Crespo".';
    const existe = buscarPorNombre(
      await this.clientesActivos(ctx.idEstablecimiento),
      nombre,
    );
    if (
      existe.tipo === 'unico' &&
      normalizar(existe.item.nombre) === normalizar(nombre)
    ) {
      return `👍 ${existe.item.nombre} ya estaba cargado como cliente.`;
    }
    const datos: any = { tipo: TipoContacto.CLIENTE, nombre };
    if (accion.telefono) datos.telefono = accion.telefono.slice(0, 50);
    if (accion.zona) datos.zona = accion.zona.slice(0, 100);
    if (accion.direccion) datos.direccion = accion.direccion.slice(0, 200);
    await this.contactosService.createContacto(ctx.idEstablecimiento, datos);
    return `✅ Cargué a *${nombre}* como cliente.${datos.zona ? ` Zona: ${datos.zona}.` : ''}`;
  }

  private async crearPedido(accion: any, ctx: ContextoForrajeria) {
    if (!accion.cliente) return '🤔 ¿Para qué cliente es el pedido?';
    if (!accion.items?.length)
      return '🤔 ¿Qué productos lleva? Por ejemplo: "Juan quiere 10 fardos de alfalfa".';
    const rc = buscarPorNombre(
      await this.clientesActivos(ctx.idEstablecimiento),
      accion.cliente,
    );
    const problemaCliente = this.problemaNombre(rc, 'clientes', accion.cliente);
    if (problemaCliente || rc.tipo !== 'unico') return problemaCliente!;
    const cliente: ContactoForrajeria = rc.item;

    const productos = await this.productosActivos(ctx.idEstablecimiento);
    const items: { id_producto: number; cantidad: number }[] = [];
    for (const linea of accion.items) {
      if (!(linea.cantidad > 0)) return `🤔 ¿Cuánto ${linea.producto} lleva?`;
      const rp = buscarPorNombre(productos, linea.producto);
      const problema = this.problemaNombre(rp, 'productos', linea.producto);
      if (problema || rp.tipo !== 'unico') return problema!;
      const repetido = items.find((i) => i.id_producto === rp.item.id_producto);
      if (repetido) repetido.cantidad += linea.cantidad;
      else
        items.push({
          id_producto: rp.item.id_producto,
          cantidad: linea.cantidad,
        });
    }

    const reparto = accion.forma_entrega === 'reparto';
    if (reparto && !cliente.direccion) {
      return `🤔 ${cliente.nombre} no tiene dirección cargada para el reparto. Cargala en su ficha de la app o pedilo como retiro.`;
    }
    try {
      const pedido = await this.ventasService.createPedido(
        ctx.idEstablecimiento,
        {
          id_cliente: cliente.id_contacto,
          items,
          forma_pago:
            accion.forma_pago === 'credito'
              ? FormaPago.CREDITO
              : FormaPago.CONTADO,
          forma_entrega: reparto ? FormaEntrega.REPARTO : FormaEntrega.RETIRO,
          ...(reparto
            ? {
                direccion_entrega: cliente.direccion,
                ...(cliente.zona ? { zona_entrega: cliente.zona } : {}),
              }
            : {}),
          ...(accion.observaciones
            ? { observaciones: accion.observaciones }
            : {}),
        },
      );
      const porId = new Map(productos.map((p) => [p.id_producto, p]));
      const detalle = pedido.items
        .map(
          (i: any) =>
            `• ${porId.has(i.id_producto) ? cuanto(i.cantidad, porId.get(i.id_producto)!) : cant(i.cantidad)}: ${plata(i.subtotal)}`,
        )
        .join('\n');
      const sinPrecio = pedido.items.some(
        (i: any) => Number(i.precio_unitario) === 0,
      )
        ? '\n⚠️ Hay productos sin precio: salen a $0. Cargá el precio en la app.'
        : '';
      return (
        `✅ Pedido #${pedido.id_pedido} para *${cliente.nombre}*\n${detalle}\n*Total: ${plata(pedido.total)}*\n` +
        `${pedido.forma_pago === FormaPago.CREDITO ? 'Cuenta corriente' : 'Contado'} · ${reparto ? 'Reparto' : 'Retira'}\n` +
        `Queda pendiente. Escribime "confirmá el ${pedido.id_pedido}" para descontar el stock.${sinPrecio}`
      );
    } catch (error: any) {
      const m = error?.response?.message || error?.message || '';
      if (typeof m === 'string' && m.startsWith('Supera el límite')) {
        return `⚠️ ${m} No lo cargué. Si querés pasarlo igual, el dueño lo puede hacer desde la app.`;
      }
      throw error;
    }
  }

  private async consultarPedidos(ctx: ContextoForrajeria) {
    const pedidos = (
      await this.ventasService.findPedidos(ctx.idEstablecimiento)
    ).filter((p) => EN_CURSO.includes(p.estado));
    if (!pedidos.length) return '✅ No hay pedidos pendientes de entregar.';
    const lineas = pedidos
      .slice(0, 10)
      .map(
        (p) =>
          `#${p.id_pedido} ${p.cliente?.nombre || 'Cliente'} · ${ETIQUETA[p.estado]} · ${plata(p.total)}\n   ${p.items.map((i: any) => `${cant(i.cantidad)} ${i.producto?.nombre || 'producto'}`).join(', ')}`,
      );
    const resto =
      pedidos.length > 10
        ? `\n… y ${pedidos.length - 10} más (miralos en la app).`
        : '';
    return `🧾 Pedidos en curso (${pedidos.length}):\n${lineas.join('\n')}${resto}`;
  }

  // Lleva el pedido hasta el estado pedido pasando por los intermedios ("entregué el 15" desde pendiente).
  private async avanzarPedido(accion: any, ctx: ContextoForrajeria) {
    const destino = accion.estado as PedidoEstado;
    if (
      !Object.values(PedidoEstado).includes(destino) ||
      destino === PedidoEstado.PENDIENTE
    ) {
      return '🤔 ¿Qué hago con el pedido? Puedo confirmarlo, prepararlo, marcarlo listo, entregarlo o cancelarlo.';
    }
    let id = accion.id_pedido;
    // "Entregué lo de Juan": vale si Juan tiene un solo pedido en curso.
    if (!(id > 0) && accion.cliente) {
      const rc = buscarPorNombre(
        await this.clientesActivos(ctx.idEstablecimiento),
        accion.cliente,
      );
      const problema = this.problemaNombre(rc, 'clientes', accion.cliente);
      if (problema || rc.tipo !== 'unico') return problema!;
      const abiertos = (
        await this.ventasService.findPedidos(ctx.idEstablecimiento, {
          id_cliente: rc.item.id_contacto,
        })
      ).filter((p) => EN_CURSO.includes(p.estado));
      if (!abiertos.length)
        return `🤔 ${rc.item.nombre} no tiene pedidos en curso.`;
      if (abiertos.length > 1) {
        return `🤔 ${rc.item.nombre} tiene ${abiertos.length} pedidos en curso: ${abiertos.map((p) => `#${p.id_pedido} (${plata(p.total)})`).join(', ')}. Decime el número.`;
      }
      id = abiertos[0].id_pedido;
    }
    if (!(id > 0))
      return '🤔 ¿Qué número de pedido? Por ejemplo: "entregué el 15".';
    const [pedido] = await this.ventasService.findPedidos(
      ctx.idEstablecimiento,
      { id_pedido: id },
    );
    if (!pedido) return `🤔 No encontré el pedido #${id}.`;

    if (destino === PedidoEstado.CANCELADO) {
      if (!(await this.esDueno(ctx)))
        return '🔒 Cancelar un pedido lo hace el dueño.';
      if (
        ![
          PedidoEstado.PENDIENTE,
          PedidoEstado.CONFIRMADO,
          PedidoEstado.PREPARANDO,
        ].includes(pedido.estado)
      ) {
        return `🤔 El pedido #${id} está ${ETIQUETA[pedido.estado]}: ya no se puede cancelar.`;
      }
      await this.ventasService.cambiarEstado(
        ctx.idEstablecimiento,
        id,
        PedidoEstado.CANCELADO,
      );
      const devuelve =
        pedido.estado !== PedidoEstado.PENDIENTE
          ? ' El stock volvió al galpón.'
          : '';
      return `🗑️ Cancelé el pedido #${id} de ${pedido.cliente?.nombre || 'el cliente'}.${devuelve}`;
    }

    const desde = PASOS.indexOf(pedido.estado);
    const hasta = PASOS.indexOf(destino);
    if (desde < 0)
      return `🤔 El pedido #${id} está ${ETIQUETA[pedido.estado]}: no se puede cambiar.`;
    if (hasta <= desde)
      return `👍 El pedido #${id} ya está ${ETIQUETA[pedido.estado]}.`;
    try {
      for (const paso of PASOS.slice(desde + 1, hasta + 1)) {
        await this.ventasService.cambiarEstado(ctx.idEstablecimiento, id, paso);
      }
    } catch (error: any) {
      if (error?.message === 'Stock insuficiente para confirmar el pedido') {
        return `⚠️ No hay stock suficiente para confirmar el pedido #${id}. Anotá la mercadería que entró y probá de nuevo.`;
      }
      throw error;
    }
    const cuenta =
      destino === PedidoEstado.ENTREGADO &&
      pedido.forma_pago === FormaPago.CREDITO
        ? ` Se cargaron ${plata(pedido.total)} en la cuenta de ${pedido.cliente?.nombre || 'el cliente'}.`
        : '';
    return `✅ Pedido #${id} ${ETIQUETA[destino]}.${cuenta}`;
  }

  private async consultarDeuda(accion: any, ctx: ContextoForrajeria) {
    const clientes = await this.contactosService.findContactos(
      ctx.idEstablecimiento,
      TipoContacto.CLIENTE,
    );
    const saldos = new Map(
      (await this.cuentasService.getSaldos(ctx.idEstablecimiento)).map((s) => [
        s.id_contacto,
        s.saldo,
      ]),
    );
    if (accion.cliente) {
      const r = buscarPorNombre(clientes, accion.cliente);
      const problema = this.problemaNombre(r, 'clientes', accion.cliente);
      if (problema || r.tipo !== 'unico') return problema!;
      const saldo = saldos.get(r.item.id_contacto) || 0;
      if (saldo > 0) return `💰 ${r.item.nombre} debe ${plata(saldo)}.`;
      if (saldo < 0)
        return `💰 ${r.item.nombre} tiene ${plata(-saldo)} a favor.`;
      return `✅ ${r.item.nombre} está al día.`;
    }
    const deudores = clientes
      .map((c) => ({ c, saldo: saldos.get(c.id_contacto) || 0 }))
      .filter((x) => x.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo);
    if (!deudores.length) return '✅ Nadie te debe plata.';
    const total = deudores.reduce((s, x) => s + x.saldo, 0);
    return `💰 Te deben ${plata(total)}:\n${deudores
      .slice(0, 10)
      .map((x) => `• ${x.c.nombre}: ${plata(x.saldo)}`)
      .join('\n')}`;
  }

  // Un pago mueve plata: se pide un "sí" antes de anotarlo.
  private async pedirConfirmacionPago(
    accion: any,
    ctx: ContextoForrajeria,
  ): Promise<RespuestaForrajeria> {
    if (!(await this.esDueno(ctx)))
      return { mensaje: '🔒 Los pagos los anota el dueño.' };
    if (!(accion.monto > 0))
      return {
        mensaje: '🤔 ¿De cuánto fue el pago? Por ejemplo: "Pérez pagó 20000".',
      };
    const r = buscarPorNombre(
      await this.clientesActivos(ctx.idEstablecimiento),
      accion.cliente,
    );
    const problema = this.problemaNombre(r, 'clientes', accion.cliente || '');
    if (problema || r.tipo !== 'unico') return { mensaje: problema! };
    return {
      mensaje: `💵 ¿Anoto un pago de *${plata(accion.monto)}* de *${r.item.nombre}*? Respondé *sí* o *no*.`,
      pendiente: {
        tipo: 'confirmar_pago',
        id_contacto: r.item.id_contacto,
        nombre: r.item.nombre,
        monto: accion.monto,
        concepto: accion.concepto || '',
        idEstablecimiento: ctx.idEstablecimiento,
      },
    };
  }

  async confirmarPago(
    pendiente: any,
    ctx: ContextoForrajeria,
  ): Promise<string> {
    // Se vuelve a mirar el rol: pudo cambiar entre la pregunta y el "sí".
    if (!(await this.esDueno(ctx))) return '🔒 Los pagos los anota el dueño.';
    await this.cuentasService.registrarPago(
      ctx.idEstablecimiento,
      pendiente.id_contacto,
      {
        monto: pendiente.monto,
        concepto: pendiente.concepto || `Pago por WhatsApp (${ctx.user.name})`,
      },
    );
    const cuenta = await this.cuentasService.getCuenta(
      ctx.idEstablecimiento,
      pendiente.id_contacto,
    );
    const saldo = cuenta.saldo;
    const estado =
      saldo > 0
        ? `Ahora debe ${plata(saldo)}.`
        : saldo < 0
          ? `Le quedan ${plata(-saldo)} a favor.`
          : 'Quedó al día.';
    return `✅ Anoté el pago de ${plata(pendiente.monto)} de ${pendiente.nombre}. ${estado}`;
  }

  private async consultarVentas(accion: any, ctx: ContextoForrajeria) {
    if (!(await this.esDueno(ctx))) return '🔒 Las ventas las ve el dueño.';
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    if (accion.periodo === 'semana') desde.setDate(desde.getDate() - 6);
    if (accion.periodo === 'mes') desde.setDate(1);
    // Igual que los reportes de la web: cuenta lo entregado, por la fecha en que se entregó.
    const entregados = (
      await this.ventasService.findPedidos(ctx.idEstablecimiento, {
        estado: PedidoEstado.ENTREGADO,
      })
    ).filter((p) => new Date(p.fecha_actualizacion) >= desde);
    const titulo =
      accion.periodo === 'semana'
        ? 'los últimos 7 días'
        : accion.periodo === 'mes'
          ? 'este mes'
          : 'hoy';
    if (!entregados.length) return `📊 No hay ventas entregadas ${titulo}.`;
    const total = entregados.reduce((s, p) => s + Number(p.total || 0), 0);
    const credito = entregados
      .filter((p) => p.forma_pago === FormaPago.CREDITO)
      .reduce((s, p) => s + Number(p.total || 0), 0);
    return (
      `📊 Ventas de ${titulo}: *${plata(total)}* en ${entregados.length} pedido${entregados.length === 1 ? '' : 's'}.` +
      (credito > 0 ? `\nA cuenta corriente: ${plata(credito)}.` : '')
    );
  }
}
