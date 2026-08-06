---
name: Estado del proyecto Ternedata
description: Qué cambios se implementaron y qué queda pendiente
type: project
originSessionId: 00ff5f96-f190-4f62-9ba9-2bc7dea08b22
---
## Cambios implementados (todas las sesiones)

### Seguridad
- Credenciales Gmail hardcodeadas eliminadas → usan `process.env.MAIL_USER` / `process.env.MAIL_PASS`
- URL `http://localhost:3002` hardcodeada → `process.env.FRONTEND_URL`
- `.env` files ya no se suben a git
- `.env.example` creado en ambos servicios backend

### Modelo de administración global (sesión 2026-08-06)
- Se formalizó el rol global `super_admin` en security y business; reemplaza el hack anterior basado en `userId === 2`.
- `super_admin` puede ver todos los establecimientos y usuarios; los roles `admin`, `veterinario` y `operario` siguen siendo de alcance por establecimiento.
- Commits desplegables: backend principal `21752c3`, `1733976`, `042fae5`; frontend desktop `78a3750`; mobile `8b6bcd6`.
- La cuenta de Manuel (`manucavallera44@gmail.com`) fue promovida manualmente en DB con `rol = 'super_admin'`; requiere logout/login para renovar JWT.
- Pendiente/recomendado: panel `/super-admin` separado, selector persistente de establecimiento, edición de roles por establecimiento, vista global usuario→campos→animales, auditoría de cambios, 2FA para superadmin y confirmaciones para acciones destructivas.
- Auditoría propuesta: tabla de eventos con actor, acción, entidad, `target_user_id`, `id_establecimiento`, metadata, IP/UA y fecha; registrar cambio de rol, alta/baja, invitaciones, asignaciones y modificaciones sensibles.

### Funcionalidades nuevas
- **Asignar madres a rodeos**: endpoints `POST /rodeos/:id/asignar-madres` y `POST /rodeos/:id/desasignar-madres`
- **Paginación**: madres y terneros devuelven `{ data, total, page, limit, totalPages }`
- **Búsqueda y filtros**: param `?search=` en madres y terneros, filtro por estado
- **Equipo del establecimiento**: `GET /establecimientos/:id/equipo` y `DELETE /establecimientos/:id/equipo/:userId`
- **Invitaciones pendientes**: `GET /invitaciones/pendientes/:id` y `DELETE /invitaciones/revocar/:id`
- **TeamManager reescrito**: lista real de miembros, modal de invitación, tab pendientes con revoke. Botón 🔄 para refrescar
- **Password reset**: `POST /auth/forgot-password` y `POST /auth/reset-password`
- **Perfil de usuario**: página `/perfil` con editar datos y cambiar contraseña
- **Dockerfile frontend**: `ENV PORT=3002` y `ENV HOSTNAME=0.0.0.0` para Next.js standalone en EasyPanel

### Sistema de invitaciones (flujo completo y corregido — commit 2b1d689)
Flujo correcto implementado y verificado localmente:
1. Admin invita → link con `?token=UUID&email=xxx` (email opcional)
2. Invitado abre link → pantalla con botones login/register, email pre-llenado
3. Se registra con token → queda como `operario` → loguea
4. Login: corre `aceptar-automatico` (para invitaciones con email) + si hay `pendingInviteToken` → redirige a `/join?token=UUID`
5. Join acepta invitación → `refrescarYRedirigir()` → JWT fresco con `id_establecimiento` → dashboard directo (sin re-login)

**Bugs corregidos en esta sesión (2026-04-06):**
- `login/page.jsx`: `pendingInviteToken` se borraba sin procesar → invitaciones sin email quedaban `usado: false` para siempre
- `join/page.jsx`: al aceptar exitosamente forzaba re-login innecesario; ahora usa `refrescarYRedirigir()` → dashboard directo

### Diseño de roles
- Registro libre (sin invitación) → `rol: 'admin'` → ve pantalla "Creá tu establecimiento" (`SetupEstablecimiento.jsx`)
- Registro con token de invitación → `rol: 'operario'` → acepta invitación en join → accede al establecimiento del admin
- `dashboard/page.jsx`: detecta admin sin establecimiento → muestra SetupEstablecimiento

### Variables de entorno necesarias en EasyPanel
Tanto `ms-nestjs-bussines` como `ms-nestjs-security` necesitan:
```
MAIL_USER=manucavallera44@gmail.com
MAIL_PASS=zswe bmll xoxd qftf
FRONTEND_URL=https://manu-frontendganaderia.gygo4l.easypanel.host
```

### Bug loop selección de establecimiento (sesión 2026-04-13 — EN PROGRESO)

**Problema**: cuando el bot pregunta "¿En qué establecimiento querés registrar?" y el admin responde "1", el bot vuelve a preguntar en loop.

**Causa raíz identificada**: Evolution API dispara webhooks para mensajes ENVIADOS por el bot (ecos). Estos ecos pasan por n8n y confunden a Claude que devuelve `{"accion":"cambiar_establecimiento"}`.

