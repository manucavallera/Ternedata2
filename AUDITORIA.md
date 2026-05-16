# AUDITORÍA INTEGRAL — Sesión 1 (Backend)

**Alcance**: `ms-nestjs-bussines` + `ms-nestjs-security`
**Fecha**: 2026-05-16
**Foco**: correctness, security, multi-tenancy, performance, arquitectura/datos.

---

## Resumen ejecutivo

El backend tiene **fugas multi-tenant graves** y **un fallback de JWT secret hardcodeado** que permite forjar tokens si la env var no se carga. Los endpoints de `/establecimientos/:id` no verifican propiedad: cualquier admin autenticado puede leer, modificar, borrar campos ajenos y expulsar miembros. Además, `synchronize: true` en producción + `id_establecimiento = 1` como default en `/bot/registrar` agregan riesgo de corrupción y de cross-tenant write desde el bot.

**Los 3 problemas más graves**:
1. **`jwt.strategy.ts:12` (bussines)** — `JWT_SECRET || 'secretKey'` → si la env var falla, cualquiera firma JWTs válidos.
2. **`establecimientos.controller.ts:96-133`** — `GET/PUT/DELETE /:id` y `:id/equipo` sin verificación de pertenencia → cualquier admin opera sobre cualquier campo.
3. **`bot.controller.ts:541-543`** — `if (!idEstablecimiento) idEstablecimiento = 1;` → datos del bot caen silenciosamente en el establecimiento 1.

---

## Hallazgos por severidad

### CRIT

#### [SEV-CRIT] JWT secret con fallback hardcodeado
- **Archivo**: `ms-nestjs-bussines/src/modules/auth/jwt.strategy.ts:12`
- **Síntoma**: si `JWT_SECRET` no se carga (typo, env vacía, deploy mal configurado), el sistema acepta tokens firmados con `'secretKey'`. Atacante forja JWT con cualquier `id`, `rol`, `id_establecimiento` y se autentica como admin de cualquier campo.
- **Causa**: `secretOrKey: configservice.get<string>('JWT_SECRET') || 'secretKey'`
- **Fix**: eliminar fallback; abortar boot si la env falta.
  ```ts
  const secret = configservice.get<string>('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET no configurado');
  super({ ..., secretOrKey: secret });
  ```
- **Esfuerzo**: XS

#### [SEV-CRIT] Establecimientos: read/update/delete sin verificación de pertenencia
- **Archivo**: `ms-nestjs-bussines/src/modules/establecimientos/establecimientos.controller.ts:96-133`
- **Síntoma**: `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /:id/equipo`, `DELETE /:id/equipo/:userId` solo chequean `@Roles(ADMIN)`. Cualquier admin de campo A modifica/borra campo B (incluye expulsar miembros).
- **Causa**: ningún guard verifica que `id` esté en `req.user.userEstablecimientos` o `req.user.id_establecimiento`.
- **Fix**: aplicar el mismo patrón usado en `invitaciones.controller.ts:38-45`. Inyectar helper o guard `OwnEstablecimientoGuard` y usarlo en todos los `:id`.
- **Esfuerzo**: S

#### [SEV-CRIT] Invitaciones: revocar sin verificación de pertenencia
- **Archivo**: `ms-nestjs-bussines/src/modules/invitaciones/invitaciones.controller.ts:82-87`
- **Síntoma**: cualquier admin global revoca invitaciones de cualquier campo (no se valida que la invitación corresponda a un campo del admin).
- **Causa**: `revocar(id)` recibe id de invitación sin cruzarlo contra `req.user.userEstablecimientos`.
- **Fix**: en el service cargar la invitación y validar `invitacion.establecimientoId ∈ req.user.userEstablecimientos`.
- **Esfuerzo**: XS

#### [SEV-CRIT] `synchronize: true` en producción (bussines)
- **Archivo**: `ms-nestjs-bussines/src/app.module.ts:44`
- **Síntoma**: TypeORM altera el esquema en cada deploy. Cualquier rename de columna o cambio de tipo puede destruir datos.
- **Causa**: `synchronize: true` sin flag por entorno.
- **Fix**: `synchronize: process.env.NODE_ENV !== 'production'` (mejor: `false` + migraciones).
- **Esfuerzo**: XS (el fix); M (escribir migraciones y validar diff vs DB actual).

