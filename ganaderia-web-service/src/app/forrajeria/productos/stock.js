// Cuentas de stock valorizado y margen. Usa costo y precio actuales del producto.

const redondear = (n) => Math.round(n * 100) / 100;

export const valorizar = (productos) => {
  const filas = productos
    .filter((p) => p.estado !== "inactivo")
    .map((p) => {
      const stock = Number(p.stock_actual) || 0;
      const costo = Number(p.costo) || 0;
      const precio = Number(p.precio) || 0;
      const margen = precio - costo;
      return {
        ...p,
        stock,
        costo,
        precio,
        sinCosto: costo === 0,
        margen: redondear(margen),
        // Margen sobre el precio de venta (lo que queda de cada peso que se cobra).
        margenPct: precio > 0 && costo > 0 ? Math.round((margen / precio) * 1000) / 10 : null,
        valorCosto: redondear(stock * costo),
        valorPrecio: redondear(stock * precio),
      };
    });
  const conCosto = filas.filter((f) => !f.sinCosto);
  return {
    filas,
    valorCosto: redondear(conCosto.reduce((s, f) => s + f.valorCosto, 0)),
    valorPrecio: redondear(filas.reduce((s, f) => s + f.valorPrecio, 0)),
    // Ganancia si se vende todo el stock, solo de productos con costo cargado.
    gananciaPotencial: redondear(conCosto.reduce((s, f) => s + f.valorPrecio - f.valorCosto, 0)),
    sinCosto: filas.filter((f) => f.sinCosto && f.stock > 0).length,
  };
};

export const TIPOS_MOVIMIENTO = {
  entrada: { etiqueta: "Entrada", color: "text-emerald-400" },
  salida: { etiqueta: "Salida", color: "text-amber-400" },
  ajuste: { etiqueta: "Ajuste", color: "text-sky-400" },
};
