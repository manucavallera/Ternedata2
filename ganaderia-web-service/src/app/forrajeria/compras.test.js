import test from "node:test";
import assert from "node:assert/strict";
import { armarItems, deudaConProveedores, leDebemos, totalCompra } from "./compras.js";

test("total de la compra con decimales y líneas vacías", () => {
  assert.equal(totalCompra([{ cantidad: "10", costo: "650.5" }, { cantidad: "", costo: "300" }]), 6505);
});

test("saldo negativo de un proveedor es lo que le debemos", () => {
  assert.equal(leDebemos(-1500), 1500);
  assert.equal(leDebemos("-99.999"), 100);
  assert.equal(leDebemos(200), 0);
  assert.equal(leDebemos(undefined), 0);
});

test("deuda total solo con proveedores de la lista", () => {
  const proveedores = [{ id_contacto: 1 }, { id_contacto: 2 }, { id_contacto: 3 }];
  const saldos = { 1: { saldo: -1000 }, 2: { saldo: 500 }, 9: { saldo: -7000 } };
  assert.equal(deudaConProveedores(proveedores, saldos), 1000);
});

test("arma los items y avisa errores", () => {
  assert.deepEqual(armarItems([{ id_producto: "2", cantidad: "3", costo: "100" }, { id_producto: "", cantidad: "" }]), {
    items: [{ id_producto: 2, cantidad: 3, costo_unitario: 100 }],
  });
  assert.ok(armarItems([{ id_producto: "", cantidad: "" }]).error);
  assert.ok(armarItems([{ id_producto: "2", cantidad: "1", costo: "1" }, { id_producto: "2", cantidad: "2", costo: "1" }]).error.includes("repetido"));
  assert.deepEqual(armarItems([{ id_producto: "2", cantidad: "1", costo: "" }]).items, [{ id_producto: 2, cantidad: 1, costo_unitario: 0 }]);
});