### HIGH

#### [SEV-HIGH] Bot: default `id_establecimiento = 1` silencioso
- **Archivo**: `ms-nestjs-bussines/src/modules/bot/bot.controller.ts:541-543`
- **Síntoma**: si por cualquier motivo (auth falla, Claude alucina sin phone, body sin `id_establecimiento`) no se resuelve el campo, todos los registros caen en `id_establecimiento = 1`. Cross-tenant write silencioso.
- **Causa**: `if (!idEstablecimiento) { idEstablecimiento = 1; }`
- **Fix**: devolver error explícito. Nunca asumir 1.
  ```ts
  if (!idEstablecimiento) {
    return { success: false, mensaje: '⚠️ No pude determinar tu establecimiento. Reintentá.' };
  }
  ```
- **Esfuerzo**: XS

#### [SEV-HIGH] Bot: acepta `id_establecimiento` desde el body
- **Archivo**: `ms-nestjs-bussines/src/modules/bot/bot.controller.ts:430`
- **Síntoma**: `let idEstablecimiento = body.id_establecimiento;` — si n8n/Claude inyecta un id arbitrario y luego phone no resuelve auth o falla, `idEstablecimiento` queda con el valor del body. Cross-tenant write.
- **Causa**: el controlador confía en el JSON de Claude.
- **Fix**: ignorar `body.id_establecimiento`; resolverlo siempre desde `phone` + `bot_establecimiento_id`. Si no se resuelve, fallar.
- **Esfuerzo**: XS

#### [SEV-HIGH] Cross-tenant leak: `findAll terneros/madres/eventos` para admin sin filtro
- **Archivos**:
  - `ms-nestjs-bussines/src/modules/terneros/terneros.service.ts:199-212`
  - `ms-nestjs-bussines/src/modules/madres/madres.service.ts:108-124`
  - `ms-nestjs-bussines/src/modules/eventos/eventos.service.ts:193-203` (mismo patrón confirmado vía grep)
- **Síntoma**: si `esAdmin && !filterId` (admin sin `id_establecimiento` y sin `?id_establecimiento=`), el query builder NO aplica `where`. Devuelve TODOS los registros de la tabla. `EstablecimientoGuard:40` permite admin con `id_establecimiento = null`.
- **Causa**: la rama `if (filterId)` no tiene `else` que rechace.
- **Fix**: si admin no provee filterId, devolver `{ data: [], total: 0 }` o `BadRequest('Especificá establecimiento')`.
- **Esfuerzo**: S

#### [SEV-HIGH] `findOne terneros/madres` ignora establecimiento para admin
- **Archivo**: `ms-nestjs-bussines/src/modules/terneros/terneros.service.ts:289-293`, `madres.service.ts:183-187`
- **Síntoma**: `if (!esAdmin && idEstablecimiento)` → admin lee cualquier ternero/madre por id sin restricción. Si el admin conoce el `id_ternero` de otro campo, lo ve.
- **Causa**: filtro multi-tenant condicionado a `!esAdmin`.
- **Fix**: forzar siempre el filtro por `id_establecimiento` resuelto desde el request (no permitir cross-campo aunque sea admin global).
- **Esfuerzo**: S

#### [SEV-HIGH] `users.controller`: cambio de rol/estado sin pertenencia
- **Archivo**: `ms-nestjs-bussines/src/modules/users/users.controller.ts:51-76, 117-126`
- **Síntoma**: cualquier admin puede:
  - `DELETE /users/:id` → desactivar usuarios de otros campos.
  - `PUT /users/:id/change-role` → cambiar rol de usuarios ajenos (escalada).
  - `PUT /users/:id/establecimientos` → asignar establecimientos arbitrarios.
- **Causa**: solo `@Roles(ADMIN)`, sin cross-check de pertenencia.
- **Fix**: validar `targetUser.id_establecimiento ∈ req.user.userEstablecimientos`. En `syncEstablecimientos`, validar que todos los `ids` enviados sean del admin.
- **Esfuerzo**: S

#### [SEV-HIGH] API Key del bot leakea en logs
- **Archivo**: `ms-nestjs-bussines/src/modules/bot/api-key.guard.ts:19-20`
- **Síntoma**: `console.log('🔑 Key recibida:', ...); console.log('🔑 Key esperada:', validKey);` — la clave queda en logs (Easypanel, Docker, files). Cualquiera con acceso a logs gana acceso al endpoint del bot → puede registrar datos en cualquier campo.
- **Fix**: eliminar ambos logs.
- **Esfuerzo**: XS

