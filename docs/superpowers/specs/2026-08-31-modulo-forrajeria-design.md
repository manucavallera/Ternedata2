# Diseño: módulo de forrajería para TerneData

## 1. Decisión de producto

TerneData incorporará un módulo de gestión comercial para forrajerías rurales como una extensión modular de la plataforma actual.

No se creará una aplicación independiente ni se mezclará la operación comercial con la gestión de animales. La plataforma tendrá organizaciones y módulos independientes, con autenticación, usuarios y permisos compartidos.

La primera versión funcionará en entorno local/desarrollo hasta validar el flujo. El módulo ganadero existente no debe cambiar su navegación ni sus reglas de negocio.

## 2. Arquitectura conceptual

```text
Cuenta de usuario
        |
        +-- Organización ganadera
        |     +-- rodeos
        |     +-- madres y terneros
        |     +-- sanidad
        |     +-- producción
        |
        +-- Organización forrajería
              +-- catálogo
              +-- inventario
              +-- proveedores
              +-- clientes
              +-- pedidos y ventas
              +-- cuentas corrientes
              +-- repartos
```

El contexto activo determina qué módulos, menús, permisos y datos puede utilizar la persona. Un usuario podrá tener acceso a una organización ganadera, una forrajería o ambas, y alternar entre ellas sin cruzar información.

## 3. Límites del módulo

### Compartido

- autenticación y sesión;
- usuarios, equipos, invitaciones y roles;
- selección de organización/contexto;
- configuración general de la plataforma;
- auditoría y seguridad de acceso.

### Exclusivo de Ganadería

- animales, madres, terneros y rodeos;
- tratamientos, eventos y sanidad;
- dietas y producción;
- indicadores productivos.

### Exclusivo de Forrajería

- productos comerciales y categorías;
- unidades de venta: kilo, bolsa, fardo, rollo y tonelada;
- precios y listas por cliente o volumen;
- stock, movimientos, lotes y vencimientos;
- proveedores;
- clientes y cuentas corrientes;
- pedidos, ventas y estados de entrega;
- zonas y organización de repartos.

No habrá marketplace en el MVP. Se dejarán interfaces y datos compatibles con una futura publicación de catálogo, disponibilidad, zona y condiciones de entrega.

## 4. MVP recomendado

El primer incremento debe cubrir el circuito comercial básico de una forrajería:

1. Crear y configurar una organización de tipo `forrajeria`.
2. Cargar categorías y productos.
3. Definir unidad de venta, costo, precio y stock.
4. Registrar proveedores y movimientos de inventario.
5. Registrar clientes y condiciones comerciales.
6. Crear pedidos y convertirlos en ventas.
7. Registrar pagos y saldo de cuenta corriente.
8. Consultar productos con bajo stock y ventas básicas.
9. Preparar pedidos para retiro o reparto.

Quedan fuera del MVP: marketplace, pagos online, facturación fiscal integrada, rutas optimizadas, formulación nutricional y trazabilidad sanitaria de medicamentos.

## 5. Modelo de aislamiento

Todas las entidades comerciales deben pertenecer a una organización de tipo forrajería y filtrarse por el contexto autorizado del usuario. Las entidades ganaderas deben continuar filtrándose por su establecimiento actual.

No se debe reutilizar `establecimiento` como si fuera indistintamente un campo o una tienda. Conviene introducir una abstracción de organización/contexto o extender el modelo existente de forma compatible, manteniendo los nombres y relaciones ganaderas hasta completar una migración segura.

La autorización debe verificar dos cosas:

- que el usuario tenga acceso a la organización activa;
- que la funcionalidad solicitada pertenezca al tipo de organización correcto.

## 6. Evolución futura

### Etapa 1 — Gestión local

Módulo habilitado en desarrollo/local, con datos de prueba y sin impacto sobre usuarios ganaderos.

### Etapa 2 — Piloto de forrajería

Prueba con una o pocas forrajerías. Se validan productos, unidades, stock, cuentas corrientes y reparto.

### Etapa 3 — Operación multi-organización

Usuarios con acceso simultáneo a ganadería y forrajería, permisos refinados y reportes comerciales más completos.

### Etapa 4 — Marketplace

Publicación voluntaria de productos, búsqueda por zona, disponibilidad, pedidos entre productor y comercio, y condiciones de entrega.

### Etapa 5 — Nichos adyacentes

El mismo núcleo comercial podrá soportar veterinaria rural, talabartería e insumos agropecuarios mediante tipos de producto y capacidades configurables.

## 7. Criterios de éxito del MVP

- El módulo ganadero mantiene el comportamiento actual.
- Un usuario puede alternar entre organizaciones sin cerrar sesión.
- Ninguna consulta comercial expone datos ganaderos y viceversa.
- Una forrajería puede cargar productos y conocer su stock real.
- Puede registrar un pedido, una venta y el saldo del cliente.
- La estructura permite activar el módulo en local sin desplegar marketplace.
- Las nuevas reglas quedan cubiertas por pruebas de autorización y aislamiento por organización.

## 8. Próximo paso

Antes de implementar, revisar el modelo actual de establecimientos, usuarios y permisos, y definir la primera migración compatible para representar organizaciones de tipo ganadería y forrajería.