**Intentos fallidos**:
- Filtro `key.fromMe + humanSources` → Evolution API manda los mensajes del bot con `source: "web"`, igual que el usuario
- Deshabilitar `fromMe` en webhook de Evolution API via API → esa versión no lo soporta

**Solución implementada (pendiente de prueba)**:
- Se agregó nodo `¿Es eco del bot?` (Code node) entre Adaptador WhatsApp y Verificar Estado
- Filtra mensajes que empiezan con emojis del bot (`✅`, `🔄`, `🏠`, `⚠️`, etc.) O que contienen "establecimiento" con salto de línea
- Archivo: `TerneData Bot v8.json` en el escritorio — **pendiente importar y probar mañana 2026-04-14**

**Detalle técnico**: el eco de "✅ Listo! Registrando en *Estancia Durazno*" no contenía "establecimiento" pero confundía a Claude por "Estancia". Por eso se agregó también el filtro de emojis.

**Workflow actual**: path `whatsapp-bot`, bot de Gabi desactivado temporalmente para pruebas (usa `mensajes-entrantes`). Pendiente armar router para convivir ambos workflows.

### Integración n8n + WhatsApp (sesión 2026-04-09)
- Bot funcionando end-to-end: WhatsApp → n8n → backend → DB
- Probado: crear_ternero, crear_madre, crear_evento, crear_diarrea, lote (múltiples acciones)
- URL de producción confirmada: `https://manu-bussines.gygo4l.easypanel.host/bot/registrar`
- Acceso DB externo: `173.249.36.67:54320` (postgres / Manuelo12* / Ganaderia)
- **Bug encontrado y corregido localmente**: tratamiento se creaba sin vincular al ternero (enviaba `ternero: { id_ternero }` en vez de `id_ternero` directo) — fix en `bot.controller.ts:545` — **pendiente commit + push + redeploy en EasyPanel**

### Fixes sesión 2026-04-15

- **Navbar mobile**: botones Login/Registro eran `hidden lg:flex` → invisibles en mobile para usuarios no autenticados. Fix: `flex` cuando no autenticado, `hidden lg:flex` cuando autenticado.
- **Formulario-Madre.jsx vaciado**: el archivo fue borrado accidentalmente en commit `94e99af`. Restaurado desde commit `e77d876` (314 líneas). Causaba React error #130 ("Element type is invalid: got object") al loguear.

### Auditoría integral (sesión 2026-05-16)

`AUDITORIA.md` generado con hallazgos CRIT/HIGH/MED/LOW para Sesión 1 (Backend).
**Todos los CRIT+HIGH corregidos y commiteados** (ver commit más reciente).

**Pendiente de deploy en EasyPanel:**
- `ms-nestjs-security`: nueva columna `password_reset_jti VARCHAR(36)` — requiere migración manual:
  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_jti VARCHAR(36);
  ```
- `ms-nestjs-bussines`: columna `bot_link_token` cambia de length 6→8 (TypeORM actualiza sola en dev; en prod idem migración)
- Ambos servicios redesplegar tras push

**Sesión 2 (bot/n8n) — 2026-05-16 — FIXES APLICADOS:**

Backend commiteado (`fix(bot): fechas del body...`):
- `parsearFecha()`: respeta fecha del body, rechaza futuras/inválidas
- `crear_ternero`: rechaza RP ≤ 0 explícitamente
- `crear_diarrea`: acepta `fecha_diarrea_ternero` y `fecha_diarrea`
- `registrarLote`: resuelve auth una sola vez (evita N+1)

n8n workflow editado en disco (no en git, .gitignore):
- 5 API keys → `$env.ANTHROPIC_API_KEY`, `$env.GROQ_API_KEY`, `$env.EVOLUTION_API_KEY`, `$env.BOT_API_KEY`
- Filtro eco WhatsApp → `key.fromMe === true` (sin string-matching)
- Filtro eco Telegram → pass-through (no necesario)
- Prompt: `id_establecimiento` eliminado, `fecha_diarrea` → `fecha_diarrea_ternero`
- Prompt: texto usuario en `<user_message>`, sistema en campo `system`
- `max_tokens` 1500 → 800
- Retries Claude API: 3 intentos, 2s
- `Limpiar JSON`: valida tipos numéricos, accion ∈ enum, severidad diarrea

**PENDIENTE — acciones del usuario (Manuel):**
1. **ROTAR CLAVES** (CRIT — hacerlo ya):
   - Anthropic: console.anthropic.com → API Keys → nueva key → EasyPanel n8n env `ANTHROPIC_API_KEY`
   - Groq: console.groq.com → API Keys → nueva key → EasyPanel n8n env `GROQ_API_KEY`
   - Evolution API: panel admin → nueva apikey → EasyPanel n8n env `EVOLUTION_API_KEY`
   - Bot backend: cambiar `BOT_API_KEY` en EasyPanel ms-nestjs-bussines → EasyPanel n8n env `BOT_API_KEY`
2. **Reimportar workflow n8n** desde `n8n-workflows/TerneData Bot v18.json`
3. **Webhook HMAC** (HIGH): configurar `webhookSecret` en Evolution API + validar `x-evolution-signature` en Adaptador WhatsApp
4. **Deploy backend**: push + redeploy `ms-nestjs-bussines` en EasyPanel
5. **Migración SQL** (de sesión 1, pendiente):
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_jti VARCHAR(36);
   ```

