# Panel global de superadmin — Diseño

## Objetivo

Permitir que la cuenta `super_admin` administre globalmente las cuentas de TerneData desde el frontend web de escritorio, sin ampliar esos permisos a administradores, operarios ni veterinarios.

## Alcance de la etapa 1

- Listar todos los usuarios con email, rol, estado y establecimientos asignados.
- Filtrar por rol y estado.
- Cambiar el rol de un usuario.
- Activar o desactivar un usuario.
- Consultar los establecimientos asignados a un usuario.
- Proteger las operaciones con autorización exclusiva para `super_admin`.
- Mantener mobile fuera de esta primera etapa.

## Fuera de alcance

- Auditoría histórica de acciones.
- Edición detallada de datos productivos de cada usuario.
- Gestión móvil del panel.
- Eliminación física de usuarios.

## Arquitectura propuesta

El backend Security será la fuente de verdad para identidad, roles y estado de usuario. Sus endpoints globales estarán protegidos por el guard de roles y aceptarán únicamente `super_admin`. Business seguirá consumiendo la identidad y aplicando sus guards de establecimiento para las operaciones productivas.

El frontend web agregará una vista de administración global que reutilice los hooks existentes de usuarios, mostrando una tabla filtrable. Las acciones actualizarán el backend y luego refrescarán la lista para evitar estado desactualizado.

## Reglas de seguridad

- Ningún rol distinto de `super_admin` puede listar usuarios globalmente ni cambiar roles.
- Nunca se devuelven contraseñas, tokens ni secretos.
- No se permite degradar o desactivar accidentalmente al único `super_admin` sin una protección explícita.
- Los cambios de rol deben validar que el valor pertenece al enum permitido.
- El token debe renovarse después de cambiar el rol de la propia cuenta.

## Flujo de datos

1. El frontend solicita la lista global con el JWT actual.
2. Security valida `super_admin` y devuelve datos públicos de cuenta y relaciones de establecimiento.
3. El usuario confirma una acción de cambio.
4. Security valida el rol/estado y persiste la modificación.
5. El frontend muestra resultado y vuelve a consultar la lista.

## Pruebas

- Guard: acceso permitido para `super_admin` y rechazado para los demás roles.
- Servicio: filtros, cambio de rol, cambio de estado y protección del superadmin.
- Controller: respuestas HTTP y validación de payloads.
- Frontend: carga, filtros, confirmación de acciones y manejo de errores.
- Smoke test manual: iniciar sesión como superadmin, modificar un usuario y comprobar el nuevo JWT si se modifica la propia cuenta.

## Etapa siguiente

Agregar una tabla de auditoría con actor, acción, usuario afectado, valores anterior/nuevo, timestamp y establecimiento/contexto.
