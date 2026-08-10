import assert from "node:assert/strict";
import test from "node:test";

import { createSuperAdminUsersClient } from "./superAdminUsersClient.mjs";

test("listGlobalUsers usa la ruta global exacta y normaliza la respuesta", async () => {
  const calls = [];
  const api = {
    get: async (...args) => {
      calls.push(args);
      return { data: [{ id: 7, email: "user@example.com" }], status: 200 };
    },
  };

  const client = createSuperAdminUsersClient({ api });
  const result = await client.listGlobalUsers();

  assert.deepEqual(calls, [["/users/admin/global"]]);
  assert.deepEqual(result, {
    data: [{ id: 7, email: "user@example.com" }],
    status: 200,
  });
});

test("changeUserRole envía el rol al endpoint exacto", async () => {
  const calls = [];
  const api = {
    put: async (...args) => {
      calls.push(args);
      return { data: { id: 9, rol: "veterinario" }, status: 200 };
    },
  };

  const client = createSuperAdminUsersClient({ api });
  const result = await client.changeUserRole(9, "veterinario");

  assert.deepEqual(calls, [
    ["/users/9/change-role", { rol: "veterinario" }],
  ]);
  assert.deepEqual(result, {
    data: { id: 9, rol: "veterinario" },
    status: 200,
  });
});

test("toggleUserStatus cambia el estado sin enviar payload accidental", async () => {
  const calls = [];
  const api = {
    put: async (...args) => {
      calls.push(args);
      return { data: { id: 4, estado: "inactivo" }, status: 200 };
    },
  };

  const client = createSuperAdminUsersClient({ api });
  const result = await client.toggleUserStatus(4);

  assert.deepEqual(calls, [["/users/4/toggle-status"]]);
  assert.deepEqual(result, {
    data: { id: 4, estado: "inactivo" },
    status: 200,
  });
});

test("getUserEstablishments consulta los establecimientos del usuario", async () => {
  const calls = [];
  const api = {
    get: async (...args) => {
      calls.push(args);
      return { data: [{ id: 3, nombre: "El Ombú" }], status: 200 };
    },
  };

  const client = createSuperAdminUsersClient({ api });
  const result = await client.getUserEstablishments(12);

  assert.deepEqual(calls, [["/users/12/establecimientos"]]);
  assert.deepEqual(result, {
    data: [{ id: 3, nombre: "El Ombú" }],
    status: 200,
  });
});

test("una respuesta 401 cierra la sesión y conserva el error HTTP", async () => {
  let unauthorizedCalls = 0;
  const api = {
    get: async () => {
      throw {
        response: {
          data: { message: "Sesión vencida" },
          status: 401,
        },
      };
    },
  };

  const client = createSuperAdminUsersClient({
    api,
    onUnauthorized: () => {
      unauthorizedCalls += 1;
    },
  });
  const result = await client.listGlobalUsers();

  assert.equal(unauthorizedCalls, 1);
  assert.deepEqual(result, {
    data: { message: "Sesión vencida" },
    status: 401,
    error: true,
  });
});

test("refreshCurrentSession renueva el JWT y publica la sesión fresca", async () => {
  const calls = [];
  let refreshedSession = null;
  const api = {
    post: async (...args) => {
      calls.push(args);
      return {
        data: {
          token: "jwt-fresco",
          user: { id: 5, rol: "admin", email: "self@example.com" },
        },
        status: 200,
      };
    },
  };

  const client = createSuperAdminUsersClient({
    api,
    onSessionRefreshed: (session) => {
      refreshedSession = session;
    },
  });
  const result = await client.refreshCurrentSession();

  assert.deepEqual(calls, [["/auth/refresh"]]);
  assert.deepEqual(refreshedSession, {
    token: "jwt-fresco",
    user: { id: 5, rol: "admin", email: "self@example.com" },
  });
  assert.equal(result.status, 200);
});
