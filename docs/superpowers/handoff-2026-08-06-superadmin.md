# Handoff — Panel global de superadmin

## Estado

- Diseño aprobado: `docs/superpowers/specs/2026-08-06-superadmin-panel-design.md`.
- Plan aprobado: `docs/superpowers/plans/2026-08-06-superadmin-panel.md`.
- Commits: `ffc176a` diseño, `3eb6781` plan.
- Código de producción aún no modificado para esta feature.

## Próximo paso

Elegir ejecución `subagent-driven` o `inline` y comenzar Task 1:

1. Contrato global de usuarios en Security.
2. Tests de permisos y protección del último `super_admin`.
3. Luego cliente web y tabla global.

## Alcance acordado

Primera etapa: listar usuarios globales, email, rol, estado, establecimientos, cambio de rol y activar/desactivar. Solo `super_admin`. Mobile y auditoría quedan para etapas posteriores.

## Herramientas

RTK global, Code Review Graph construido/registrado, skills de Matt Pocock globales y Superpowers disponibles.
