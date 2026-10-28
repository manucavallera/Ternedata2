// Cuentas de compras a proveedores. El backend es quien valida y guarda.

const redondear = (n) => Math.round(n * 100) / 100;

// Total de una compra en armado: [{ cantidad, costo }].
export const totalCompra = (lineas) =>
  redondear(lineas.reduce((suma, l) => suma + (Number(l.cantidad) || 0) * (Number(l.costo) || 0), 0));

// En la cuenta de un proveedor el saldo es debe - haber: negativo = le debemos.
export const leDebemos = (saldo) => {
  const n = -(Number(saldo) || 0);
  return n > 0 ? redondear(n) : 0;
};

// Total que se les debe a los proveedores: { id_contacto: saldo } y la lista de proveedores.
export const deudaConProveedores = (proveedores, saldos) =>
  redondear(proveedores.reduce((suma, p) => suma + leDebemos(saldos[p.id_contacto]?.saldo), 0));

// Valida las líneas de la compra y arma los items para el backend. Devuelve { items } o { error }.
export const armarItems = (lineas) => {
  const items = lineas
    .filter((l) => l.id_producto && Number(l.cantidad) > 0)
    .map((l) => ({ id_producto: Number(l.id_producto), cantidad: Number(l.cantidad), costo_unitario: Number(l.costo) || 0 }));
  if (!items.length) return { error: "Agregá al menos un producto con cantidad." };
  if (new Set(items.map((i) => i.id_producto)).size !== items.length) {
    return { error: "Hay un producto repetido: juntá las cantidades en una sola línea." };
  }
  if (lineas.some((l) => l.id_producto && Number(l.cantidad) > 0 && Number(l.costo) < 0)) {
    return { error: "El costo no puede ser negativo." };
  }
  return { items };
};
