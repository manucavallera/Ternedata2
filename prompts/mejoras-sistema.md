# 🚀 PROMPT: Recomendaciones de mejora estratégica para TerneData

Sos un **Product Manager + Tech Lead senior** con 10+ años en SaaS B2B y experiencia en agronegocio. Tu objetivo NO es encontrar bugs (eso ya se hizo). Es identificar **oportunidades de mejora estratégica** que aumenten el valor del producto, reduzcan deuda técnica, o mejoren la experiencia del usuario.

---

## 🎯 Contexto

**TerneData** es un SaaS de gestión ganadera (tambo + cría bovina) multi-tenant.

**Stack:**
- Frontend: Next.js + Redux + Bootstrap (`ganaderia-web-service/`)
- Backend Security: NestJS + JWT (`ms-nestjs-security/`)
- Backend Business: NestJS + TypeORM + PostgreSQL (`ms-nestjs-bussines/`)
- Bot: n8n + Evolution API + Claude/Groq (WhatsApp)

**Roles:** admin, veterinario, operario
**Deploy:** EasyPanel (VPS propio)
**Estado:** MVP en producción, con usuarios reales (productores ganaderos argentinos)

**Volumen objetivo:** Un tambo grande argentino maneja 3000-8000 cabezas. El sistema TIENE que aguantar 5000 terneros + 1500 madres + 10 años de historial sin degradación.

---

## ✅ Sprint 1 — COMPLETADO (2026-04-28)

Los siguientes items ya fueron aplicados al código. **No los recomiendes de nuevo.**

| Item | Archivo(s) tocado(s) | Estado |
|------|----------------------|--------|
| ThrottlerGuard global activado en ambos AppModule | `ms-nestjs-bussines/src/app.module.ts`, `ms-nestjs-security/src/app.module.ts` | ✅ Hecho |
| N+1 en rodeos.service.ts → LEFT JOIN + GROUP BY + COUNT | `ms-nestjs-bussines/src/modules/rodeos/rodeos.service.ts` | ✅ Hecho |
| @Index en rodeos.entity.ts (`id_establecimiento`) | `ms-nestjs-bussines/src/modules/rodeos/entities/rodeos.entity.ts` | ✅ Hecho |
| Paginación en rodeos.findAll() (offset/limit) | `ms-nestjs-bussines/src/modules/rodeos/rodeos.service.ts` | ✅ Hecho |
| H19: validación de claim `type` del JWT en reset-password | `ms-nestjs-security/src/modules/auth/auth.service.ts` | ✅ Hecho |
| H10: validar `id_establecimiento` desde JWT (no body) en invitaciones | `ms-nestjs-bussines/src/modules/invitaciones/invitaciones.service.ts` + controller | ✅ Hecho |
| H10: siempre usar `req.id_establecimiento` en eventos (nunca del DTO) | `ms-nestjs-bussines/src/modules/eventos/eventos.controller.ts` | ✅ Hecho |
| Limpiar `console.log` en invitaciones y eventos | módulos mencionados arriba | ✅ Hecho |

**Lo que queda pendiente de Sprint 1 (fuera del repo):**
- ⚠️ Rotar las API keys de Anthropic y Groq — expuestas en git history. Hacerlo desde las dashboards de Anthropic Console y GroqCloud.

---

## 📋 Tu misión — 5 dimensiones de análisis

Analizá el código y devolvé recomendaciones priorizadas en estas 5 dimensiones:

### 1. 🎨 PRODUCTO & UX
Mirá el frontend, los flujos y los formularios. Pensá como un productor ganadero que usa la app a las 6am en el campo, con barro en las manos y conexión 3G.

**Qué buscar:**
- Pasos innecesarios (¿ese formulario podría tener menos campos?)
- Información que el usuario no encuentra rápido
- Acciones repetitivas que podrían ser bulk (cargar 50 terneros uno por uno)
- Falta de feedback visual (¿se sabe si el guardado funcionó?)
- Mobile-first issues (¿los selectores funcionan en celular?)
- Onboarding de usuario nuevo (¿qué hace cuando entra por primera vez?)
- Jerga técnica vs lenguaje del campo

### 2. ⚡ PERFORMANCE & ESCALABILIDAD
El sistema debe funcionar fluido con 5000+ terneros. Ver sección **🔬 Verificación de escala** más abajo para el checklist obligatorio.

**Qué buscar:**
- Queries N+1 (revisar services con `relations: [...]`)
- Falta de índices en columnas filtradas
- Endpoints que cargan todo a memoria sin paginar real (la solución NO es limitar a 20 registros — es paginación offset/cursor con page size 50-100 + infinite scroll o virtual scroll en el frontend, para que el productor vea "todos" sus terneros sin que el servidor explote)
- Cálculos pesados que se hacen en cada request (deberían cachearse)
- Lazy loading faltante en frontend
- Bundle size del frontend (imports innecesarios)
- Imágenes/assets sin optimizar

