# Invitation Flow Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conservar y aceptar correctamente invitaciones durante registro, verificación y login, con resultados de correo veraces y el mismo comportamiento responsive en escritorio y mobile.

**Architecture:** Business conserva la propiedad de invitaciones y membresías; Security conserva registro, verificación y sesión. El cliente web usa unidades puras para persistir el contexto de invitación, limpiar solo credenciales y orquestar la aceptación posterior al login.

**Tech Stack:** Next.js 16, React, Node test runner, NestJS, Jest, TypeORM.

## Global Constraints

- Un usuario nuevo siempre verifica su email antes de aceptar una invitación.
- Business es la única fuente de verdad para validar y consumir tokens de invitación.
- Security no marca una invitación como aceptada ni saltea `email_verificado`.
- Invitaciones con email solo pueden ser aceptadas por ese email.
- Los links genéricos requieren usuario autenticado y verificado.
- No agregar tablas, migraciones ni dependencias.
- Las mutaciones manuales en EasyPanel usan exclusivamente cuentas de prueba.

---

### Task 1: Persistir el contexto de invitación sin perderlo al iniciar sesión

**Files:**
- Create: `ganaderia-web-service/src/utils/invitationContext.mjs`
- Create: `ganaderia-web-service/src/utils/invitationContext.test.mjs`
- Modify: `ganaderia-web-service/src/hooks/auth.js`
- Modify: `ganaderia-web-service/src/app/join/page.jsx`

**Interfaces:**
- Produces `captureInvitation(storage, { token, email })`.
- Produces `readInvitation(storage): { token: string | null, email: string | null }`.
- Produces `clearAuthCredentials(storage)` sin borrar invitaciones.
- Produces `resolveInvitation(storage)` para eliminar `pendingInviteToken`, `pendingInviteEmail` y `backupToken`.

- [ ] **Step 1: Write failing context tests**

```js
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
  assert.deepEqual(readInvitation(storage), {
    token: "invite-1",
    email: "persona@example.com",
  });
});

test("resolveInvitation elimina todo el contexto pendiente", () => {
  const storage = createStorage({ pendingInviteToken: "invite-1", backupToken: "invite-1" });
  resolveInvitation(storage);
  assert.equal(readInvitation(storage).token, null);
});
```

- [ ] **Step 2: Verify RED**

Run: `cd ganaderia-web-service && node --test src/utils/invitationContext.test.mjs`
Expected: FAIL because `invitationContext.mjs` does not exist.

- [ ] **Step 3: Implement the pure storage contract**

```js
const AUTH_KEYS = ["token", "NEXT_JS_AUTH", "userSelected"];
const INVITE_KEYS = ["pendingInviteToken", "pendingInviteEmail", "backupToken"];

export const captureInvitation = (storage, { token, email }) => {
  if (token) storage.setItem("pendingInviteToken", token);
  if (email) storage.setItem("pendingInviteEmail", email);
};

export const readInvitation = (storage) => ({
  token: storage.getItem("pendingInviteToken") || storage.getItem("backupToken"),
  email: storage.getItem("pendingInviteEmail"),
});

export const clearAuthCredentials = (storage) =>
  AUTH_KEYS.forEach((key) => storage.removeItem(key));

export const resolveInvitation = (storage) =>
  INVITE_KEYS.forEach((key) => storage.removeItem(key));
```

- [ ] **Step 4: Replace broad storage clearing and capture email**

Import `clearAuthCredentials` in `hooks/auth.js` and replace both `localStorage.clear()` calls. In `/join`, call `captureInvitation(localStorage, { token, email })` before navigating or clearing an incorrect session.

- [ ] **Step 5: Verify GREEN**

Run: `cd ganaderia-web-service && node --test src/utils/invitationContext.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ganaderia-web-service/src/utils/invitationContext.mjs ganaderia-web-service/src/utils/invitationContext.test.mjs ganaderia-web-service/src/hooks/auth.js ganaderia-web-service/src/app/join/page.jsx
git commit -m "fix(web): preserve pending invitation context"
```

---

### Task 2: Aceptar el token pendiente después del login

**Files:**
- Create: `ganaderia-web-service/src/utils/pendingInvitationFlow.mjs`
- Create: `ganaderia-web-service/src/utils/pendingInvitationFlow.test.mjs`
- Modify: `ganaderia-web-service/src/app/auth/login/page.jsx`
- Modify: `ganaderia-web-service/src/components/Register-component.jsx`

**Interfaces:**
- Consumes `readInvitation(storage)` y `resolveInvitation(storage)` de Task 1.
- Produces `completePendingInvitation({ storage, acceptToken, acceptByEmail })`.
- Returns `{ accepted: boolean, source: "token" | "email" | "none" }`.

- [ ] **Step 1: Write failing orchestration tests**

