import test from "node:test";
import assert from "node:assert/strict";
import { diaCorto, rangoPeriodo, reporteVentas } from "./reportes.js";

const productos = [
  { id_producto: 1, nombre: "Fardo", costo: "600" },
  { id_producto: 2, nombre: "Maíz", costo: "0" },
];

// Mediodía local para que el día no cambie por zona horaria.
const local = (dia) => new Date(`${dia}T12:00:00`).toISOString();

const pedido = (id, dia, extra = {}) => ({
  id_pedido: id,
  id_cliente: 10,
  cliente: { nombre: "José" },
  estado: "entregado",
  forma_pago: "contado",
  total: "2000",
  fecha_creacion: local(dia),
  fecha_actualizacion: local(dia),
  items: [{ id_producto: 1, cantidad: "2", subtotal: "2000", producto: { nombre: "Fardo", unidad_venta: "fardo" } }],
  ...extra,
});

test("cuenta solo pedidos entregados dentro del rango", () => {
  const r = reporteVentas(
    [
      pedido(1, "2026-10-05"),
      pedido(2, "2026-10-20", { estado: "listo" }),
      pedido(3, "2026-10-21", { estado: "cancelado" }),
      pedido(4, "2026-09-30"),
      pedido(5, "2026-10-31"),
    ],
    productos,
    { desde: "2026-10-01", hasta: "2026-10-31" }
  );
  assert.equal(r.pedidos, 2);
  assert.equal(r.total, 4000);
  assert.equal(r.ticketPromedio, 2000);
  assert.deepEqual(r.dias.map((d) => d.dia), ["2026-10-05", "2026-10-31"]);
});

test("separa contado y cuenta corriente", () => {
  const r = reporteVentas(
    [pedido(1, "2026-10-05"), pedido(2, "2026-10-06", { forma_pago: "credito", total: "500" })],
    productos,
    { desde: "2026-10-01", hasta: "2026-10-31" }
  );
  assert.equal(r.contado, 2000);
  assert.equal(r.credito, 500);
});

test("ganancia estimada solo de productos con costo", () => {
  const r = reporteVentas(
    [
      pedido(1, "2026-10-05", {
        total: "3500",
        items: [
          { id_producto: 1, cantidad: "2", subtotal: "2000" },
          { id_producto: 2, cantidad: "3", subtotal: "1500" },
        ],
      }),
    ],
    productos,
    { desde: "2026-10-01", hasta: "2026-10-31" }
  );
  // Fardo: 2000 - 2 x 600 = 800. Maíz sin costo no suma.
  assert.equal(r.ganancia, 800);
  assert.equal(r.margenPct, 40);
  assert.equal(r.productosSinCosto, 1);
  assert.equal(r.productos.find((p) => p.id_producto === 2).ganancia, null);
});

test("agrupa por producto y cliente, ordenado por lo vendido", () => {
  const r = reporteVentas(
    [
      pedido(1, "2026-10-05"),
      pedido(2, "2026-10-06", { id_cliente: 11, cliente: { nombre: "Ana" }, total: "6000", items: [{ id_producto: 1, cantidad: "6", subtotal: "6000" }] }),
    ],
    productos,
    { desde: "2026-10-01", hasta: "2026-10-31" }
  );
  assert.equal(r.productos.length, 1);
  assert.equal(r.productos[0].cantidad, 8);
  assert.equal(r.productos[0].total, 8000);
  assert.deepEqual(r.clientes.map((c) => c.nombre), ["Ana", "José"]);
});

test("sin ventas no divide por cero", () => {
  const r = reporteVentas([], productos, { desde: "2026-10-01", hasta: "2026-10-31" });
  assert.equal(r.ticketPromedio, 0);
  assert.equal(r.margenPct, null);
});

test("períodos rápidos", () => {
  const hoy = new Date(2026, 9, 28);
  assert.deepEqual(rangoPeriodo("mes", hoy), { desde: "2026-10-01", hasta: "2026-10-28" });
  assert.deepEqual(rangoPeriodo("mesPasado", hoy), { desde: "2026-09-01", hasta: "2026-09-30" });
  assert.deepEqual(rangoPeriodo("dias30", hoy), { desde: "2026-09-29", hasta: "2026-10-28" });
  assert.deepEqual(rangoPeriodo("anio", hoy), { desde: "2026-01-01", hasta: "2026-10-28" });
  assert.deepEqual(rangoPeriodo("mesPasado", new Date(2026, 0, 15)), { desde: "2025-12-01", hasta: "2025-12-31" });
});

test("día corto", () => {
  assert.equal(diaCorto("2026-10-05"), "05/10");
});
