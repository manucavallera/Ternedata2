// Reporte de ventas de forrajería. Cuenta solo pedidos entregados.
// La fecha de la venta es la del último cambio de estado (cuando se entregó):
// un pedido entregado ya no cambia más.
// La ganancia es estimada: usa el costo que tiene cargado cada producto hoy.

const redondear = (n) => Math.round(n * 100) / 100;

// "2026-10-28" en hora local (la del navegador).
export const diaLocal = (fecha) => {
  const d = new Date(fecha);
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};

// Períodos rápidos: { desde, hasta } como "YYYY-MM-DD", ambos incluidos.
export const PERIODOS = {
  mes: "Este mes",
  mesPasado: "Mes pasado",
  dias30: "Últimos 30 días",
  anio: "Este año",
};

export const rangoPeriodo = (periodo, hoy = new Date()) => {
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  switch (periodo) {
    case "mesPasado":
      return { desde: diaLocal(new Date(y, m - 1, 1)), hasta: diaLocal(new Date(y, m, 0)) };
    case "dias30":
      return { desde: diaLocal(new Date(y, m, hoy.getDate() - 29)), hasta: diaLocal(hoy) };
    case "anio":
      return { desde: diaLocal(new Date(y, 0, 1)), hasta: diaLocal(hoy) };
    case "mes":
    default:
      return { desde: diaLocal(new Date(y, m, 1)), hasta: diaLocal(hoy) };
  }
};

const fechaVenta = (pedido) => pedido.fecha_actualizacion || pedido.fecha_creacion;

export const reporteVentas = (pedidos, productos, { desde, hasta }) => {
  const costo = new Map(productos.map((p) => [p.id_producto, Number(p.costo) || 0]));
  const ventas = pedidos.filter((p) => {
    if (p.estado !== "entregado") return false;
    const dia = diaLocal(fechaVenta(p));
    return (!desde || dia >= desde) && (!hasta || dia <= hasta);
  });

  const porProducto = new Map();
  const porCliente = new Map();
  const porDia = new Map();
  let total = 0;
  let contado = 0;
  let credito = 0;
  let ganancia = 0;
  let vendidoConCosto = 0;
  let lineasSinCosto = 0;

  for (const pedido of ventas) {
    const monto = Number(pedido.total) || 0;
    total += monto;
    if (pedido.forma_pago === "credito") credito += monto;
    else contado += monto;

    const dia = diaLocal(fechaVenta(pedido));
    porDia.set(dia, (porDia.get(dia) || 0) + monto);

    const idCliente = pedido.id_cliente;
    const cliente = porCliente.get(idCliente) || { id_cliente: idCliente, nombre: pedido.cliente?.nombre || `Cliente #${idCliente}`, pedidos: 0, total: 0 };
    cliente.pedidos += 1;
    cliente.total += monto;
    porCliente.set(idCliente, cliente);

    for (const item of pedido.items || []) {
      const cantidad = Number(item.cantidad) || 0;
      const subtotal = Number(item.subtotal) || 0;
      const costoUnitario = costo.get(item.id_producto) || 0;
      const fila = porProducto.get(item.id_producto) || {
        id_producto: item.id_producto,
        nombre: item.producto?.nombre || `Producto #${item.id_producto}`,
        unidad_venta: item.producto?.unidad_venta || "",
        cantidad: 0,
        total: 0,
        ganancia: 0,
        sinCosto: costoUnitario === 0,
      };
      fila.cantidad += cantidad;
      fila.total += subtotal;
      if (costoUnitario > 0) {
        const g = subtotal - cantidad * costoUnitario;
        fila.ganancia += g;
        ganancia += g;
        vendidoConCosto += subtotal;
      } else {
        lineasSinCosto += 1;
      }
      porProducto.set(item.id_producto, fila);
    }
  }

  const productosVendidos = [...porProducto.values()]
    .map((f) => ({ ...f, cantidad: Math.round(f.cantidad * 1000) / 1000, total: redondear(f.total), ganancia: f.sinCosto ? null : redondear(f.ganancia) }))
    .sort((a, b) => b.total - a.total);
  const clientes = [...porCliente.values()]
    .map((c) => ({ ...c, total: redondear(c.total) }))
    .sort((a, b) => b.total - a.total);
  const dias = [...porDia.entries()]
    .map(([dia, monto]) => ({ dia, total: redondear(monto) }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  return {
    pedidos: ventas.length,
    total: redondear(total),
    contado: redondear(contado),
    credito: redondear(credito),
    ticketPromedio: ventas.length ? redondear(total / ventas.length) : 0,
    ganancia: redondear(ganancia),
    // Margen sobre lo vendido de productos con costo cargado.
    margenPct: vendidoConCosto > 0 ? Math.round((ganancia / vendidoConCosto) * 1000) / 10 : null,
    productosSinCosto: productosVendidos.filter((f) => f.sinCosto).length,
    lineasSinCosto,
    productos: productosVendidos,
    clientes,
    dias,
  };
};

// Texto corto para mostrar el día: "28/10".
export const diaCorto = (dia) => {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
};