#### [SEV-HIGH] Token bot Telegram de 6 dígitos sin rate limit
- **Archivos**:
  - `ms-nestjs-bussines/src/modules/users/users.service.ts:260-268` (generación)
  - `ms-nestjs-bussines/src/modules/bot/bot.controller.ts:316-341` (consumo en `/bot/estado`)
- **Síntoma**: 6 dígitos = 10⁶ combinaciones. El endpoint `/bot/estado` está bajo throttler global (20/min/IP) pero `BotApiKeyGuard` se valida primero, y el endpoint procesa cualquier 6-dígitos. Si alguien obtiene la API key del bot, fuerza el código y se vincula el teléfono a otra cuenta. Además, al matchear, `userRepo.update({ telefono: phone }, { telefono: null })` desasigna el teléfono del verdadero dueño sin verificación adicional.
- **Fix**: aumentar token a 8 dígitos o UUID, contador de intentos por teléfono (bloquear tras 5 fallidos).
- **Esfuerzo**: S

#### [SEV-HIGH] Reset password no invalida sesiones, no marca token como usado
- **Archivo**: `ms-nestjs-security/src/modules/auth/auth.service.ts:250-279`
- **Síntoma**:
  - El JWT de reset puede reusarse hasta su expiración (1h). Cambia password 10 veces si querés.
  - JWTs de login emitidos antes del reset siguen válidos 7 días → atacante con sesión robada sobrevive al reset.
- **Fix**:
  - Mantener tabla `password_reset_tokens` con flag `usado` o `jti` invalidado.
  - Bumpear un campo `password_changed_at` en el usuario; invalidar tokens emitidos antes en `JwtStrategy.validate`.
- **Esfuerzo**: M

### MED

#### [SEV-MED] Throttler global 20/min muy bajo para bot
- **Archivo**: `ms-nestjs-bussines/src/app.module.ts:33`
- **Síntoma**: `ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])`. Si n8n procesa un mensaje multi-acción del bot, la ráfaga al backend puede pasar 20 req/min y devolver 429.
- **Fix**: subir a 60/min, o exonerar `/bot/*` con `@SkipThrottle()` (ya está protegido por API key).
- **Esfuerzo**: XS

#### [SEV-MED] `forgot-password` y `register` sin throttle específico
- **Archivos**:
  - `ms-nestjs-security/src/modules/auth/auth.controller.ts:18-20, 54-56, 59-62`
- **Síntoma**: `register`, `forgot-password`, `reset-password` solo bajo throttler global → enumeración de emails y spam de cuentas factible.
- **Fix**: agregar `@Throttle({ default: { limit: 3, ttl: 60000 } })` a cada uno.
- **Esfuerzo**: XS

#### [SEV-MED] Token de invitación expira en 30d (default JwtModule)
- **Archivo**: `ms-nestjs-security/src/modules/auth/auth.service.ts:127` + `auth.module.ts:23`
- **Síntoma**: `crearTokenMagico` firma JWT sin `expiresIn` → usa default 30d del módulo. Invitación viva 30 días.
- **Fix**: `this.jwtService.sign(payload, { expiresIn: '48h' });` (consistente con invitaciones por UUID que usan 48h).
- **Esfuerzo**: XS

#### [SEV-MED] `console.log` con datos personales en producción
- **Archivos**:
  - `ms-nestjs-bussines/src/modules/auth/roles.guard.ts:30-32, 43-44, 56, 61-63`
  - `ms-nestjs-bussines/src/modules/auth/establecimiento.guard.ts:30-32, 51`
  - `ms-nestjs-security/src/modules/auth/roles.guard.ts:30-37, 43, 46, 51`
  - `ms-nestjs-bussines/src/modules/bot/bot.controller.ts:95, 99, 103, 108, 170, 212, 229, 418, 531, 601, 647, 700, 763, 817, 864, 925`
- **Síntoma**: nombres, teléfonos, RPs, IDs y bodies completos en stdout → tema de privacidad y de tamaño de logs.
- **Fix**: usar `Logger.debug` (silenciado en prod) o eliminar.
- **Esfuerzo**: S

