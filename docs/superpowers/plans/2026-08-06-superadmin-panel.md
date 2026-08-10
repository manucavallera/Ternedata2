# Panel global de superadmin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar al `super_admin` un panel web para listar globalmente usuarios, consultar sus establecimientos, cambiar roles y activar/desactivar cuentas de forma segura.

**Architecture:** Security será la fuente de verdad para identidad, roles y estado. Se agregará un contrato explícito para administración global, protegido por `JwtAuthGuard` + `RolesGuard` y consumido por el cliente `securityApi`; el panel existente de escritorio usará ese contrato en vez de depender del alcance por establecimiento de Business.

**Tech Stack:** NestJS, TypeORM, Jest, Next.js/React, Axios, Redux.

## Global Constraints

- Solo `super_admin` puede listar y modificar usuarios globalmente.
- Nunca devolver contraseñas, tokens ni secretos.
- No eliminar físicamente usuarios en esta etapa.
- Proteger al único `super_admin` frente a degradación o desactivación accidental.
- Mobile queda fuera de esta etapa.

---

## Task 1: Fijar el contrato global de usuarios en Security

**Files:**
- Modify: `ms-nestjs-security/src/modules/users/users.controller.ts`
- Modify: `ms-nestjs-security/src/modules/users/users.service.ts`
- Modify: `ms-nestjs-security/src/modules/users/dto/user.dto.ts`
- Test: `ms-nestjs-security/src/modules/users/users.service.spec.ts`
- Test: `ms-nestjs-security/src/modules/users/users.controller.spec.ts`

**Interfaces:**
- Produce `GET /users/admin/global`, `PUT /users/:id/change-role`, `PUT /users/:id/toggle-status` y `GET /users/:id/establecimientos`, todos superadmin-only.
- `GET /users/admin/global` devuelve `{ id, name, email, rol, estado, id_establecimiento, establecimiento, establecimientosAsignados, ultimo_acceso }[]` sin `password`.
- `PUT /users/:id/change-role` recibe `{ rol: UserRole }`.

- [ ] **Step 1: Write failing service tests** para que `findAllGlobal` devuelva usuarios sin secretos, incluya relaciones y rechace degradar/desactivar el último superadmin.
- [ ] **Step 2: Run tests and verify failure**

Run: `cd ms-nestjs-security && npm test -- --runInBand users.service.spec.ts`
Expected: FAIL because `findAllGlobal` and the safety rule do not exist.

- [ ] **Step 3: Implement the minimal service contract** usando las relaciones ya existentes (`establecimiento`, `userEstablecimientos`) y una consulta global; validar rol contra `UserRole` antes de persistir.
- [ ] **Step 4: Write failing controller/guard tests** para `super_admin` permitido y `admin`, `operario`, `veterinario` rechazados con 403.
- [ ] **Step 5: Implement explicit controller routes** con `@Roles(UserRole.SUPER_ADMIN)` y payloads validados.
- [ ] **Step 6: Run Security tests**

Run: `cd ms-nestjs-security && npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add ms-nestjs-security/src/modules/users
git commit -m "feat(security): add global superadmin user contract"
```

## Task 2: Exponer operaciones globales en el cliente web

**Files:**
- Modify: `ganaderia-web-service/src/api/security-api.js`
- Create: `ganaderia-web-service/src/hooks/useSuperAdminUsers.js`

**Interfaces:**
- Produce `useSuperAdminUsers()` con `listGlobalUsers()`, `changeUserRole(id, rol)`, `toggleUserStatus(id)` y `getUserEstablishments(id)`.
- Todas las funciones usan `securityApi`, retornan `{ data, status }` y preservan el manejo existente de 401/logout.

- [ ] **Step 1: Implement the hook** sin duplicar la lógica de Business ni almacenar tokens en estado React; cada método debe llamar a la ruta Security exacta y devolver el error HTTP para que la UI lo presente.
- [ ] **Step 2: Run the web build**

Run: `cd ganaderia-web-service && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add ganaderia-web-service/src/api/security-api.js ganaderia-web-service/src/hooks/useSuperAdminUsers.js
git commit -m "feat(web): add superadmin user client"
```

## Task 3: Integrar la tabla global en el panel de escritorio

**Files:**
- Modify: `ganaderia-web-service/src/components/secciones/admin/AdminPanel.jsx`
- Modify: `ganaderia-web-service/src/app/admin/panel/page.jsx`
- Modify: `ganaderia-web-service/src/app/admin/layout.jsx`

**Interfaces:**
- Consume `useSuperAdminUsers()`.
- Renderiza email, rol, estado y establecimientos; filtros locales por rol/estado; acciones con confirmación.

- [ ] **Step 1: Add a dedicated global-users tab/section** sin romper las pestañas actuales de admin por establecimiento.
- [ ] **Step 2: Wire role/status actions** con estados de carga, confirmación y refresh posterior; mostrar errores 403/409 de forma visible.
- [ ] **Step 3: Add establishment details** en fila expandible/modal, sin exponer datos productivos todavía.
- [ ] **Step 4: Run build/lint**

Run: `cd ganaderia-web-service && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ganaderia-web-service/src/components/secciones/admin/AdminPanel.jsx ganaderia-web-service/src/app/admin/panel/page.jsx ganaderia-web-service/src/app/admin/layout.jsx
git commit -m "feat(web): add global superadmin user panel"
```

## Task 4: Verificación de seguridad y flujo completo

**Files:**
- No production files; use the existing Security test suite, web build, and manual smoke checklist.

**Interfaces:**
- No production API changes; validates the contracts from Tasks 1–3.

- [ ] **Step 1: Run Security unit tests and build**

Run: `cd ms-nestjs-security && npm test -- --runInBand && npm run build`
Expected: PASS.

- [ ] **Step 2: Run web build**

Run: `cd ganaderia-web-service && npm run build`
Expected: PASS.

- [ ] **Step 3: Manual smoke test** como `manucavallera44@gmail.com`: abrir panel, confirmar lista global, filtrar, consultar establecimientos, cambiar un usuario a `veterinario`, activar/desactivar una cuenta de prueba y confirmar que un admin normal recibe 403.
- [ ] **Step 4: Confirm JWT refresh behavior** si se cambia el rol de la propia cuenta; cerrar sesión, iniciar sesión y comprobar que el nuevo rol aparece en el navbar.
- [ ] **Step 5: Run diff review** con `code-review` y corregir hallazgos críticos antes de push.

## Spec coverage self-review

- Lista global, filtros, roles, estado y establecimientos: Tasks 1–3.
- Exclusividad `super_admin`: Tasks 1 y 4.
- No secretos ni eliminación física: Task 1.
- Protección del último superadmin: Task 1.
- Mobile fuera de alcance: Task 3/4.
- Tests backend, build, UI manual checks y smoke: Tasks 1–4.
- Auditoría permanece explícitamente en la etapa 2.
