# Módulo de Forrajería Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incorporar un módulo de gestión para forrajerías rurales, aislado del módulo ganadero y habilitable primero en local.

**Architecture:** Mantener la plataforma y autenticación actuales, extendiendo `establecimientos` con un tipo de organización compatible. El contexto activo define el módulo, los menús y el alcance de datos. Las entidades comerciales vivirán en módulos NestJS propios y siempre referenciarán la organización activa; las pantallas ganaderas no se modificarán salvo para ocultar el menú cuando el contexto no sea ganadero.

**Tech Stack:** NestJS, TypeScript, TypeORM, PostgreSQL, Next.js, React, Redux y Jest.

**Spec:** `docs/superpowers/specs/2026-08-31-modulo-forrajeria-design.md`

## Global Constraints

- No mezclar entidades comerciales con animales, rodeos, tratamientos o producción.
- Mantener compatibilidad con los establecimientos ganaderos existentes.
- No usar `synchronize: true`; los cambios de base deben ser migraciones explícitas.
- Toda consulta comercial debe filtrar por organización autorizada.
- Marketplace, pagos online y facturación fiscal quedan fuera del MVP.
- La primera habilitación debe ser local/desarrollo y no cambiar producción.

---

### Task 1: Modelar el tipo de organización y el contexto activo

**Files:**
- Modify: `ms-nestjs-bussines/src/modules/establecimientos/entities/establecimiento.entity.ts`
- Modify: `ms-nestjs-bussines/src/modules/establecimientos/dto/establecimiento.dto.ts`
- Modify: `ms-nestjs-bussines/src/modules/establecimientos/establecimientos.service.ts`
- Modify: `ms-nestjs-bussines/src/modules/establecimientos/establecimientos.controller.ts`
- Modify: `ms-nestjs-bussines/src/modules/users/entity/user-establecimiento.entity.ts`
- Modify: `ms-nestjs-bussines/src/modules/auth/establecimiento.guard.ts`
- Create: `ms-nestjs-bussines/src/modules/establecimientos/organizacion-tipo.enum.ts`
- Create: `ms-nestjs-bussines/src/database/migrations/202608310001-AddTipoOrganizacion.ts`
- Test: `ms-nestjs-bussines/src/modules/establecimientos/establecimientos.service.spec.ts`
- Test: `ms-nestjs-bussines/src/modules/auth/establecimiento.guard.spec.ts`

**Interfaces:**
- `OrganizacionTipo = 'ganaderia' | 'forrajeria'`.
- `Establecimiento` expone `tipo_organizacion`, con valor existente compatible `ganaderia`.
- El endpoint de establecimientos devuelve el tipo para que el frontend pueda seleccionar contexto.
- El guard rechaza rutas de forrajería cuando el contexto activo no es `forrajeria`, y conserva el comportamiento actual para ganadería.

- [ ] **Step 1: Escribir tests de migración y compatibilidad.** Verificar que un establecimiento existente se lea como `ganaderia`, que se pueda crear `forrajeria` y que valores desconocidos sean rechazados.
- [ ] **Step 2: Ejecutar los tests para confirmar el fallo.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand establecimientos.service.spec.ts establecimiento.guard.spec.ts`
  Expected: FAIL porque el tipo y las validaciones aún no existen.
- [ ] **Step 3: Implementar enum, columna, DTO y validación.** Agregar columna no nula con default `ganaderia`, DTO de creación/actualización y migración explícita.
- [ ] **Step 4: Implementar aislamiento del guard.** Exponer un decorador de tipo de organización para los controladores comerciales y devolver `403` ante un contexto incompatible.
- [ ] **Step 5: Ejecutar tests y compilación.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand establecimientos.service.spec.ts establecimiento.guard.spec.ts && npm run build`
  Expected: PASS y compilación TypeScript exitosa.
- [ ] **Step 6: Commit.**
  Run: `git add ms-nestjs-bussines/src/modules/establecimientos ms-nestjs-bussines/src/modules/users/entity/user-establecimiento.entity.ts ms-nestjs-bussines/src/modules/auth ms-nestjs-bussines/src/database/migrations && git commit -m "feat: add organization types"`

### Task 2: Crear el módulo de catálogo e inventario