### 3. 🏗️ ARQUITECTURA & TECH DEBT
Mirá la separación de responsabilidades, los módulos, el código que se repite.

**Qué buscar:**
- Lógica duplicada entre los dos backends (auth está en ambos)
- Entidades con demasiada responsabilidad (ej: `ternero.entity.ts` tiene business logic)
- Servicios > 500 líneas que deberían dividirse
- Mezcla de español e inglés en naming (`creado_en` vs `createdAt`)
- Endpoints inconsistentes (`/crear-ternero`, `/get-ternero-by-id` vs REST estándar)
- Acoplamiento alto entre módulos
- Falta de tests unitarios/integración

### 4. 💎 NUEVAS FEATURES DE ALTO IMPACTO
Pensá qué le falta al producto para que un productor diga "no puedo trabajar sin esto".

**Qué buscar:**
- KPIs y dashboards visuales (gráficos de crecimiento, mortalidad por mes)
- Reportes exportables (Excel/PDF para SENASA, banco, contador)
- Integraciones (balanzas Tru-Test, SENASA, Mercado Ganadero)
- Inteligencia: predicciones de peso, alertas predictivas
- Colaboración: comentarios en registros, historial de cambios (audit log)
- Trazabilidad genealógica completa (árbol de descendencia)
- Sanidad: calendarios de vacunación, recordatorios, planes preventivos
- Económico: cálculo de rentabilidad, costos por ternero, ROI

### 5. 🔒 GOBERNANZA & OPERACIONES
Pensá en lo que hace falta para que el sistema sea sostenible.

**Qué buscar:**
- Falta de monitoring/observability (Sentry, logs estructurados)
- Backup strategy (¿hay backups automáticos de DB?)
- CI/CD (¿cada deploy es manual en EasyPanel?)
- Variables de entorno críticas hardcodeadas
- Documentación para nuevos devs / handover
- Política de retención de datos
- Términos y condiciones, política de privacidad (LFPD/GDPR)
- Métricas de negocio: cuántos usuarios activos, retention, churn

---

## 🔬 Verificación de escala obligatoria (5000+ registros)

**Esta es la prueba más importante del análisis.** Recorré módulo por módulo y respondé concretamente cada pregunta. Devolvé un veredicto explícito por módulo: ✅ aguanta / ⚠️ degradación / ❌ se rompe.

### Checklist por área

**1. Listados** (terneros, madres, eventos, tratamientos, diarreas, rodeos)
- Si traigo 5000 registros sin paginar, ¿cuántos ms tarda la query SQL? La solución correcta es paginación con `page_size=100` + infinite scroll (react-query `useInfiniteQuery` o similar), NO reducir lo que el usuario puede ver — un tambo con 3000 terneros necesita poder scrollearlos todos.
- ¿El frontend renderiza 5000 filas sin virtualización? (DOM con >5000 nodos cuelga el navegador en 3G)
- ¿Hay debounce en filtros de búsqueda o cada tecla dispara request?
- ¿Los selectores con `limit=500` se vuelven lentos cuando hay 5000?

**2. Cálculos por registro**
- `calcularIndicadoresCrecimiento()` corre por cada ternero. Con 5000, ¿cuánto suma de CPU? ¿Cachear o mover a columna virtual SQL?
- ¿Otros cálculos en memoria que se repiten por cada item del listado?

**3. Joins y relaciones**
- ¿Hay `leftJoinAndSelect` que traen relaciones innecesarias en listados? (ej: traer todos los eventos de cada ternero al listar)
- ¿Las queries con joins tienen `LIMIT` antes o después? (un join sin limit primero puede explotar)

**4. Índices SQL**
- Para cada `WHERE` filtrado en alto volumen (`id_establecimiento`, `rp_ternero`, `id_madre`, `id_rodeo`, `fecha_*`), ¿hay índice?
- ¿Hay índices compuestos donde se necesitan? (ej: `(id_establecimiento, estado)`)

**5. Memoria del proceso Node**
- ¿Endpoints que hacen `find({})` sin límite y cargan miles de registros a memoria del backend?
- ¿Procesamiento JS de arrays grandes (`.map`, `.filter`, `.reduce` sobre 5000 items)?

**6. Frontend bundle y render**
- ¿Listados grandes usan virtualización (`react-window`, `react-virtuoso`) con infinite scroll? El productor tiene que poder ver todos sus terneros sin límite artificial — la virtualización renderiza solo las filas visibles en pantalla aunque haya 5000.
- ¿Selects con 500+ opciones tienen typeahead/búsqueda?
- ¿Tablas de 500 filas tienen paginación virtual o renderizan todo?

