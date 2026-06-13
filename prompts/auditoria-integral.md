# AUDITORÍA INTEGRAL — Sistema TerneData (Ganadería)

## CONTEXTO DEL SISTEMA

Aplicación de gestión ganadera con arquitectura de microservicios:
- **ms-nestjs-security**: NestJS, JWT, TypeORM, PostgreSQL — autenticación
- **ms-nestjs-bussines**: NestJS, TypeORM, PostgreSQL — lógica de negocio
  Módulos: terneros, madres, rodeos, eventos, tratamientos, diarrea-terneros, resumen-salud, establecimientos, invitaciones, users, alerts, bot
- **ganaderia-web-service**: Next.js (App Router), Redux Toolkit, Axios, TailwindCSS
- **n8n workflow + Claude API + Groq Whisper**: bot conversacional (Telegram + WhatsApp)
  Flujo: Telegram/WSP → adaptador → /bot/estado → Claude → /bot/registrar(-lote) → respuesta
- **DB**: PostgreSQL multi-establecimiento (un usuario puede pertenecer a varios)
- **Deploy**: Docker + Easypanel

## OBJETIVO

Auditoría completa del sistema para detectar:
1. Bugs activos
2. Bugs latentes (van a explotar con más usuarios o datos)
3. Riesgos de seguridad
4. Cuellos de botella de performance
5. Inconsistencias arquitectónicas
6. Deuda técnica priorizada

Y proponer un plan de remediación ordenado por impacto/esfuerzo.

## REGLAS DE ANÁLISIS

1. **Evidencia obligatoria**: cada hallazgo debe citar `archivo:línea` con la cita exacta del código problemático.
2. **No teorías**: si decís "podría pasar X", reproducí o demostrá la condición. Sin pruebas → no lo reportes.
3. **Priorización honesta**: distinguí entre "rompe en producción hoy" vs "code smell". No infles severidades.
4. **Cero scope creep**: no propongas reescrituras. Propone el cambio mínimo que arregla el problema.
5. **Considera multi-tenancy**: el sistema es multi-establecimiento. Cualquier query sin filtro por establecimiento es un bug crítico.

## DIMENSIONES A AUDITAR

### 1. CORRECTNESS — bugs que rompen funcionalidad
- IDs hardcodeados que deberían venir del contexto (ej: `id_establecimiento: 1` en el prompt del bot)
- Validaciones faltantes en DTOs
- Race conditions en operaciones concurrentes
- Manejo de fechas/zonas horarias (Argentina = America/Argentina/Buenos_Aires)
- Fugas multi-tenant: queries que no filtran por `id_establecimiento` y mezclan datos de campos
- Estados imposibles: defaults que ocultan datos faltantes (ej: peso = 0)
- Códigos de error genéricos que esconden la causa real

### 2. SECURITY
- Endpoints sin guard de autenticación o roles
- Inyección SQL en queries dinámicas (TypeORM raw)
- Secretos en código o en .env commiteados
- API keys hardcodeadas (revisá `bot.controller.ts`, n8n workflow)
- CORS demasiado abierto
- Tokens JWT con TTL incorrecto
- Falta de rate limiting en endpoints sensibles
- Validación de entrada insuficiente (bot_link_token, payloads de bot)
- Privilege escalation: usuario puede tocar datos de otro establecimiento

### 3. PERFORMANCE
- Queries N+1 (relaciones cargadas en loop)
- Falta de índices en columnas frecuentemente filtradas (rp, telefono, id_establecimiento, fecha_*)
- Listados sin paginación con `LIMIT 500` cosméticos
- Payloads gigantes en respuestas (carga de relaciones innecesarias)
- Re-renders en frontend (objetos inline en props, falta de useMemo/useCallback donde corresponde)
- Bundle size, imports innecesarios
- Llamadas serializadas que podrían ser paralelas

### 4. CONSISTENCIA
- Nombres de campos divergentes entre backend ↔ frontend (camelCase vs snake_case)
- Códigos de respuesta HTTP inconsistentes
- Formato de errores: a veces `{ message }`, a veces `{ error }`, a veces string
- Convenciones de nombre divergentes entre módulos
- Audio prompt vs texto prompt en n8n: ¿están sincronizados?
- Defaults inconsistentes (turno: "mañana" vs "manana")