**Sesión 3 (frontend) — 2026-05-16 — FIXES APLICADOS:**

Commiteado (`fix(frontend): CRIT+HIGH+MED...`):
- `dashboard/page.jsx`: hooks movidos antes de early returns (Rules of Hooks violation)
- `Listado-Ternero.jsx:221`: `cargarTernerosList()` → `cargarTerneroLista()` (ReferenceError)
- `authContext.jsx:39`: `localStorage.clear()` → removeItem específico por clave
- `perfil/page.jsx:77`: validación contraseña 6 → 8 chars (alinear con backend)
- `login/page.jsx`: eliminado `console.log` de datos de sesión
- `layout.jsx`: `lang='en'` → `lang='es'`, metadata description actualizada
- `Navbar.jsx:266`: template literal redundante eliminado

**Pendiente Sesión 3 (MED/LOW, no urgente):**
- Navbar: fetch `GET /establecimientos` completo → usar `GET /establecimientos/:id` directo
- `styled-jsx` en Navbar → migrar a Tailwind/CSS Module
- `cargarPerfil` en useCallback con deps en `perfil/page.jsx`
- Error Boundaries por sección
- Modales sin atributos ARIA
- Gráfico de crecimiento usa índice en vez de días reales
- Profile dropdown comportamiento mixto click/hover

### Sesión 2026-05-18 — Bot funcionando end-to-end

- Fix IDs de nodos Claude en workflow (eran strings manuales, no UUIDs) → `TerneData Bot v18.json` corregido
- `N8N_BLOCK_ENV_ACCESS_IN_NODE` bloqueaba `$env.XXX` → solución temporal: keys hardcodeadas directo en nodos n8n
- `BOT_API_KEY` también estaba como `$env` → mismo fix
- Bot probado y funcionando: crear_ternero con fecha relativa ("ayer"), peso, sexo, madre; evento sanitario

### Sesión 2026-05-19 — Groq key rotada, bot 100% operativo

- Groq API key rotada en console.groq.com → actualizada en nodo HTTP Request (Whisper) con `Bearer gsk_xxx`
- Error 401 resuelto: faltaba prefijo `Bearer` en Authorization header
- Bot confirmado funcionando end-to-end: ternero RP 16, peso, sexo, fecha, establecimiento OK

## Pendientes

### Sesión 2026-08-06 — Próximo trabajo: panel global superadmin

- Diseño aprobado y guardado en `docs/superpowers/specs/2026-08-06-superadmin-panel-design.md`.
- Plan aprobado y guardado en `docs/superpowers/plans/2026-08-06-superadmin-panel.md`.
- Commits creados: `ffc176a` (diseño) y `3eb6781` (plan).
- No se modificó código de producción todavía.
- Primera etapa: Security como fuente de verdad; listar usuarios globales, email/rol/estado/establecimientos, cambiar rol, activar/desactivar; solo `super_admin`; mobile y auditoría quedan para etapas posteriores.
- Próximo paso: elegir ejecución `subagent-driven` o `inline`, luego implementar Task 1 del plan (contrato global Security + tests).
- Herramientas instaladas: RTK global, Code Review Graph construido/registrado, skills de Matt Pocock globales y Superpowers disponible.

| # | Item | Descripción |
|---|------|-------------|
| 1 | **Deploy security fixes** | Push + redeploy ms-nestjs-bussines y ms-nestjs-security en EasyPanel + migraciones SQL |
| 2 | Invitaciones stale en DB | Las 4 invitaciones con `usado: false` de pruebas anteriores deben revocarse manualmente desde TeamManager |
| 3 | Sistema de alertas | AlertsConfig y ResumenSalud existen en backend pero las notificaciones nunca se disparan |
| 4 | Exportar CSV/PDF | Para madres, terneros, tratamientos |
| 5 | Historial de pesos | Campo `estimativo` guarda pesos como string separado por `\|`. Debería ser tabla o JSON |
| 6 | Transacciones atómicas | Crear ternero + calostro + eventos debería ser atómico |
| 7 | Error Boundaries | Frontend no tiene Error Boundaries |
| 8 | docker-compose.yml | Para levantar todo local con un comando |
| 9 | ~~Auditoría Sesión 2~~ | ✅ Análisis hecho — fixes pendientes (ver `AUDITORIA.md` Sesión 2 plan priorizado) |
| 10 | ~~Auditoría Sesión 3~~ | ✅ CRIT+HIGH+MED corregidos — ver `AUDITORIA.md` Sesión 3 para MED/LOW restantes |
| 11 | Fixes MED/LOW | Ver AUDITORIA.md para lista completa |
| 12 | **ROTAR CLAVES n8n** | Anthropic + Groq + Evolution + bot key + Telegram creds (CRIT — hardcodeadas en `n8n-workflows/TerneData Bot v18.json`) |
