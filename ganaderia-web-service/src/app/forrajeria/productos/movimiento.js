export function crearMovimientoStock(tipo, cantidad, motivo) {
  return {
    tipo,
    cantidad: Number(cantidad),
    ...(motivo?.trim() ? { motivo: motivo.trim() } : {}),
  };
}