**Files:**
- Create: `ms-nestjs-bussines/src/modules/forrajeria/catalogo/catalogo.module.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/catalogo/catalogo.controller.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/catalogo/catalogo.service.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/catalogo/entities/categoria.entity.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/catalogo/entities/producto.entity.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/catalogo/dto/create-categoria.dto.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/catalogo/dto/create-producto.dto.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/inventario/inventario.module.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/inventario/inventario.controller.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/inventario/inventario.service.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/inventario/entities/movimiento-stock.entity.ts`
- Create: `ms-nestjs-bussines/src/database/migrations/202608310002-CreateForrajeriaCatalogoInventario.ts`
- Modify: `ms-nestjs-bussines/src/app.module.ts`
- Test: `ms-nestjs-bussines/src/modules/forrajeria/catalogo/catalogo.service.spec.ts`
- Test: `ms-nestjs-bussines/src/modules/forrajeria/inventario/inventario.service.spec.ts`

**Interfaces:**
- `Producto`: organización, nombre, SKU opcional, categoría, unidad de venta, costo, precio, stock actual, stock mínimo, lote/vencimiento opcionales y estado.
- `POST /forrajeria/categorias`, `GET /forrajeria/categorias`.
- `POST /forrajeria/productos`, `GET /forrajeria/productos`.
- `POST /forrajeria/inventario/movimientos` y `GET /forrajeria/inventario/bajo-stock`.
- Un movimiento de entrada incrementa stock; una salida no puede dejar stock negativo.

- [ ] **Step 1: Escribir tests de producto e inventario.** Cubrir creación, filtro por organización, unidades válidas, entrada, salida y rechazo de stock insuficiente.
- [ ] **Step 2: Ejecutar tests y confirmar fallo.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand src/modules/forrajeria`
  Expected: FAIL porque el módulo no existe.
- [ ] **Step 3: Implementar entidades y DTOs.** Usar FK a `establecimientos`, índices por organización y tipos de unidad explícitos: `kg`, `bolsa`, `fardo`, `rollo`, `tonelada`, `unidad`.
- [ ] **Step 4: Implementar servicios transaccionales.** Todas las búsquedas reciben `organizacionId`; las salidas validan stock dentro de la misma transacción.
- [ ] **Step 5: Registrar módulos y migración.** Importar el módulo en `app.module.ts` y crear tablas sin alterar tablas ganaderas.
- [ ] **Step 6: Ejecutar tests y build.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand src/modules/forrajeria && npm run build`
  Expected: PASS y build exitoso.
- [ ] **Step 7: Commit.**
  Run: `git add ms-nestjs-bussines/src/modules/forrajeria ms-nestjs-bussines/src/app.module.ts ms-nestjs-bussines/src/database/migrations && git commit -m "feat: add forrajeria catalog and stock"`

### Task 3: Agregar proveedores, clientes y cuentas corrientes

**Files:**
- Create: `ms-nestjs-bussines/src/modules/forrajeria/contactos/contactos.module.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/contactos/contactos.controller.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/contactos/contactos.service.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/contactos/entities/contacto.entity.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/cuentas/cuentas.module.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/cuentas/cuentas.controller.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/cuentas/cuentas.service.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/cuentas/entities/movimiento-cuenta.entity.ts`
- Create: `ms-nestjs-bussines/src/database/migrations/202608310003-CreateForrajeriaContactosCuentas.ts`
- Modify: `ms-nestjs-bussines/src/app.module.ts`
- Test: `ms-nestjs-bussines/src/modules/forrajeria/contactos/contactos.service.spec.ts`
- Test: `ms-nestjs-bussines/src/modules/forrajeria/cuentas/cuentas.service.spec.ts`

**Interfaces:**
- `Contacto`: organización, tipo `cliente|proveedor`, nombre, documento opcional, teléfono, WhatsApp, email, dirección, zona, límite de crédito y estado.
- `POST/GET/PATCH /forrajeria/contactos` con filtro por tipo.
- `MovimientoCuenta`: contacto, concepto, debe, haber, fecha, referencia y saldo calculado.
- `GET /forrajeria/clientes/:id/cuenta` y `POST /forrajeria/clientes/:id/pagos`.