```js
test("prioriza token y lo elimina solo después de aceptar", async () => {
  const calls = [];
  const result = await completePendingInvitation({
    storage: createStorage({ pendingInviteToken: "invite-1" }),
    acceptToken: async (token) => calls.push(["token", token]),
    acceptByEmail: async () => calls.push(["email"]),
  });
  assert.deepEqual(calls, [["token", "invite-1"]]);
  assert.deepEqual(result, { accepted: true, source: "token" });
});

test("conserva token cuando Business responde 403", async () => {
  const storage = createStorage({ pendingInviteToken: "invite-1" });
  await assert.rejects(
    completePendingInvitation({
      storage,
      acceptToken: async () => { throw { response: { status: 403 } }; },
      acceptByEmail: async () => ({ aceptadas: 0 }),
    }),
  );
  assert.equal(readInvitation(storage).token, "invite-1");
});

test("trata 409 como membresía resuelta", async () => {
  const storage = createStorage({ pendingInviteToken: "invite-1" });
  const result = await completePendingInvitation({
    storage,
    acceptToken: async () => { throw { response: { status: 409 } }; },
    acceptByEmail: async () => ({ aceptadas: 0 }),
  });
  assert.deepEqual(result, { accepted: true, source: "token" });
  assert.equal(readInvitation(storage).token, null);
});
```

- [ ] **Step 2: Verify RED**

Run: `cd ganaderia-web-service && node --test src/utils/pendingInvitationFlow.test.mjs`
Expected: FAIL because the orchestrator does not exist.

- [ ] **Step 3: Implement minimal orchestration**

Read the pending token. If present, call `acceptToken`; resolve storage on success or HTTP 409, and rethrow other errors without clearing it. Without token, call `acceptByEmail` and report `source: "email"` only when `aceptadas > 0`.

- [ ] **Step 4: Wire login and correct registration copy**

In login, call the orchestrator after successful authentication and before refresh. Use `equipoService.unirseAlEquipo` for `acceptToken` and `businessApi.post('/invitaciones/aceptar-automatico')` for `acceptByEmail`. On acceptance, refresh Security and persist the new session.

In registration, keep the token but replace “REGISTRO Y ACTIVACIÓN EXITOSA” with “Registro exitoso. Verificá tu email antes de continuar”. Redirect to login while preserving token/email in storage.

- [ ] **Step 5: Verify GREEN and regression tests**

Run: `cd ganaderia-web-service && node --test src/utils/invitationContext.test.mjs src/utils/pendingInvitationFlow.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ganaderia-web-service/src/utils/pendingInvitationFlow.mjs ganaderia-web-service/src/utils/pendingInvitationFlow.test.mjs ganaderia-web-service/src/app/auth/login/page.jsx ganaderia-web-service/src/components/Register-component.jsx
git commit -m "fix(web): complete invitations after login"
```

---

### Task 3: Informar correctamente el resultado del correo

**Files:**
- Create: `ms-nestjs-bussines/src/modules/invitaciones/invitaciones.service.spec.ts`
- Modify: `ms-nestjs-bussines/src/modules/invitaciones/invitaciones.service.ts`
- Create: `ganaderia-web-service/src/components/invitationDeliveryState.mjs`
- Create: `ganaderia-web-service/src/components/invitationDeliveryState.test.mjs`
- Modify: `ganaderia-web-service/src/components/TeamManager.jsx`

**Interfaces:**
- Business returns `{ link, token, emailEnviado, emailError }`.
- Web produces `getInvitationDeliveryState(result)` with `sent`, `manual`, or `email_failed`.

- [ ] **Step 1: Write failing Business mail-result test**

```ts
it('conserva el link pero informa fallo cuando Mailer rechaza', async () => {
  mailService.sendMail.mockRejectedValue(new Error('SMTP down'));
  const result = await service.generarLink(4, RolEstablecimiento.OPERARIO, 'persona@example.com');
  expect(result.emailEnviado).toBeNull();
  expect(result.emailError).toBe('No se pudo enviar el correo');
  expect(result.link).toContain('/join?token=');
});
```

- [ ] **Step 2: Verify Business RED**

Run: `cd ms-nestjs-bussines && npm test -- --runInBand invitaciones.service.spec.ts`
Expected: FAIL because the current result still reports `emailEnviado` after a mail failure.

- [ ] **Step 3: Implement truthful mail status**

Track `emailEnviado` and `emailError` separately. On successful `sendMail`, assign the email. On rejection, log the internal error and expose only the stable message `No se pudo enviar el correo`.

- [ ] **Step 4: Add invitation acceptance characterization tests**

Cover wrong directed email (403), expired token (400), existing membership (409 and invitation marked used), and successful single membership creation. These preserve the existing Business contract while the mail behavior changes.

- [ ] **Step 5: Write failing web delivery-state test**

```js
assert.equal(getInvitationDeliveryState({ emailEnviado: "a@b.com" }).kind, "sent");
assert.equal(getInvitationDeliveryState({ emailError: "No se pudo enviar el correo" }).kind, "email_failed");
assert.equal(getInvitationDeliveryState({ emailEnviado: null, emailError: null }).kind, "manual");
```

