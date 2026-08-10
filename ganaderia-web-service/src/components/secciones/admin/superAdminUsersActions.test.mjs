import assert from "node:assert/strict";
import test from "node:test";

import { runConfirmedUserMutation } from "./superAdminUsersActions.mjs";

const createFeedback = () => {
  const state = { pending: "initial", error: "", notice: "" };
  return {
    state,
    setPendingAction: (value) => {
      state.pending = value;
    },
    setError: (value) => {
      state.error = value;
    },
    setNotice: (value) => {
      state.notice = value;
    },
  };
};

test("runConfirmedUserMutation cancela sin ejecutar la acción", async () => {
  let requests = 0;
  const feedback = createFeedback();

  const result = await runConfirmedUserMutation({
    confirmAction: () => false,
    confirmationMessage: "¿Continuar?",
    pendingKey: "role-1",
    request: async () => {
      requests += 1;
      return { status: 200 };
    },
    onSuccess: async () => true,
    successMessage: "Guardado",
    fallbackError: "Error",
    feedback,
  });

  assert.equal(result, false);
  assert.equal(requests, 0);
  assert.equal(feedback.state.pending, "initial");
});

test("runConfirmedUserMutation refresca y muestra éxito", async () => {
  const events = [];
  const feedback = createFeedback();

  const result = await runConfirmedUserMutation({
    confirmAction: () => true,
    confirmationMessage: "¿Continuar?",
    pendingKey: "status-2",
    request: async () => {
      events.push("request");
      return { status: 200, data: { id: 2 } };
    },
    onSuccess: async () => {
      events.push("refresh");
      return true;
    },
    successMessage: "Estado actualizado",
    fallbackError: "Error",
    feedback,
  });

  assert.equal(result, true);
  assert.deepEqual(events, ["request", "refresh"]);
  assert.deepEqual(feedback.state, {
    pending: null,
    error: "",
    notice: "Estado actualizado",
  });
});

test("runConfirmedUserMutation expone el error HTTP y libera la acción", async () => {
  const feedback = createFeedback();

  const result = await runConfirmedUserMutation({
    confirmAction: () => true,
    confirmationMessage: "¿Continuar?",
    pendingKey: "role-3",
    request: async () => ({
      status: 409,
      data: { message: "No se puede degradar al último super_admin activo" },
    }),
    onSuccess: async () => true,
    successMessage: "Guardado",
    fallbackError: "No se pudo guardar",
    feedback,
  });

  assert.equal(result, false);
  assert.deepEqual(feedback.state, {
    pending: null,
    error: "No se puede degradar al último super_admin activo",
    notice: "",
  });
});