#### [SEV-MED] N+1 en resolver RPs del bot
- **Archivo**: `bot.controller.ts:235-275`
- **Síntoma**: `resolverTerneroIdsEstricto`/`resolverMadreIdsEstricto` hacen una query por cada RP en el array. Para un evento con 50 RPs → 50 queries seriales.
- **Fix**: una sola query con `IN (:...rps)` y match en memoria.
- **Esfuerzo**: S

#### [SEV-MED] `existeRpTernero` + `terneroRepo.findOne` redundantes en `crear_ternero` del bot
- **Archivo**: `bot.controller.ts:554-565` + `terneros.service.ts:63-74`
- **Síntoma**: el bot chequea duplicado (`existeRpTernero`) y luego el service chequea de nuevo dentro del create. Dos roundtrips antes del insert.
- **Fix**: eliminar el check del controller; confiar en el service (que ya lanza 409).
- **Esfuerzo**: XS

#### [SEV-MED] Selección por nombre del bot — match ambiguo
- **Archivo**: `bot.controller.ts:385-388, 486-489`
- **Síntoma**: `establecimientos.find(e => e.nombre.toLowerCase().includes(selStr.toLowerCase()))` — si dos campos comparten substring (ej: "La Esperanza" y "La Esperanza Sur"), elige el primero sin pedir desambiguación.
- **Fix**: si hay más de un match, devolver lista y pedir aclaración.
- **Esfuerzo**: XS

#### [SEV-MED] `bot.controller.registrarLote` ambigüedad `body.acciones || body`
- **Archivo**: `bot.controller.ts:927`
- **Síntoma**: `const acciones = body.acciones || body;` — si llega un objeto sin `acciones`, lo trata como una acción única vía `Array.isArray` chequeo, pero la lógica es frágil.
- **Fix**: validar shape con DTO + `class-validator`; rechazar inputs malformados.
- **Esfuerzo**: S

#### [SEV-MED] `helmet` con defaults — sin CSP custom
- **Archivos**: `ms-nestjs-bussines/src/main.ts:14`, `ms-nestjs-security/src/main.ts:14`
- **Síntoma**: helmet aplica defaults razonables. No es bug, pero el header `Strict-Transport-Security` no se evalúa si el front conecta directo y EasyPanel proxy maneja TLS.
- **Fix**: validar que detrás del proxy se vean los headers correctos (no es código).
- **Esfuerzo**: XS

#### [SEV-MED] `terneros.service.ts:629` — `vendidos = 0` hardcodeado
- **Archivo**: `terneros.service.ts:629`
- **Síntoma**: dashboard reporta "vendidos: 0" siempre porque el enum `estado` solo tiene `['Vivo', 'Muerto']`. Frontend muestra el dato y miente al usuario.
- **Fix**: o eliminar el campo del response, o agregar `'Vendido'` al enum (con migración).
- **Esfuerzo**: XS / M (según decisión de producto).

#### [SEV-MED] Pesajes guardados en string `"|"`-separado
- **Archivo**: `terneros.entity.ts:52, 201-212`
- **Síntoma**: `estimativo: text` con formato `"DD/MM:peso|DD/MM:peso"`. Parsing manual, sin validación, sin index para queries por fecha, no funciona con años distintos.
- **Fix (futuro)**: tabla `pesajes_terneros` con columnas tipadas.
- **Esfuerzo**: L

### LOW

#### [SEV-LOW] `EstablecimientoGuard` permite admin con `id_establecimiento = null`
- **Archivo**: `establecimiento.guard.ts:39-43`
- **Síntoma**: admin sin establecimiento entra a endpoints protegidos. Sumado al CRIT de findAll sin filtro → leak.
- **Fix**: misma corrección que el HIGH de findAll: si admin pasa sin establecimiento, exigir `?id_establecimiento=`.
- **Esfuerzo**: XS (depende del fix de findAll).

#### [SEV-LOW] `users.service.search` sin filtro por establecimiento
- **Archivo**: `users.service.ts:228-236`
- **Síntoma**: busca en TODOS los usuarios (aunque el endpoint que la consume puede no estar expuesto — no se encontró en el controller).
- **Fix**: si se expone, agregar filtro de establecimiento.
- **Esfuerzo**: XS

