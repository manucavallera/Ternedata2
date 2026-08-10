# Invitaciones confiables en escritorio y mobile

**Fecha:** 2026-08-10

## Objetivo

Hacer confiable el flujo responsive de invitaciones para usuarios existentes y nuevos, conservando el token entre registro, verificación de email y login, sin mezclar la propiedad de datos entre Security y Business.

## Alcance

- Un único cliente web responsive cubre escritorio y navegador mobile; no existe una aplicación mobile nativa en este repositorio.
- Business continúa siendo la fuente de verdad para crear, validar, aceptar, listar y revocar invitaciones.
- Security continúa siendo la fuente de verdad para registro, verificación de email, login y refresh de JWT.
- No se saltea la verificación de email por presentar un token de invitación.
- No se agregan tablas ni migraciones.

## Decisiones de arquitectura

### Separación de responsabilidades

Security puede usar la presencia de `invitationToken` como intención de registro invitado para asignar el rol global inicial `operario`, pero no declara la invitación aceptada ni el email verificado. Business valida el token y crea la relación con el establecimiento únicamente después de que el usuario autenticado pueda aceptar la invitación.

El navegador conserva un contexto mínimo de invitación con token y, cuando existe, email destinatario. Ese contexto sobrevive a registro, verificación de email y login. La limpieza de sesión elimina credenciales anteriores sin borrar el contexto de invitación.

### Flujo de usuario existente

1. El usuario abre `/join?token=...&email=...`.
2. Si no tiene sesión, el cliente conserva el contexto y ofrece login o registro.
3. Después del login, el cliente intenta primero aceptar el token conservado.
4. Si no existe token conservado, puede ejecutar la aceptación automática por email para invitaciones dirigidas.
5. Tras aceptar, solicita `/auth/refresh`, persiste usuario/JWT frescos y redirige al dashboard.

### Flujo de usuario nuevo

1. El usuario abre la invitación y elige registrarse.
2. Registro conserva token/email y crea una cuenta no verificada.
3. La UI informa que debe verificar su email; no promete activación inmediata.
4. El usuario verifica el email e inicia sesión.
5. Login recupera el token conservado, acepta la invitación en Business, refresca la sesión en Security y redirige al dashboard.

### Links dirigidos y genéricos

- Una invitación con email solo puede aceptarla un usuario autenticado cuyo email coincida sin distinguir mayúsculas y con espacios extremos normalizados.
- Una invitación sin email puede aceptarla cualquier usuario autenticado y verificado que posea el token.
- Un token usado, revocado o expirado produce un error visible y no modifica membresías.

## Contratos de cliente

Se introduce una unidad pura para manejar contexto de invitación:

- Lee token/email desde URL o storage.
- Conserva las claves de invitación durante limpieza de credenciales.
- Devuelve el token pendiente después de un login exitoso.
- Elimina el contexto solo después de aceptación exitosa, conflicto de “ya miembro” confirmado o descarte explícito.

El login deja de usar `localStorage.clear()` y elimina solamente claves de autenticación conocidas. Esto evita borrar `pendingInviteToken`, `pendingInviteEmail` y `backupToken`.

## Correo de invitación

Business distingue entre invitación creada y correo enviado:

- Éxito de mail: `{ link, token, emailEnviado: email, emailError: null }`.
- Fallo de mail: la invitación y el link siguen válidos, pero responde `{ link, token, emailEnviado: null, emailError: "No se pudo enviar el correo" }`; no expone detalles SMTP.
- Sin email: `{ link, token, emailEnviado: null, emailError: null }`.

La UI muestra éxito verde únicamente cuando `emailEnviado` contiene el destinatario. Ante fallo ofrece copiar el link y explica que el correo no salió.

## Interfaz responsive

- El modal mantiene `max-w-md`, márgenes laterales y acciones apilables en pantallas angostas.
- Las listas continúan dentro de un contenedor con desplazamiento horizontal.
- `/join`, registro y login usan controles de ancho completo y conservan la misma semántica en escritorio y mobile.
- No se duplica lógica por tamaño de pantalla.

## Manejo de errores

- `400`: token inválido, usado o expirado; mostrar mensaje específico disponible.
- `403`: email autenticado distinto al destinatario; conservar token y pedir la cuenta correcta.
- `409`: ya pertenece al equipo; marcar contexto resuelto, refrescar sesión y continuar.
- Error de refresh: limpiar solo credenciales, conservar invitación si aún no fue resuelta y pedir nuevo login.
- Error de correo: no invalida la invitación; mostrar link copiable.

## Pruebas

### Web

- La limpieza de autenticación conserva el contexto de invitación.
- Login prioriza token pendiente y no lo pierde.
- Registro con invitación informa verificación de email.
- Los estados de resultado distinguen correo enviado, link manual y fallo de correo.
- Las unidades puras son compartidas por las vistas responsive, por lo que las mismas pruebas cubren escritorio y mobile.

### Business

- Generar invitación informa correctamente éxito y fallo de envío.
- Aceptar rechaza email incorrecto, token expirado y token usado.
- Aceptar crea una sola membresía y marca la invitación usada.
- Revocar conserva la validación de pertenencia al establecimiento.

### Security

- Registrar con invitación crea cuenta `operario` no verificada.
- Registrar sin invitación conserva el comportamiento actual de cuenta administradora.
- La respuesta de registro nunca afirma activación por invitación.

### Verificación manual

Ejecutar en viewport desktop y mobile:

1. Invitación con email a usuario existente.
2. Invitación con email a usuario nuevo, incluyendo verificación y login.
3. Link genérico a usuario existente.
4. Email incorrecto, link expirado y correo fallido.
5. Confirmar que el establecimiento aparece después del refresh de sesión.

Las pruebas manuales usan exclusivamente cuentas e invitaciones de prueba en EasyPanel.

## Fuera de alcance

- Aplicación mobile nativa.
- Reintentos o colas de correo.
- Auditoría histórica de invitaciones.
- Cambios de esquema o despliegue automático.
