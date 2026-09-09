# Seguimiento de pesos y calostrado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear seguimiento común de pesos y calostrado para web y mobile, conservando separado el calendario histórico del establecimiento.

**Architecture:** Business será fuente única de verdad con tablas relacionales para pesajes y tomas de calostrado. Web y mobile consumirán los mismos endpoints tenant-aware; cada cliente adaptará solo layout y controles de fecha.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, class-validator, Next.js/React, Expo React Native Web, Jest/Supertest API.

**Spec:** `docs/superpowers/specs/2026-09-09-seguimiento-terneros.md`

## Global Constraints

- No alterar semántica ni rutas del `Calendario histórico` existente.
- No calcular `peso_largado` automáticamente.
- Business debe validar `id_establecimiento` mediante guards existentes.
- Web y mobile deben mostrar RP; nunca usar ID interno como identificador visible.
- Preservar cambios locales ajenos: superadmin, forrajería, memoria y configuración.
- Ejecutar tests contra datos `TEST_` y limpiar registros creados.

---

### Task 1: Modelo relacional de seguimiento

**Files:**
- Create: `ms-nestjs-bussines/src/modules/terneros/entities/pesaje-ternero.entity.ts`
- Create: `ms-nestjs-bussines/src/modules/terneros/entities/calostrado-ternero.entity.ts`
- Modify: `ms-nestjs-bussines/src/modules/terneros/terneros.module.ts`
- Create: `ms-nestjs-bussines/src/database/migrations/202609090001-CreateTerneroSeguimiento.ts`
- Test: `ms-nestjs-bussines/src/modules/terneros/terneros.service.spec.ts`

**Interfaces:**
- `PesajeTerneroEntity`: `id_pesaje`, `id_ternero`, `id_establecimiento`, `fecha`, `peso`, `observaciones`, `creado_por`, timestamps.
- `CalostradoTerneroEntity`: `id_calostrado`, `id_ternero`, `id_establecimiento`, `fecha_hora`, `metodo`, `litros`, `grado_brix`, `observaciones`, `creado_por`, timestamps.
- Unique index `(id_ternero, fecha)` for pesajes; no unique index for calostrados.

- [ ] **Step 1: Write failing entity/service tests**

