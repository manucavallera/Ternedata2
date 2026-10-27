import test from "node:test";
import assert from "node:assert/strict";
import { coincideCliente, haceCuanto, ordenarDeudores, sePuedeCancelar, siguientePaso, textoRemito, totalPedido } from "./ventas.js";

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

test("antigüedad del último pago", () => {
  const ahora = "2026-10-27T12:00:00Z";
  assert.equal(haceCuanto(null, ahora), "nunca");
  assert.equal(haceCuanto("2026-10-27T08:00:00Z", ahora), "hoy");
  assert.equal(haceCuanto("2026-10-26T08:00:00Z", ahora), "ayer");
  assert.equal(haceCuanto("2026-10-07T12:00:00Z", ahora), "hace 20 días");
  assert.equal(haceCuanto("2026-06-01T12:00:00Z", ahora), "hace 4 meses");
});

test("deudores: solo saldo positivo, mayor deuda primero y a igual deuda el que no paga hace más", () => {
  const clientes = [1, 2, 3, 4].map((id) => ({ id_contacto: id }));
  const saldos = {
    1: { saldo: 500, ultimo_pago: "2026-10-20" },
    2: { saldo: 900, ultimo_pago: null },
    3: { saldo: -100, ultimo_pago: "2026-10-01" },
    4: { saldo: 500, ultimo_pago: "2026-09-01" },
  };
  assert.deepEqual(ordenarDeudores(clientes, saldos).map((c) => c.id_contacto), [2, 4, 1]);
});

test("texto del remito para WhatsApp", () => {
  const texto = textoRemito(
    {
      id_pedido: 27,
      cliente: { nombre: "Juan" },
      items: [{ cantidad: "3.000", subtotal: "3000", producto: { nombre: "Fardo de alfalfa", unidad_venta: "fardo" } }],
      total: "3000",
      forma_pago: "credito",
      forma_entrega: "reparto",
      direccion_entrega: "Ruta 12 km 5",
    },
    "Forrajería Don Pedro"
  );
  assert.equal(
    texto,
    "*Forrajería Don Pedro* - Pedido #27\nCliente: Juan\n\n- 3 fardo Fardo de alfalfa: $3.000\n\n*Total: $3.000*\nPago: cuenta corriente\nEntrega: reparto a Ruta 12 km 5"
  );
});
