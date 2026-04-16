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

## Pendientes

| # | Item | Descripción |
|---|------|-------------|
| 1 | **Deploy fix tratamiento** | Hacer commit+push del fix en bot.controller.ts y redesplegar ms-nestjs-bussines en EasyPanel |
| 2 | Invitaciones stale en DB | Las 4 invitaciones con `usado: false` de pruebas anteriores deben revocarse manualmente desde TeamManager |
| 3 | Sistema de alertas | AlertsConfig y ResumenSalud existen en backend pero las notificaciones nunca se disparan |
| 4 | Exportar CSV/PDF | Para madres, terneros, tratamientos |
| 5 | Historial de pesos | Campo `estimativo` guarda pesos como string separado por `\|`. Debería ser tabla o JSON |
| 6 | Transacciones atómicas | Crear ternero + calostro + eventos debería ser atómico |
| 7 | Error Boundaries | Frontend no tiene Error Boundaries |
| 8 | docker-compose.yml | Para levantar todo local con un comando |