#### [SEV-LOW] Códigos HTTP inconsistentes en errores
- **Síntoma**: en muchos services el `catch` envuelve cualquier error en `INTERNAL_SERVER_ERROR`, perdiendo el código original (ej: `findOne` lanza `NotFoundException` y luego se atrapa y se reemplaza por 500).
- **Ejemplo**: `terneros.service.ts:313-318`, `madres.service.ts:199-203`.
- **Fix**: re-lanzar `HttpException` y `ForbiddenException` sin envolver (algunos services ya lo hacen, generalizar).
- **Esfuerzo**: S

#### [SEV-LOW] `auth.service.register` pre-valida campos que `class-validator` ya cubre
- **Archivo**: `auth.service.ts:34-39`
- **Síntoma**: duplicación. Si el DTO se relaja, el chequeo del service no.
- **Fix**: confiar en el DTO + `ValidationPipe({ whitelist: true })`.
- **Esfuerzo**: XS

---

## Plan priorizado (próximos 10 cambios)

| # | Cambio | Severidad | Esfuerzo |
|---|--------|-----------|----------|
| 1 | Eliminar fallback `\|\| 'secretKey'` en `jwt.strategy.ts:12` | CRIT | XS |
| 2 | Eliminar `idEstablecimiento = 1` default en `bot.controller.ts:541-543` y rechazar input | CRIT | XS |
| 3 | Ignorar `body.id_establecimiento` en bot; resolver solo desde phone | HIGH | XS |
| 4 | Eliminar logs de API key en `api-key.guard.ts:19-20` | HIGH | XS |
| 5 | Verificación de pertenencia en `establecimientos.controller`: `GET/PUT/DELETE /:id`, `:id/equipo`, `:id/equipo/:userId` | CRIT | S |
| 6 | Verificación de pertenencia en `invitaciones.controller.revocar` | CRIT | XS |
| 7 | `synchronize: false` en bussines + migración inicial | CRIT | XS + M |
| 8 | Bloquear admin sin establecimiento en `findAll` de terneros/madres/eventos | HIGH | S |
| 9 | Forzar filtro `id_establecimiento` siempre en `findOne` de terneros/madres | HIGH | S |
| 10 | Validación pertenencia en `users.controller` (toggle, change-role, sync, delete) | HIGH | S |

---

## Riesgos no mitigables sin decisiones de producto

1. **Multi-establecimiento por admin**: el modelo asume que un admin puede pertenecer a varios campos (`userEstablecimientos`). Toda la lógica multi-tenant depende de cómo se decida el "campo activo" — hoy se infiere del token sin un selector explícito en la mayoría de endpoints. **Decisión**: ¿el frontend siempre envía `?id_establecimiento=` y el backend lo verifica? ¿O hay un "campo activo" persistido?
2. **Estado de animales**: el enum `['Vivo', 'Muerto']` no soporta "Vendido" o "Transferido" que el dashboard ya muestra. **Decisión**: agregar al enum, o quitar del response.
3. **Soft delete vs hard delete**: `users.service.remove` hace soft delete; `terneros/madres/eventos/establecimientos/invitaciones` hacen hard delete (`repository.remove`). Borrar un establecimiento con datos relacionados puede dejar FKs huérfanas. **Decisión**: política única (recomendado soft delete + `deleted_at`).
4. **Bot multi-turno**: el bot no recuerda contexto. Si el usuario manda "registrar ternero RP 123" y luego "peso 35", el bot trata cada mensaje aislado. **Decisión**: ¿agregar memoria por chat_id o seguir 1-mensaje-1-acción?
5. **Migraciones TypeORM**: hoy `synchronize: true` en bussines. Pasar a migraciones implica un primer "snapshot" desde la DB actual de producción. **Decisión**: ventana de mantenimiento para correr la migración inicial.

---

## Items no auditados (pasan a Sesión 2/3 o follow-up)

- `eventos`, `tratamientos`, `diarrea-terneros`, `rodeos`, `resumen-salud`, `alerts` — revisé `eventos` por grep, mismo patrón de multi-tenancy que terneros/madres. **Asumir mismos bugs hasta verificación**.
- Sesión 2: prompt de Claude, robustez de n8n, validación de payloads.
- Sesión 3: frontend (UX, hydration, re-renders, consistencia).