### 5. ROBUSTEZ
- ¿Qué pasa si Claude devuelve JSON mal formado?
- ¿Qué pasa si Groq Whisper devuelve vacío?
- ¿Qué pasa si Telegram chat ID se duplica entre usuarios?
- ¿Reintentos? ¿Timeouts? ¿Idempotencia?
- Mensajes de error al usuario: ¿útiles o genéricos?
- Estados de carga/vacío/error en frontend (todos los listados, formularios, dashboard)
- Comportamiento offline / con red intermitente

### 6. ARQUITECTURA
- Lógica de negocio en controladores (debería estar en services)
- Acoplamiento entre módulos (módulo X importa entidad de módulo Y directamente)
- DTOs duplicados entre security y bussines
- Falta de capa de validación entre n8n → backend (el bot recibe lo que Claude diga)
- Estado del bot mezclado con datos del usuario (`bot_establecimiento_id` en la entidad User)

### 7. UX / FRONTEND
- Páginas sin loading state, error state, empty state
- Formularios sin feedback de validación
- Acciones destructivas sin confirmación
- Responsive: ya hay listados con cards/tabla, ¿el resto?
- Accesibilidad básica (labels, focus, contraste)
- Hydration mismatches en Next.js (uso de localStorage en SSR)

### 8. BOT — específico
- Calidad del prompt: ¿maneja ambigüedad? ¿mensajes no accionables? ¿saludos?
- Multi-turno: ¿el bot recuerda contexto entre mensajes?
- ¿Detecta cuando el usuario quiere CONSULTAR vs REGISTRAR?
- Tolerancia a errores ortográficos / regionalismos
- Acciones peligrosas: ¿requiere confirmación para registrar?
- Fallback claro cuando no entiende

### 9. OBSERVABILIDAD
- Logs estructurados o `console.log` sueltos
- Trazabilidad de un mensaje del bot end-to-end
- Métricas: latencia por endpoint, tasa de error
- Alertas en producción

### 10. DATOS
- Migrations versionadas o `synchronize: true` en TypeORM (peligroso)
- Backup strategy
- Soft delete vs hard delete consistente
- Campos nullables que no deberían serlo (y al revés)

## ENTREGABLE

Producí un documento `AUDITORIA.md` con esta estructura:

### Resumen ejecutivo (5 líneas)
Estado general del sistema. Los 3 problemas más graves nombrados.

### Hallazgos por severidad

Para cada hallazgo:
```
[SEV-CRIT|HIGH|MED|LOW] <título corto>
Archivo: path:línea
Síntoma: qué se rompe / cuándo
Causa: por qué pasa
Fix propuesto: cambio mínimo concreto (con diff si es trivial)
Esfuerzo: XS|S|M|L
```

### Plan priorizado
Lista ordenada de los próximos 10 cambios a hacer, con justificación.

### Riesgos no mitigables sin decisiones de producto
Cosas que requieren decisión del dueño (no se pueden arreglar técnicamente solo).

## PROHIBIDO
- Sugerir cambios "por las dudas" o "por buenas prácticas" sin caso concreto
- Reescribir módulos enteros
- Agregar dependencias nuevas salvo justificación fuerte
- Cambios cosméticos (formato, nombres) salvo que afecten funcionalidad
- Inventar bugs sin reproducir
- Pasar por alto bugs reales por miedo a tocar código

Empezá por explorar la estructura del proyecto, después auditá módulo por módulo. No saltees a conclusiones.

## EJECUCIÓN POR PARTES (recomendado)

Auditoría dividida en 3 sesiones para mantener foco y controlar costo de tokens:

**Sesión 1 — Backend (ms-nestjs-bussines + ms-nestjs-security)**
Foco: correctness, security, multi-tenancy, performance de queries

**Sesión 2 — Bot (n8n workflow + bot.controller + Claude prompts)**
Foco: prompt quality, robustez, validación de payloads, manejo de ambigüedad

**Sesión 3 — Frontend (ganaderia-web-service)**
Foco: estados UX, hydration, re-renders, consistencia con backend

Para arrancar una sesión, decir al agente: "Ejecutar auditoría — Sesión N — usando prompt en `prompts/auditoria-integral.md`"