Run: `cd ganaderia-web-service && node --test src/components/invitationDeliveryState.test.mjs`
Expected: FAIL because the helper does not exist.

- [ ] **Step 6: Implement the helper and responsive UI states**

Use the helper in `TeamManager`. Show green only for `sent`; show an amber mail-failure notice plus the valid copiable link for `email_failed`; retain the manual-link notice for `manual`. Make modal actions `flex-col sm:flex-row` so buttons do not compress on narrow screens.

- [ ] **Step 7: Verify GREEN**

Run: `cd ms-nestjs-bussines && npm test -- --runInBand invitaciones.service.spec.ts`
Run: `cd ganaderia-web-service && node --test src/components/invitationDeliveryState.test.mjs`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add ms-nestjs-bussines/src/modules/invitaciones ganaderia-web-service/src/components/TeamManager.jsx ganaderia-web-service/src/components/invitationDeliveryState.mjs ganaderia-web-service/src/components/invitationDeliveryState.test.mjs
git commit -m "fix(invites): report email delivery failures"
```

---

### Task 4: Fijar el contrato de registro invitado en Security

**Files:**
- Modify: `ms-nestjs-security/src/modules/auth/auth.service.spec.ts`
- Modify: `ms-nestjs-security/src/modules/auth/auth.service.ts`
- Modify: `ms-nestjs-security/src/modules/auth/dto/register.dto.ts`

**Interfaces:**
- Registration with any invitation intent creates `rol: 'operario'` and `email_verificado: false`.
- Registration response always instructs email verification and never claims invitation activation.

- [ ] **Step 1: Add registration contract tests**

Instantiate `AuthService` with repository `save`, verification-mail dependencies and JWT mocks. Assert invited registration saves `operario` with `email_verificado: false`; normal registration saves `admin`; both responses mention email verification and omit activation claims.

- [ ] **Step 2: Run the contract tests**

Run: `cd ms-nestjs-security && npm test -- --runInBand auth.service.spec.ts`
Expected: PASS for current persistence behavior; the tests characterize the security boundary before copy cleanup.

- [ ] **Step 3: Remove misleading activation wording**

Update comments and `RegisterAuthDto.invitationToken` description from “activar cuenta automáticamente” to “conservar intención de incorporación; requiere verificar email y aceptar en Business”. Keep production persistence behavior unchanged.

- [ ] **Step 4: Re-run Security tests**

Run: `cd ms-nestjs-security && npm test -- --runInBand auth.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ms-nestjs-security/src/modules/auth/auth.service.spec.ts ms-nestjs-security/src/modules/auth/auth.service.ts ms-nestjs-security/src/modules/auth/dto/register.dto.ts
git commit -m "test(security): lock invited registration contract"
```

---

### Task 5: Verificación integrada responsive

**Files:**
- No production files.

**Interfaces:**
- Validates Tasks 1–4 against the approved design.

- [ ] **Step 1: Run all focused web tests**

Run: `cd ganaderia-web-service && node --test src/utils/invitationContext.test.mjs src/utils/pendingInvitationFlow.test.mjs src/components/invitationDeliveryState.test.mjs src/components/navbarAccess.test.mjs src/hooks/superAdminUsersClient.test.mjs src/hooks/saveRefreshedSession.test.mjs src/components/secciones/admin/superAdminUsersViewModel.test.mjs src/components/secciones/admin/superAdminUsersActions.test.mjs`
Expected: PASS.

- [ ] **Step 2: Run backend suites and builds**

Run: `cd ms-nestjs-bussines && npm test -- --runInBand && npm run build`
Run: `cd ms-nestjs-security && npm test -- --runInBand && npm run build`
Expected: PASS.

- [ ] **Step 3: Run web production build**

Run: `cd ganaderia-web-service && npm run build`
Expected: PASS.

- [ ] **Step 4: Verify formatting and graph impact**

Run: `git diff --check`
Update CodeGraph and inspect changed invitation paths for uncovered high-risk callers.

- [ ] **Step 5: Controlled EasyPanel smoke**

Using only test accounts, execute directed existing-user, directed new-user and generic-link flows at desktop and mobile viewport. Confirm 403 wrong-email, 400 expired/used, refresh after acceptance and truthful mail-failure presentation. Do not modify real users.

- [ ] **Step 6: Request code review and update PR**

Run the two-axis review against the commit before Task 1, correct high/medium findings, push the final branch and wait for GitHub Actions.

## Plan self-review

- Spec coverage: token persistence, verified registration, post-login acceptance, truthful email result, responsive behavior and manual matrix are mapped to Tasks 1–5.
- Placeholder scan: no incomplete implementation steps.
- Type consistency: invitation context and orchestration interfaces are defined once and consumed by later tasks with matching names.
