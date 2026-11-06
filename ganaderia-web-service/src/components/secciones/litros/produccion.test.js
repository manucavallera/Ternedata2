import test from "node:test";
import assert from "node:assert/strict";
import { advertencias, fechaLarga, filtrarPeriodo, porAnio, porDia, porMes, textoMes } from "./produccion.js";

const reg = (fecha, vendido, terneros, vacas, extra = {}) => ({
  fecha: `${fecha}T00:00:00.000Z`, litros_vendido: String(vendido), litros_terneros: terneros, cantidad_vacas: vacas, ...extra,
});

test("fechas sin corrimiento de zona", () => {
  assert.equal(fechaLarga("2026-11-06T00:00:00.000Z"), "06/11/2026");
  assert.equal(fechaLarga(null), "");
  assert.equal(textoMes("2026-01"), "ene 26");
});

test("un punto por día, sumando registros repetidos", () => {
  const dias = porDia([reg("2026-10-02", 1000, 50, 50), reg("2026-10-01", 900, 40, 48), reg("2026-10-02", 100, 0, 52, { vacas_en_tratamiento: 3 })]);
  assert.deepEqual(dias.map((d) => d.fecha), ["2026-10-01", "2026-10-02"]);
  assert.deepEqual(dias[1], { fecha: "2026-10-02", fabrica: 1100, terneros: 50, vacas: 52, tratamiento: 3, total: 1150, por_vaca: 22.1 });
  assert.equal(porDia([reg("2026-10-01", 900, 0, null)])[0].por_vaca, null);
});

test("filtra por período", () => {
  const dias = porDia([reg("2026-05-06", 1, 0, 1), reg("2026-05-07", 1, 0, 1), reg("2026-11-06", 1, 0, 1)]);
  assert.deepEqual(filtrarPeriodo(dias, 6, "2026-11-06").map((d) => d.fecha), ["2026-05-07", "2026-11-06"]);
  assert.equal(filtrarPeriodo(dias, null, "2026-11-06").length, 3);
});

test("por mes y acumulado por año", () => {
  const meses = porMes(porDia([reg("2025-12-31", 100, 0, 10), reg("2026-01-01", 200, 0, 10), reg("2026-01-02", 300, 0, null), reg("2026-02-01", 50, 0, 5)]));
  assert.deepEqual(meses[1], { mes: "2026-01", litros: 500, fabrica: 500, dias: 2, promedio_diario: 250, por_vaca: 20 });
  const anios = porAnio(meses);
  assert.deepEqual(anios.map((a) => [a.anio, a.litros]), [["2026", 550], ["2025", 100]]);
  assert.deepEqual(anios[0].meses.map((m) => m.acumulado), [500, 550]);
});

test("avisos de carga", () => {
  const dias = porDia(Array.from({ length: 10 }, (_, i) => reg(`2026-10-${String(i + 1).padStart(2, "0")}`, 2000, 0, 100)));
  assert.deepEqual(advertencias({ fecha: "2026-10-20", total: 2100, vacas: 98 }, dias, 100), []);
  const malos = advertencias({ fecha: "2026-10-20", total: 1925, vacas: 876, tratamiento: 900 }, dias, 120);
  assert.equal(malos.length, 3);
  assert.match(malos[0], /876 vacas en ordeñe y el rodeo tiene 120/);
  assert.match(malos[1], /más vacas en tratamiento/);
  assert.match(malos[2], /2.2 L por vaca/);
  assert.match(advertencias({ fecha: "2026-10-20", total: 200, vacas: null }, dias)[0], /200 L en el día/);
  // Con pocos días no hay referencia.
  assert.deepEqual(advertencias({ fecha: "2026-10-20", total: 5, vacas: 100 }, dias.slice(0, 3)), []);
});

test("litros de los últimos 30 días", async () => {
  const { ultimos30 } = await import("./produccion.js");
  const dias = porDia([reg("2026-10-07", 999, 0, 10), reg("2026-10-08", 100, 10, 10), reg("2026-11-06", 200, 5.5, 10), reg("2026-11-07", 7, 0, 1)]);
  assert.deepEqual(ultimos30(dias, "2026-11-06"), { desde: "2026-10-08", dias: 2, litros: 315.5, fabrica: 300 });
  assert.deepEqual(ultimos30([], "2026-11-06"), { desde: "2026-10-08", dias: 0, litros: 0, fabrica: 0 });
});
