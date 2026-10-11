import test from "node:test";
import assert from "node:assert/strict";
import { crearMovimientoStock } from "./movimiento.js";

test("prepara una entrada de stock con cantidad numérica", () => {
  assert.deepEqual(crearMovimientoStock("entrada", "12.5", "Compra proveedor"), {
    tipo: "entrada",
    cantidad: 12.5,
    motivo: "Compra proveedor",
  });
});

test("omite un motivo vacío", () => {
  assert.deepEqual(crearMovimientoStock("salida", "2", "  "), {
    tipo: "salida",
    cantidad: 2,
  });
});
