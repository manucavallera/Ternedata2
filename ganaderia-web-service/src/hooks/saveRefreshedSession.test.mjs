import assert from "node:assert/strict";
import test from "node:test";

import { saveRefreshedSession } from "./saveRefreshedSession.mjs";

test("saveRefreshedSession guarda JWT fresco sin persistir secretos del usuario", () => {
  const values = new Map();
  const storage = {
    setItem: (key, value) => values.set(key, value),
  };

  const userPayload = saveRefreshedSession(
    {
      token: "jwt-fresco",
      user: {
        id: 5,
        name: "Manuel",
        email: "self@example.com",
        rol: "admin",
        estado: "activo",
        telefono: "123",
        id_establecimiento: 7,
        password: "no-guardar",
      },
    },
    storage,
  );

  assert.equal(values.get("token"), "jwt-fresco");
  assert.equal(values.get("NEXT_JS_AUTH"), "jwt-fresco");
  assert.deepEqual(JSON.parse(values.get("userSelected")), userPayload);
  assert.deepEqual(userPayload, {
    id: 5,
    name: "Manuel",
    email: "self@example.com",
    rol: "admin",
    estado: "activo",
    telefono: "123",
    id_establecimiento: 7,
  });
  assert.equal("password" in userPayload, false);
});
