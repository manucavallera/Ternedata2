import test from "node:test";
import assert from "node:assert/strict";
import { valorizar } from "./stock.js";

test("valoriza el stock a costo y a precio, con margen por producto", () => {
  const r = valorizar([
    { id_producto: 1, stock_actual: "10.000", costo: "700", precio: "1000" },
    { id_producto: 2, stock_actual: "4", costo: "0", precio: "500" },
    { id_producto: 3, stock_actual: "99", costo: "1", precio: "2", estado: "inactivo" },
  ]);
  assert.equal(r.filas.length, 2);
  assert.equal(r.filas[0].margen, 300);
  assert.equal(r.filas[0].margenPct, 30);
  assert.equal(r.filas[1].margenPct, null);
  assert.equal(r.valorCosto, 7000);
  assert.equal(r.valorPrecio, 12000);
  // El producto sin costo no suma ganancia (no se sabe cuánto costó).
  assert.equal(r.gananciaPotencial, 3000);
  assert.equal(r.sinCosto, 1);
});
