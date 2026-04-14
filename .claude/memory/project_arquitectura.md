---
name: Arquitectura técnica de Ternedata
description: Stack, puertos, estructura de servicios y datos técnicos clave
type: project
---

## Stack

- **ms-nestjs-security** — puerto 3001 — auth, usuarios, JWT
- **ms-nestjs-bussines** — puerto 3000 — madres, terneros, rodeos, establecimientos, invitaciones
- **ganaderia-web-service** — puerto 3002 — Next.js 16 App Router, output standalone
- **Base de datos**: PostgreSQL, multi-tenancy por `id_establecimiento`
- **Deploy**: Docker + EasyPanel
- **Repo GitHub**: https://github.com/manucavallera/Ternedata2

## Patrones clave

- JWT 30 días, guards: `JwtAuthGuard`, `EstablecimientoGuard`, `RolesGuard`
- Paginación estándar: `{ data, total, page, limit, totalPages }` con `getManyAndCount()`
- Hooks frontend en `/src/hooks/bussines.js` (negocio) y `/src/hooks/auth.js` (autenticación)
- `equipoService` en `/src/api/equipoRepo.js` para endpoints de equipo e invitaciones
- Dos instancias de algunos componentes — siempre verificar si hay duplicados en `/src/components/` vs `/src/components/secciones/`

## Entidades principales

- `MadreEntity` — tiene `id_rodeo` (nullable), `id_establecimiento`
- `TerneroEntity` — tiene `id_rodeo`, `id_establecimiento`, `estimativo` (string con `|`, pendiente migrar)
- `UserEstablecimientoEntity` — tabla intermedia users ↔ establecimientos con `rol`
- `InvitacionEntity` — token UUID, expiracion 48h, campo `usado`

## URLs de producción

- Frontend: https://manu-frontendganaderia.gygo4l.easypanel.host
- Business API: variable `NEXT_PUBLIC_API_URL` en frontend
