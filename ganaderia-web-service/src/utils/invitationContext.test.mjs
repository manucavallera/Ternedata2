import test from "node:test";
import assert from "node:assert/strict";
import {
  captureInvitation,
  clearAuthCredentials,
  readInvitation,
  resolveInvitation,
} from "./invitationContext.mjs";

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

test("captura token y email normalizado desde una invitación", () => {
  const storage = createStorage();

  captureInvitation(storage, {
    token: "invite-1",
    email: "  Persona@Example.com  ",
  });

  assert.deepEqual(readInvitation(storage), {
    token: "invite-1",
    email: "persona@example.com",
  });
});

test("clearAuthCredentials conserva la invitación", () => {
  const storage = createStorage({
    token: "jwt-viejo",
    NEXT_JS_AUTH: "jwt-viejo",
    userSelected: "{}",
    pendingInviteToken: "invite-1",
    pendingInviteEmail: "persona@example.com",
  });

  clearAuthCredentials(storage);

  assert.equal(storage.getItem("token"), null);
  assert.equal(storage.getItem("NEXT_JS_AUTH"), null);
  assert.equal(storage.getItem("userSelected"), null);
  assert.deepEqual(readInvitation(storage), {
    token: "invite-1",
    email: "persona@example.com",
  });
});

test("usa backupToken por compatibilidad y resuelve todo el contexto", () => {
  const storage = createStorage({
    backupToken: "invite-vieja",
    pendingInviteEmail: "persona@example.com",
  });

  assert.equal(readInvitation(storage).token, "invite-vieja");
  resolveInvitation(storage);

  assert.deepEqual(readInvitation(storage), { token: null, email: null });
});