```ts
it('guarda un pesaje por fecha y establecimiento', async () => {
  const result = await service.crearPesaje(7, 62, {
    fecha: '2026-09-16', peso: 42, observaciones: 'TEST peso',
  });
  expect(result.peso).toBe(42);
  expect(result.id_establecimiento).toBe(62);
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `npm test -- --runInBand src/modules/terneros/terneros.service.spec.ts`

Expected: FAIL because entities and service methods do not exist.

- [ ] **Step 3: Add entities, indexes and TypeORM registration**

Use `@Column({ type: 'date' })` for pesaje date and `@Column({ type: 'timestamp' })` for calostrado date/time. Register both entities in `TernerosModule` and migration data source.

- [ ] **Step 4: Run focused test and verify it passes**

Run: `npm test -- --runInBand src/modules/terneros/terneros.service.spec.ts`

Expected: PASS for entity registration and persistence mocks.

- [ ] **Step 5: Commit**

Run: `git add ms-nestjs-bussines/src/modules/terneros ms-nestjs-bussines/src/database/migrations/202609090001-CreateTerneroSeguimiento.ts && git commit -m "feat(business): add calf tracking records"`

### Task 2: API de pesajes y calostrado

**Files:**
- Create: `ms-nestjs-bussines/src/modules/terneros/dto/pesaje-ternero.dto.ts`
- Create: `ms-nestjs-bussines/src/modules/terneros/dto/calostrado-ternero.dto.ts`
- Modify: `ms-nestjs-bussines/src/modules/terneros/terneros.controller.ts`
- Modify: `ms-nestjs-bussines/src/modules/terneros/terneros.service.ts`
- Test: `tests/ternedata.second-batch.test.js`

**Interfaces:**
- `POST /terneros/:id_ternero/pesajes`
- `GET /terneros/:id_ternero/pesajes`
- `PATCH /terneros/:id_ternero/pesajes/:id_pesaje`
- `DELETE /terneros/:id_ternero/pesajes/:id_pesaje`
- `POST /terneros/:id_ternero/calostrados`
- `GET /terneros/:id_ternero/calostrados`
- `PATCH /terneros/:id_ternero/calostrados/:id_calostrado`
- `DELETE /terneros/:id_ternero/calostrados/:id_calostrado`
- Every response includes RP and never trusts a client establishment ID over the guard.

- [ ] **Step 1: Add failing integration tests**

Test create/list/update/delete for one pesaje and two calostrados. Assert cross-establishment access returns 403/404, duplicate same-day pesaje updates instead of creating a second row, future dates and invalid Brix return 400.

- [ ] **Step 2: Run only second-batch tests and verify new tests fail**

Run: `npm test -- --runInBand tests/ternedata.second-batch.test.js`

Expected: existing tests pass; new endpoint tests fail with 404 until routes exist.

- [ ] **Step 3: Implement DTO validation and tenant-aware service methods**

Use `@IsDateString`, `@IsPositive`, `@IsEnum(['mamadera', 'sonda'])`, `@Min(0)`, and `@Max(50)`. Resolve the calf through the existing `findOne(id, req.id_establecimiento, req.es_admin)` before every read or mutation.

- [ ] **Step 4: Implement age and gain calculations**

Return `dias_desde_nacimiento`, `ganancia_desde_anterior`, `aumento_diario_promedio`, and milestone summaries. `peso_largado` remains manual and nullable.

- [ ] **Step 5: Run API tests and verify pass**

Run: `npm test -- --runInBand tests/ternedata.test.js tests/ternedata.second-batch.test.js`

Expected: all previous tests plus new tracking tests pass; cleanup leaves zero `TEST_` tracking rows.

- [ ] **Step 6: Commit**

Run: `git add ms-nestjs-bussines/src/modules/terneros tests/ternedata.second-batch.test.js && git commit -m "feat(business): expose calf tracking API"`

### Task 3: Migración y compatibilidad de datos viejos

**Files:**
- Modify: `ms-nestjs-bussines/src/database/migrations/202609090001-CreateTerneroSeguimiento.ts`
- Modify: `ms-nestjs-bussines/src/modules/terneros/terneros.service.ts`
- Test: `tests/ternedata.second-batch.test.js`

- [ ] **Step 1: Add migration assertions**

Assert one migrated calostrado for an existing calf with legacy calostrum and migrated pesajes only for parseable legacy values.

- [ ] **Step 2: Run migration check**

Run: `DB_HOST=localhost DB_PORT=5444 npm run typeorm -- migration:generate -d src/database/data-source.ts --check src/database/migrations/SchemaCheck`

Expected: no unexpected schema drift after migration definition.

- [ ] **Step 3: Implement idempotent migration**

Parse `estimativo` entries only when date and numeric weight are valid. Use birth date plus 15/30/45 days for legacy milestone dates. Do not rewrite existing `peso_largado` values.

- [ ] **Step 4: Verify old API responses remain compatible**

Run: `npm test -- --runInBand tests/ternedata.test.js tests/ternedata.second-batch.test.js`

Expected: 69 existing tests remain green plus tracking tests.

- [ ] **Step 5: Commit**

Run: `git add ms-nestjs-bussines/src/database/migrations/202609090001-CreateTerneroSeguimiento.ts ms-nestjs-bussines/src/modules/terneros tests/ternedata.second-batch.test.js && git commit -m "feat(business): migrate legacy calf tracking"`

### Task 4: Seguimiento mobile

**Files:**
- Modify: `ternedata-mobile/src/screens/ternero/TerneroListadoScreen.js`
- Modify: `ternedata-mobile/src/hooks/bussines.js`
- Create: `ternedata-mobile/src/screens/ternero/TerneroSeguimientoScreen.js`
- Modify: `ternedata-mobile/src/navigation/AppNavigator.js`

- [ ] **Step 1: Add API hook contract tests or request fixtures**

Verify hook methods map to the eight Business routes and preserve backend error messages.

- [ ] **Step 2: Implement mobile tracking screen**

Show a date calendar with markers, filter chips `Todos/Pesos/Calostrado`, date picker/input, list by date, and create/edit/delete actions. Show RP in title and never internal ID.

- [ ] **Step 3: Add milestone summary**

Render Nacer, 15d, 30d, 45d and Largado from API response; display `—` when absent and show actual measurement date for milestones.

- [ ] **Step 4: Export web bundle and validate syntax**

Run: `node --check src/screens/ternero/TerneroSeguimientoScreen.js && npx expo export --platform web`

Expected: export completes and produces no syntax error.

- [ ] **Step 5: Commit mobile changes**

Run from `ternedata-mobile`: `git add src && git commit -m "feat(mobile): add calf tracking calendar"`

### Task 5: Seguimiento web

**Files:**
- Modify: `ganaderia-web-service/src/components/secciones/listado/components/Listado-Ternero.jsx`
- Create: `ganaderia-web-service/src/components/secciones/listado/components/SeguimientoTernero.jsx`
- Modify: `ganaderia-web-service/src/hooks/bussines.js`

- [ ] **Step 1: Add web request fixtures**

Verify same payload fields and response normalization as mobile.

- [ ] **Step 2: Implement tracking panel**

Add the same filters, calendar markers, fields, milestone summary and CRUD actions. Use responsive layout; preserve existing `Calendario histórico` route unchanged.

- [ ] **Step 3: Build web**

Run: `npm run build`

Expected: Next build exits 0 and keeps `/calendario` available as `Calendario histórico`.

- [ ] **Step 4: Commit web changes**

Run from repo root: `git add ganaderia-web-service/src/components/secciones/listado/components ganaderia-web-service/src/hooks/bussines.js && git commit -m "feat(web): add calf tracking calendar"`

### Task 6: Integrate markers into general calendar

**Files:**
- Modify: `ms-nestjs-bussines/src/modules/historial/historial.service.ts`
- Modify: `ganaderia-web-service/src/components/secciones/calendario/Calendario-seccion.jsx`
- Modify: `ternedata-mobile/src/screens/calendario/CalendarioScreen.js`
- Test: `tests/ternedata.second-batch.test.js`

- [ ] **Step 1: Add failing marker test**

Assert a date with a weight or calostrum record appears in `dias-con-cambios` without changing the snapshot meaning.

- [ ] **Step 2: Implement marker-only integration**

Keep snapshot contents and add marker categories/counts or links to the affected calf. Do not turn the general calendar into the per-calf editor.

- [ ] **Step 3: Run builds and API tests**

Run: `npm test -- --runInBand tests/ternedata.test.js tests/ternedata.second-batch.test.js`, `npm run build`, and `npx expo export --platform web`.

- [ ] **Step 4: Commit**

Use `feat(calendar): mark calf tracking activity`.

### Task 7: Cross-client verification

**Files:**
- Test: `tests/ternedata.test.js`
- Test: `tests/ternedata.second-batch.test.js`

- [ ] **Step 1: Run backend suite**

Expected: original and second batch green; test cleanup reports zero residual test records.

- [ ] **Step 2: Run identical manual script in web and mobile**

Create one calf, add weights on `2026-09-09`, `2026-09-16`, `2026-10-01`, add two calostrados on `2026-09-09`, edit one, delete one, reload in the other client, and compare RP, dates, values and calculated gain.

- [ ] **Step 3: Run edge cases**

Test empty required fields, letters in numeric inputs, future dates, invalid Brix, duplicate save, slow network, closing during load, logout/session persistence and establishment isolation.

- [ ] **Step 4: Record evidence**

Capture screen, action, expected result, actual result, exact message, device/OS and screenshot for every failure.

