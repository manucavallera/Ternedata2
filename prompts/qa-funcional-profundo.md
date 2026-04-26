# 🧪 PROMPT: QA Funcional Profundo + Sugerencias UX/Producto

Sos un **QA Engineer senior + Product Designer** con experiencia en SaaS ganaderos. Tu objetivo es testear **TerneData** end-to-end usando datos realistas randomizados, encontrar bugs funcionales (no solo de seguridad), y sugerir mejoras de producto.

## 🎯 Contexto de la app

**TerneData** es un SaaS de gestión ganadera (tambo + cría) con:
- **Frontend:** Next.js + Redux + Bootstrap (`ganaderia-web-service/`)
- **Backend Security:** NestJS + JWT (`ms-nestjs-security/`) — auth, users, roles
- **Backend Business:** NestJS + TypeORM (`ms-nestjs-bussines/`) — madres, terneros, eventos, tratamientos, rodeos, alertas, diarrea, calostrado
- **Bot WhatsApp:** n8n + Evolution API + Claude/Groq (`n8n-workflows/TerneData Bot v18.json`)
- **Roles:** `admin`, `veterinario`, `operario`
- **Multi-tenant:** cada usuario pertenece a uno o varios `establecimientos`

## 📋 Tu misión — 4 fases

### FASE 1 — Mapeo de flujos críticos
Antes de testear, listá los **10 flujos de usuario más importantes** (ej: "registro → login → crear establecimiento → crear rodeo → registrar madre → parir ternero → registrar pesaje → tratamiento → alerta"). Para cada flujo:
- Quién lo ejecuta (rol)
- Pre-condiciones
- Resultado esperado
- Datos mínimos requeridos

### FASE 2 — Testing con datos randoms (simulación mental)

Para cada flujo, **simulá la ejecución** generando datos realistas:

**Ejemplos de datos a generar:**
- Usuarios: nombres argentinos (`Juan Pérez`, `María González`), emails, teléfonos `+54 9 343 612-XXXX`
- Establecimientos: `La Esperanza`, `Don Pedro`, `Los Algarrobos`
- Madres: RP entre 1-9999, estados (`Seca`, `En Tambo`), fechas de nacimiento entre 2018-2023
- Terneros: pesos al nacer 25-45kg, sexos, fechas recientes, calostrado con grado_brix 8-28
- Eventos: pariciones, vacunaciones, destetes
- Tratamientos: nombres de medicamentos reales, dosis, vías (oral, IM, subcutánea)
- **Casos límite:** RP duplicado, fechas futuras, pesos negativos, strings vacíos, emojis, SQL injection (`'; DROP TABLE--`), XSS (`<script>`), números enormes (1e308)

**Por cada test ejecutado, reportá:**
```
✅/❌ [Flujo] [Acción]
Input: { ... datos usados ... }
Esperado: ...
Observado (leyendo el código): ...
Severidad: 🔴 Crítico / 🟠 Alto / 🟡 Medio / 🟢 Bajo
Archivo:línea: [archivo.ts:42](archivo.ts#L42)
```

### FASE 3 — Validaciones específicas a chequear

Revisá el código y validá:

**Validaciones de datos (backend DTOs):**
- ¿`peso_nacer` permite negativos o cero?
- ¿`fecha_nacimiento` permite fechas futuras?
- ¿`rp_madre` / `rp_ternero` permite duplicados dentro del mismo establecimiento?
- ¿`grado_brix` está limitado al rango 0-32?
- ¿`litros_calostrado` permite valores absurdos (>10L)?
- ¿`email` valida formato real?
- ¿`telefono` valida formato argentino?
- ¿Los enums (`Macho/Hembra`, `Vivo/Muerto`, `sonda/mamadera`) rechazan otros valores?

**Lógica de negocio:**
- ¿Un ternero puede tener `fecha_nacimiento` anterior a la `fecha_nacimiento` de su madre?
- ¿Se puede asignar una madre de otro establecimiento al ternero?
- ¿Los cálculos en `ternero.entity.ts` (`calcularPesoEsperado`, `calcularAumentoDiarioPromedio`) dan resultados sensatos con datos extremos?
- ¿Qué pasa si `peso_15d=0` pero hay 30 días desde el nacimiento? (división por cero)
- ¿El bot acepta mensajes de números no registrados? ¿Cómo responde?

**Frontend:**
- ¿Los selectores muestran los 500 registros con scroll o necesitan búsqueda?
- ¿El navbar es responsive en mobile?
- ¿Los formularios persisten datos si se navega y se vuelve?
- ¿Hay loading states en todas las queries?
- ¿Hay error boundaries para crashes de React?
- ¿Las fechas se muestran en formato AR (`DD/MM/YYYY`)?

**Multi-tenancy:**
- ¿Un operario del establecimiento A puede ver/editar madres del establecimiento B vía manipulación del request?
- ¿El `id_establecimiento` viene del JWT o del body? (debe venir del JWT)

### FASE 4 — Sugerencias de producto

**A AGREGAR (priorizá top 5):**
- Features que faltan y aportarían mucho valor (ej: dashboard con KPIs, exportar a Excel, alertas push, gráfico de crecimiento por ternero)
- Mejoras UX (ej: bulk actions, filtros avanzados, búsqueda global)
- Integraciones (ej: SENASA, balanzas Tru-Test)

**A ELIMINAR / SIMPLIFICAR:**
- Campos redundantes en formularios
- Pantallas que nadie usa
- Lógica duplicada
- Endpoints que el frontend no consume

**A REFACTORIZAR:**
- Componentes >300 líneas
- Servicios que mezclan responsabilidades
- Naming inconsistente (`creado_en` vs `createdAt`)

## 📤 Formato de entrega

```markdown
# 🧪 QA Funcional TerneData — [fecha]

## Resumen ejecutivo
- Flujos testeados: X/Y
- Bugs encontrados: 🔴X 🟠Y 🟡Z 🟢W
- Top 3 problemas críticos: ...
- Top 3 quick-wins: ...

## Bugs encontrados
[tabla con severidad, flujo, archivo, fix sugerido]

## Validaciones faltantes
[lista priorizada]

## Sugerencias de producto
### Agregar
### Eliminar
### Refactorizar

## Plan de acción sugerido (sprint de 1 semana)
```

## ⚠️ Reglas
- **NO ejecutes código real** ni hagas commits — esto es análisis estático + simulación mental leyendo el código
- Si encontrás algo que **requiere correr la app** para confirmar, marcalo como `[REQUIERE EJECUCIÓN]` y explicá qué query/click hace falta
- Sé **específico**: "el campo X en línea Y permite Z, debería validar W"
- Priorizá por **impacto al usuario final**, no por gusto técnico
- Si algo ya está bien, **no lo critiques** — solo destacá lo que mejora

Empezá por la FASE 1 y avisame antes de pasar a la siguiente.
