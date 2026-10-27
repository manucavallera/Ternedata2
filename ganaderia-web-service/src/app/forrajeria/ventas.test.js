import test from "node:test";
import assert from "node:assert/strict";
import { coincideCliente, sePuedeCancelar, siguientePaso, totalPedido } from "./ventas.js";

test("el pedido avanza en el mismo orden que el backend", () => {
  assert.equal(siguientePaso("pendiente").estado, "confirmado");
  assert.equal(siguientePaso("listo").estado, "entregado");
  assert.equal(siguientePaso("entregado"), null);
  assert.equal(siguientePaso("cancelado"), null);
});

test("se puede cancelar solo antes de estar listo", () => {
  assert.equal(sePuedeCancelar("preparando"), true);
  assert.equal(sePuedeCancelar("listo"), false);
  assert.equal(sePuedeCancelar("entregado"), false);
});

test("total del pedido con decimales y líneas vacías", () => {
  assert.equal(totalPedido([{ cantidad: "2", precio: "1000.5" }, { cantidad: "", precio: "300" }]), 2001);
});

test("busca clientes sin importar tildes ni mayúsculas", () => {
  const cliente = { nombre: "José Pérez", documento: "20-12345678-9", zona: "Crespo" };
  assert.equal(coincideCliente(cliente, "jose"), true);
  assert.equal(coincideCliente(cliente, "crespo"), true);
  assert.equal(coincideCliente(cliente, "1234"), true);
  assert.equal(coincideCliente(cliente, "gomez"), false);
  assert.equal(coincideCliente(cliente, "  "), true);
});
