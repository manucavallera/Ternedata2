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

test("texto del último control", async () => {
  const { textoControl } = await import("./tambo.js");
  assert.equal(
    textoControl({ fecha: "2026-09-26", litros_manana: 14.5, litros_tarde: 12, total: 26.5 }),
    "Control 26/09/26: 14,5 + 12 = 26,5 L"
  );
  assert.equal(textoControl({ fecha: "2026-09-26", litros_manana: 10, litros_tarde: null, total: 10 }), "Control 26/09/26: 10 + - = 10 L");
  assert.equal(textoControl(null), "");
});

test("leer litros de la planilla", async () => {
  const { leerLitros } = await import("./tambo.js");
  assert.deepEqual(leerLitros(""), { valor: null });
  assert.deepEqual(leerLitros(" 14,5 "), { valor: 14.5 });
  assert.deepEqual(leerLitros("12"), { valor: 12 });
  assert.ok(leerLitros("12,55").error);
  assert.ok(leerLitros("-3").error);
  assert.ok(leerLitros("abc").error);
  assert.ok(leerLitros("81").error);
});

test("planilla: vacas en tambo más las que ya tienen control, ordenadas por caravana", async () => {
  const { armarPlanilla } = await import("./tambo.js");
  const controles = [{ id_madre: 2, litros_manana: 8.5, litros_tarde: null }];
  const filas = armarPlanilla(vacas, controles);
  assert.deepEqual(filas.map((f) => f.id_madre), [1, 2, 3]);
  assert.equal(filas[1].manana, "8,5");
  assert.equal(filas[1].tarde, "");
  assert.equal(filas[1].guardada, true);
  assert.deepEqual(armarPlanilla(vacas, []).map((f) => f.id_madre), [1, 3]);
  assert.equal(armarPlanilla(vacas, [], { todas: true }).length, 3);
});

test("planilla a cuerpo: errores, vacías que se borran y resumen", async () => {
  const { planillaACuerpo } = await import("./tambo.js");
  const filas = [
    { id_madre: 1, rp_madre: 325, manana: "14,5", tarde: "12", guardada: false },
    { id_madre: 2, rp_madre: 328, manana: "", tarde: "", guardada: true },
    { id_madre: 3, rp_madre: 330, manana: "", tarde: "", guardada: false },
    { id_madre: 4, rp_madre: 331, manana: "10", tarde: "", guardada: false },
  ];
  const { errores, vacas: cuerpo, resumen } = planillaACuerpo(filas);
  assert.deepEqual(errores, []);
  assert.deepEqual(cuerpo, [
    { id_madre: 1, litros_manana: 14.5, litros_tarde: 12 },
    { id_madre: 2, litros_manana: null, litros_tarde: null },
    { id_madre: 4, litros_manana: 10, litros_tarde: null },
  ]);
  assert.deepEqual(resumen, { vacas: 2, litros: 36.5, promedio: 18.3 });
  assert.equal(planillaACuerpo([{ id_madre: 1, rp_madre: 325, manana: "x", tarde: "" }]).errores[0], "325: Usá números con un decimal como máximo");
});
