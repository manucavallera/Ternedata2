import test from "node:test";
import assert from "node:assert/strict";
import {
  esContextoForrajeria,
  obtenerRutaInicio,
} from "./context.js";

test("reconoce una organización de forrajería", () => {
  assert.equal(
    esContextoForrajeria({ tipo_organizacion: "forrajeria" }),
    true
  );
  assert.equal(
    esContextoForrajeria({ tipo_organizacion: "ganaderia" }),
    false
  );
});

test("envía cada contexto a su inicio correspondiente", () => {
  assert.equal(
    obtenerRutaInicio({ tipo_organizacion: "forrajeria" }),
    "/forrajeria"
  );
  assert.equal(
    obtenerRutaInicio({ tipo_organizacion: "ganaderia" }),
    "/admin/dashboard"
  );
});
