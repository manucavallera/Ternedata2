import assert from "node:assert/strict";
import test from "node:test";

import {
  filterGlobalUsers,
  getAssignedEstablishments,
} from "./superAdminUsersViewModel.mjs";

const users = [
  { id: 1, rol: "admin", estado: "activo" },
  { id: 2, rol: "operario", estado: "inactivo" },
  { id: 3, rol: "operario", estado: "activo" },
];

test("filterGlobalUsers combina filtros de rol y estado", () => {
  assert.deepEqual(
    filterGlobalUsers(users, { role: "operario", status: "activo" }),
    [{ id: 3, rol: "operario", estado: "activo" }],
  );
  assert.deepEqual(
    filterGlobalUsers(users, { role: "todos", status: "inactivo" }),
    [{ id: 2, rol: "operario", estado: "inactivo" }],
  );
});

test("getAssignedEstablishments prioriza asignaciones y conserva fallback principal", () => {
  assert.deepEqual(
    getAssignedEstablishments({
      establecimientosAsignados: [
        { id: 8, nombre: "La Esperanza" },
        { id: 9, nombre: null },
      ],
      id_establecimiento: 8,
      establecimiento: "La Esperanza",
    }),
    [
      { id: 8, nombre: "La Esperanza" },
      { id: 9, nombre: "Establecimiento #9" },
    ],
  );

  assert.deepEqual(
    getAssignedEstablishments({
      establecimientosAsignados: [],
      id_establecimiento: 4,
      establecimiento: "El Ombú",
    }),
    [{ id: 4, nombre: "El Ombú" }],
  );
});
