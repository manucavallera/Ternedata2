import test from "node:test";
import assert from "node:assert/strict";
import { getInvitationDeliveryState } from "./invitationDeliveryState.mjs";

test("distingue correo enviado, fallo de correo y link manual", () => {
  assert.equal(
    getInvitationDeliveryState({ emailEnviado: "a@b.com" }).kind,
    "sent",
  );
  assert.equal(
    getInvitationDeliveryState({
      emailEnviado: null,
      emailError: "No se pudo enviar el correo",
    }).kind,
    "email_failed",
  );
  assert.equal(
    getInvitationDeliveryState({ emailEnviado: null, emailError: null }).kind,
    "manual",
  );
});