- [ ] **Step 1: Escribir tests de aislamiento y saldo.** Verificar que un contacto no pueda consultarse desde otra organización y que los pagos reduzcan correctamente el saldo.
- [ ] **Step 2: Ejecutar tests y confirmar fallo.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand src/modules/forrajeria/contactos src/modules/forrajeria/cuentas`
  Expected: FAIL porque no existen entidades ni servicios.
- [ ] **Step 3: Implementar contactos con validaciones.** Evitar duplicados por organización y tipo/documento cuando exista documento.
- [ ] **Step 4: Implementar cuenta corriente.** Registrar movimientos inmutables y calcular saldo con `debe - haber` en consultas filtradas por cliente y organización.
- [ ] **Step 5: Crear migración, registrar módulos y ejecutar tests.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand src/modules/forrajeria/contactos src/modules/forrajeria/cuentas && npm run build`
  Expected: PASS y build exitoso.
- [ ] **Step 6: Commit.**
  Run: `git add ms-nestjs-bussines/src/modules/forrajeria ms-nestjs-bussines/src/app.module.ts ms-nestjs-bussines/src/database/migrations && git commit -m "feat: add forrajeria contacts and accounts"`

### Task 4: Implementar pedidos, ventas y reparto

**Files:**
- Create: `ms-nestjs-bussines/src/modules/forrajeria/ventas/ventas.module.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/ventas/ventas.controller.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/ventas/ventas.service.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/ventas/entities/pedido.entity.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/ventas/entities/pedido-item.entity.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/ventas/dto/create-pedido.dto.ts`
- Create: `ms-nestjs-bussines/src/modules/forrajeria/ventas/dto/update-pedido-estado.dto.ts`
- Create: `ms-nestjs-bussines/src/database/migrations/202608310004-CreateForrajeriaVentas.ts`
- Modify: `ms-nestjs-bussines/src/app.module.ts`
- Test: `ms-nestjs-bussines/src/modules/forrajeria/ventas/ventas.service.spec.ts`

**Interfaces:**
- Estados de pedido: `pendiente`, `confirmado`, `preparando`, `listo`, `entregado`, `cancelado`.
- `POST /forrajeria/pedidos`, `GET /forrajeria/pedidos`, `PATCH /forrajeria/pedidos/:id/estado`.
- Un pedido contiene cliente, ítems, cantidades, precio congelado, subtotal, forma de entrega y observaciones.
- Confirmar un pedido reserva/descuenta stock según la política elegida; cancelar una venta ya confirmada revierte el movimiento de stock.

- [ ] **Step 1: Escribir tests del flujo completo.** Cubrir creación, cálculo total, filtro por organización, transición de estados, stock insuficiente y cancelación.
- [ ] **Step 2: Ejecutar tests y confirmar fallo.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand src/modules/forrajeria/ventas`
  Expected: FAIL porque el flujo no existe.
- [ ] **Step 3: Implementar pedido y sus ítems.** Congelar precio y unidad al crear el pedido para que cambios posteriores del catálogo no alteren ventas históricas.
- [ ] **Step 4: Implementar estados y stock transaccional.** Permitir únicamente transiciones válidas y registrar movimiento de inventario al confirmar.
- [ ] **Step 5: Integrar cuenta corriente y reparto.** Al entregar una venta a crédito, registrar el debe del cliente; guardar dirección/zona y modalidad `retiro|reparto`.
- [ ] **Step 6: Ejecutar tests y build.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand src/modules/forrajeria/ventas && npm run build`
  Expected: PASS y build exitoso.
- [ ] **Step 7: Commit.**
  Run: `git add ms-nestjs-bussines/src/modules/forrajeria ms-nestjs-bussines/src/app.module.ts ms-nestjs-bussines/src/database/migrations && git commit -m "feat: add forrajeria orders and sales"`

### Task 5: Agregar selección de módulo y pantallas web locales

**Files:**
- Modify: `ganaderia-web-service/src/components/EstablecimientoSelector.jsx`
- Modify: `ganaderia-web-service/src/components/Navbar.jsx`
- Modify: `ganaderia-web-service/src/store/bussines/businessSlice.js`
- Create: `ganaderia-web-service/src/app/forrajeria/layout.jsx`
- Create: `ganaderia-web-service/src/app/forrajeria/page.jsx`
- Create: `ganaderia-web-service/src/app/forrajeria/productos/page.jsx`
- Create: `ganaderia-web-service/src/app/forrajeria/pedidos/page.jsx`
- Create: `ganaderia-web-service/src/app/forrajeria/clientes/page.jsx`
- Create: `ganaderia-web-service/src/hooks/forrajeria.js`
- Modify: `ganaderia-web-service/src/api/bussines-api.js`
- Test: `ganaderia-web-service/src/components/__tests__/EstablecimientoSelector.test.jsx`

