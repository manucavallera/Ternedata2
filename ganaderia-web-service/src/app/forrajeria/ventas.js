// Reglas de pedidos y cuenta corriente que usa la web de forrajería.
// El backend es quien valida; esto solo decide qué botones mostrar.

export const ESTADOS = [
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "confirmado", etiqueta: "Confirmado" },
  { valor: "preparando", etiqueta: "Preparando" },
  { valor: "listo", etiqueta: "Listo" },
  { valor: "entregado", etiqueta: "Entregado" },
  { valor: "cancelado", etiqueta: "Cancelado" },
];

export const etiquetaEstado = (valor) =>
  ESTADOS.find((e) => e.valor === valor)?.etiqueta || valor;

// Mismo orden que el backend (ventas.service.ts).
const SIGUIENTE = {
  pendiente: { estado: "confirmado", accion: "Confirmar" },
  confirmado: { estado: "preparando", accion: "Preparar" },
  preparando: { estado: "listo", accion: "Marcar listo" },
  listo: { estado: "entregado", accion: "Entregar" },
};

export const siguientePaso = (estado) => SIGUIENTE[estado] || null;

// Se puede cancelar hasta que está listo.
export const sePuedeCancelar = (estado) =>
  ["pendiente", "confirmado", "preparando"].includes(estado);

export const plata = (valor) =>
  `$${Number(valor || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Total de un pedido en armado: [{ cantidad, precio }].
export const totalPedido = (lineas) =>
  Math.round(
    lineas.reduce((suma, l) => suma + (Number(l.cantidad) || 0) * (Number(l.precio) || 0), 0) * 100
  ) / 100;

// Busca por nombre, documento o zona, sin importar mayúsculas ni tildes.
const normalizar = (texto) =>
  String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const coincideCliente = (cliente, busqueda) => {
  const q = normalizar(busqueda).trim();
  if (!q) return true;
  return [cliente.nombre, cliente.documento, cliente.zona].some((campo) => normalizar(campo).includes(q));
};