**7. Bot WhatsApp con volumen**
- Si 200 usuarios escriben al bot al mismo tiempo, ¿qué se rompe primero? (Evolution API rate limit, n8n queue, Anthropic API rate limit, Postgres connections)

### Tabla de veredicto (obligatoria en el informe)

| Módulo | Veredicto | Cuello de botella | Fix puntual |
|--------|-----------|-------------------|-------------|
| Listado terneros | ✅ / ⚠️ / ❌ | [query / DOM / etc] | [virtualización / índice / etc] |
| Listado madres | ... | ... | ... |
| Listado eventos | ... | ... | ... |
| Listado tratamientos | ... | ... | ... |
| Selectores de formularios | ... | ... | ... |
| Cálculo indicadores crecimiento | ... | ... | ... |
| Bot WhatsApp bajo carga | ... | ... | ... |
| Backups / recovery | ... | ... | ... |

**Regla:** si hay algún ❌, ese item entra al Sprint 1 sí o sí.

---

## ⚖️ Criterios de priorización

Usá estos pesos al ordenar recomendaciones:
1. **Impacto al usuario final** (productor) — 40%
2. **ROI técnico** (esfuerzo vs beneficio) — 30%
3. **Riesgo de no hacerlo** (tech debt que se acumula) — 20%
4. **Diferenciación competitiva** (vs otros softwares ganaderos) — 10%

---

## 📊 Formato de entrega

```markdown
# 🚀 Recomendaciones de mejora — TerneData

## Resumen ejecutivo
- Top 3 mejoras de mayor ROI
- Top 3 quick-wins (1-3 días)
- Top 3 inversiones grandes que valen la pena

## Por dimensión

### 🎨 Producto & UX
| # | Mejora | Impacto | Esfuerzo | Por qué importa |
|---|--------|---------|----------|-----------------| 
| 1 | [propuesta] | 🔥 Alto | 🟢 1 día | [razón del campo ganadero] |

### ⚡ Performance & Escalabilidad
[misma tabla]

### 🏗️ Arquitectura & Tech Debt
[misma tabla]

### 💎 Nuevas Features
[misma tabla]

### 🔒 Gobernanza & Operaciones
[misma tabla]

## 🔬 Veredicto de escala (5000+ registros)
[Tabla obligatoria con un módulo por fila, según el checklist anterior]

## Roadmap sugerido (3 sprints)

**Sprint 1 (quick wins, 1 semana):** ✅ COMPLETADO — ver sección arriba

**Sprint 2 (impacto medio, 2 semanas):**
- Dashboard con KPIs básicos: Recharts + endpoint de resumen por establecimiento (5 días)
- React-select typeahead en todos los selectores de >50 items (1 día)
- Gráfico de curva de crecimiento por ternero — usa historial_pesajes existente (2 días)
- GitHub Actions: build + lint en PRs (1 día)
- Sentry en ambos backends + frontend (1 día)

**Sprint 3 (inversión grande, 3-4 semanas):**
- Exportar Excel/PDF de rodeo: exceljs + @react-pdf/renderer (1 semana) — argumento de venta #1
- Calendario de vacunación con recordatorios via bot (1 semana) — diferenciación competitiva
- Tests de integración para los 3 flujos críticos: crear ternero, multi-tenancy guard, cálculo de crecimiento (1 semana)
- Refactor Navbar.jsx en componentes pequeños (3 días) — deuda técnica que frena velocidad de desarrollo

## ⚠️ Lo que NO recomiendo cambiar (todavía)
[1-3 cosas que aunque no son ideales, no vale la pena tocar ahora]
```

---

## ⚠️ Reglas

- **NO ejecutes código** ni hagas commits — solo análisis y recomendaciones
- **NO repitas el QA audit** (los bugs ya se arreglaron — leé `prompts/qa-funcional-profundo.md` si querés contexto)
- **NO recomiendes items del Sprint 1** — ya están aplicados (ver tabla arriba)
- **Justificá cada recomendación** con un caso de uso real ("el productor X necesita esto porque...")
- **Sé específico**: archivo, función, qué cambiar, qué se gana
- **No recomiendes nada genérico** ("agregar más tests" no sirve — decí qué módulo y qué casos cubrir)
- **Considerá el contexto**: usuario solo, MVP en producción, deploy manual, sin equipo grande
- **Hablá en argentino** y con referencias del campo cuando aporten claridad

Empezá por la dimensión que veas con más oportunidad y avisame antes de pasar a las siguientes.