**Interfaces:**
- El selector muestra el tipo de organización y guarda el contexto activo completo: `{ id_establecimiento, nombre, tipo_organizacion }`.
- Las rutas `/forrajeria/*` son inaccesibles visualmente para contextos ganaderos.
- El hook `useForrajeria` encapsula llamadas a `/forrajeria/*` y nunca usa endpoints ganaderos para cargar productos, clientes o pedidos.

- [ ] **Step 1: Escribir tests del selector y visibilidad.** Cubrir cambio de organización, persistencia del tipo y ausencia de menú comercial en contexto ganadero.
- [ ] **Step 2: Ejecutar tests y confirmar fallo.** Usar el runner configurado por el frontend y verificar que los casos nuevos fallen por componentes inexistentes.
- [ ] **Step 3: Implementar contexto y navegación.** Reutilizar el selector actual sin modificar la navegación ganadera más de lo necesario.
- [ ] **Step 4: Implementar dashboard y pantallas mínimas.** Mostrar bajo stock, pedidos recientes, productos, clientes y estados de pedido.
- [ ] **Step 5: Ejecutar lint/build local.**
  Run: `cd ganaderia-web-service && npm run build`
  Expected: PASS sin errores de compilación y las rutas nuevas generadas.
- [ ] **Step 6: Commit.**
  Run: `git add ganaderia-web-service/src/app/forrajeria ganaderia-web-service/src/components/EstablecimientoSelector.jsx ganaderia-web-service/src/components/Navbar.jsx ganaderia-web-service/src/store/bussines/businessSlice.js ganaderia-web-service/src/hooks/forrajeria.js ganaderia-web-service/src/api/bussines-api.js && git commit -m "feat: add forrajeria web module"`

### Task 6: Verificar aislamiento y habilitación local

**Files:**
- Create: `ms-nestjs-bussines/test/forrajeria-isolation.e2e-spec.ts`
- Create: `ganaderia-web-service/src/app/forrajeria/__tests__/forrajeria-navigation.test.jsx`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-31-modulo-forrajeria-design.md`

**Interfaces:**
- El e2e usa dos organizaciones y dos usuarios, intentando leer y modificar datos cruzados.
- El resultado esperado para acceso cruzado es `403` o `404` sin revelar existencia del recurso.
- La documentación indica cómo habilitar el módulo localmente y qué funciones siguen fuera del MVP.

- [ ] **Step 1: Escribir pruebas e2e de aislamiento.** Crear escenarios de usuario ganadero, usuario forrajería y usuario con ambas organizaciones.
- [ ] **Step 2: Ejecutar las pruebas contra el backend local.**
  Run: `cd ms-nestjs-bussines && npm run test:e2e -- --runInBand test/forrajeria-isolation.e2e-spec.ts`
  Expected: FAIL solo si queda algún cruce de autorización o fixture incompleto; corregir la implementación antes de continuar.
- [ ] **Step 3: Ejecutar verificación completa.**
  Run: `cd ms-nestjs-bussines && npm test -- --runInBand && npm run build`
  Run: `cd ganaderia-web-service && npm run build`
  Expected: PASS en backend y frontend.
- [ ] **Step 4: Actualizar documentación local.** Agregar rutas, variables existentes requeridas y flujo para crear una organización `forrajeria` sin habilitar marketplace.
- [ ] **Step 5: Revisar diff y commit.**
  Run: `git diff --check && git status --short`
  Expected: solo cambios propios del módulo, sin tocar modificaciones previas del usuario.
- [ ] **Step 6: Commit.**
  Run: `git add ms-nestjs-bussines/test ganaderia-web-service/src/app/forrajeria README.md docs/superpowers/specs/2026-08-31-modulo-forrajeria-design.md && git commit -m "test: verify forrajeria isolation"`

## Handoff

Implementar en el orden indicado. Cada tarea debe terminar con sus tests y commit antes de comenzar la siguiente. No iniciar marketplace ni modificar el dominio ganadero hasta que el MVP comercial pase las pruebas de aislamiento y una validación local con datos de prueba.
