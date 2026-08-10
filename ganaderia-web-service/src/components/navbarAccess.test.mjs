import test from "node:test";
import assert from "node:assert/strict";
import { canAccessAdminPanel } from "./navbarAccess.mjs";

test("admin y super_admin ven el acceso al panel", () => {
  assert.equal(canAccessAdminPanel("admin"), true);
  assert.equal(canAccessAdminPanel("super_admin"), true);
});

test("otros roles no ven el acceso al panel", () => {
  assert.equal(canAccessAdminPanel("operario"), false);
  assert.equal(canAccessAdminPanel("veterinario"), false);
  assert.equal(canAccessAdminPanel(undefined), false);
});
