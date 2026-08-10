import test from "node:test";
import assert from "node:assert/strict";
import { readInvitation } from "./invitationContext.mjs";
import { completePendingInvitation } from "./pendingInvitationFlow.mjs";

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

test("prioriza token y lo elimina solo después de aceptar", async () => {
  const calls = [];
  const storage = createStorage({ pendingInviteToken: "invite-1" });

  const result = await completePendingInvitation({
    storage,
    acceptToken: async (token) => calls.push(["token", token]),
    acceptByEmail: async () => calls.push(["email"]),
  });

  assert.deepEqual(calls, [["token", "invite-1"]]);
  assert.deepEqual(result, { accepted: true, source: "token" });
  assert.equal(readInvitation(storage).token, null);
});

test("conserva token cuando Business responde 403", async () => {
  const storage = createStorage({ pendingInviteToken: "invite-1" });

  await assert.rejects(
    completePendingInvitation({
      storage,
      acceptToken: async () => {
        throw { response: { status: 403 } };
      },
      acceptByEmail: async () => ({ aceptadas: 0 }),
    }),
  );

  assert.equal(readInvitation(storage).token, "invite-1");
});

test("trata 409 como membresía resuelta", async () => {
  const storage = createStorage({ pendingInviteToken: "invite-1" });

  const result = await completePendingInvitation({
    storage,
    acceptToken: async () => {
      throw { response: { status: 409 } };
    },
    acceptByEmail: async () => ({ aceptadas: 0 }),
  });

  assert.deepEqual(result, { accepted: true, source: "token" });
  assert.equal(readInvitation(storage).token, null);
});

test("sin token acepta automáticamente por email", async () => {
  const storage = createStorage();

  const result = await completePendingInvitation({
    storage,
    acceptToken: async () => assert.fail("no debe aceptar token"),
    acceptByEmail: async () => ({ aceptadas: 2 }),
  });

  assert.deepEqual(result, { accepted: true, source: "email" });
});

test("sin invitaciones pendientes informa none", async () => {
  const result = await completePendingInvitation({
    storage: createStorage(),
    acceptToken: async () => assert.fail("no debe aceptar token"),
    acceptByEmail: async () => ({ aceptadas: 0 }),
  });

  assert.deepEqual(result, { accepted: false, source: "none" });
});
