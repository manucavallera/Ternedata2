import test from "node:test";
import assert from "node:assert/strict";
import { PENDIENTES, caravanasAIds, detalleVaca, fechaCorta, filtrarVacas, porcentaje } from "./tambo.js";

const vacas = [
  { id_madre: 1, rp_madre: 325, nombre: "Pampa", estado: "En Tambo" },
  { id_madre: 2, rp_madre: 328, nombre: "Lola", estado: "Seca" },
  { id_madre: 3, rp_madre: null, nombre: "Sin caravana", estado: "En Tambo" },
];

test("fecha corta y porcentaje", () => {
  assert.equal(fechaCorta("2026-09-14"), "14/09/26");
  assert.equal(fechaCorta(null), "");
  assert.equal(porcentaje(9, 120), "7.5%");
  assert.equal(porcentaje(60, 120), "50%");
  assert.equal(porcentaje(1, 0), "0%");
});

test("caravanas separadas por coma o espacio, sin repetir y avisando las que no están", () => {
  assert.deepEqual(caravanasAIds("325, 328 325;999", vacas), { ids: [1, 2], noEncontradas: ["999"] });
  assert.deepEqual(caravanasAIds("", vacas), { ids: [], noEncontradas: [] });
});

test("filtra por caravana, nombre, categoría y pendiente", () => {
  assert.deepEqual(filtrarVacas(vacas, { busqueda: "32" }).map((v) => v.id_madre), [1, 2]);
  assert.deepEqual(filtrarVacas(vacas, { busqueda: "lola" }).map((v) => v.id_madre), [2]);
  assert.deepEqual(filtrarVacas(vacas, { categoria: "En Tambo" }).map((v) => v.id_madre), [1, 3]);
  assert.deepEqual(filtrarVacas(vacas, { soloIds: [3] }).map((v) => v.id_madre), [3]);
});

test("detalle de la tarjeta", () => {
  assert.equal(
    detalleVaca({ estado: "En Tambo", rodeo: { nombre: "Lote M" }, fecha_ultimo_parto: "2026-05-04", dias_en_leche: 177, estado_reproductivo: "inseminada", fecha_ultimo_servicio: "2026-10-01", numero_servicios: 2 }),
    "En Tambo · Lote M · Parió 04/05/26 (177 DEL) · Servicio 01/10/26 (2º)",
  );
  assert.equal(detalleVaca({ estado: "Seca", estado_reproductivo: "preñada", fecha_parto_probable: "2026-12-01" }), "Seca · Parto probable 01/12/26");
  assert.match(detalleVaca({ estado: "Seca", estado_reproductivo: "preñada" }), /sin calcular/);
});

test("texto de los días de cada pendiente", () => {
  const det = Object.fromEntries(PENDIENTES.map((p) => [p.clave, p.detalle]));
  assert.equal(det.a_tactar(40), "inseminada hace 40 días");
  assert.equal(det.a_secar(12), "pare en 12 días");
  assert.equal(det.parto_proximo(0), "pare hoy");
  assert.equal(det.parto_proximo(-2), "parto atrasado 2 días");
});
