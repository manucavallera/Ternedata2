# Proyecto "Ganadería"

## Microservices Architecture con NestJS y Next.js

Este repositorio implementa una arquitectura de microservicios basada en **NestJS** para el backend y **Next.js** para el frontend. Los microservicios están organizados de manera modular y escalable, siguiendo patrones de diseño robustos, y utilizando **PostgreSQL** como sistema de gestión de bases de datos.

La arquitectura está compuesta por dos microservicios principales: **ms-nestjs-security** (Autenticación) y **ms-nestjs-business** (Lógica de negocio), y un frontend en **Next.js** que se comunica con estos servicios utilizando **Axios** y gestionando el estado con **Redux Toolkit**.

---

## STACK PERN

### Tecnologías Utilizadas

#### Backend:
- **NestJS**: Framework para Node.js que permite crear aplicaciones backend escalables y bien estructuradas.
- **JWT (JSON Web Tokens)**: Implementación de autenticación y autorización en el microservicio de seguridad para validar sesiones de usuario.
- **PostgreSQL**: Base de datos relacional para la persistencia de datos en ambos microservicios.
- **TypeORM**: ORM utilizado para interactuar con la base de datos PostgreSQL.
- **Guards de NestJS**: Utilizados en ambos microservicios para proteger rutas según el estado de autenticación del usuario.
- **CORS**: Configuración para permitir la comunicación entre el frontend y los microservicios backend.

#### Frontend:
- **Next.js**: Framework de React para la construcción de interfaces de usuario con renderizado del lado del servidor y generación estática.
- **Redux Toolkit**: Utilizado para manejar el estado global de la aplicación, especialmente para la gestión del estado de autenticación.
- **Axios**: Librería para realizar peticiones HTTP desde el frontend hacia los microservicios backend.

#### Contenerización:
- **Docker**: Utilizado para contenerizar tanto los microservicios como el frontend, asegurando un entorno consistente en cualquier máquina.
- **Docker Compose**: Para orquestar los contenedores y simplificar la configuración de múltiples servicios.

---

## Arquitectura de Microservicios

La aplicación sigue una **arquitectura de microservicios en capas**, donde cada microservicio se encarga de una responsabilidad específica y se comunica con los demás a través de APIs REST. La estructura de la aplicación se divide en las siguientes capas y componentes:

### 1. Microservicio de Autenticación (**ms-nestjs-security**):
- **Responsabilidad**: Gestiona la autenticación de usuarios utilizando JWT.
- **Rutas protegidas**: Implementa Guards para proteger las rutas que requieren autenticación.
- **Tecnología**: NestJS, JWT, TypeORM (para la persistencia de datos de usuarios), PostgreSQL.

#### Funciones:
- Registro de usuario.
- Login de usuario y emisión de tokens JWT.
- Protección de rutas con Guards, permitiendo el acceso solo a usuarios autenticados.
- Configuración de CORS para permitir el acceso desde el frontend.

### 2. Microservicio de Negocio (**ms-nestjs-business**):
- **Responsabilidad**: Gestiona la lógica de negocio de la aplicación relacionada con la ganadería.
- **Tecnología**: NestJS, TypeORM, PostgreSQL.

#### Funciones:
- Gestión de registros de ganado (altas, bajas y modificaciones).
- Control de vacunaciones y tratamientos sanitarios.
- Registro de compras y ventas de animales.
- Reportes de producción y seguimiento del rendimiento del ganado.
- Validación de peticiones utilizando DTOs y Pipes.
- Integración con el microservicio de autenticación para validar el acceso mediante tokens JWT.
- Exposición de APIs REST que interactúan con el frontend.

### 3. Frontend (**ganaderia-web-service**):
- **Responsabilidad**: Interfaz de usuario de la aplicación, interactúa con los microservicios a través de peticiones HTTP.
- **Tecnología**: Next.js, Redux Toolkit, Axios.

#### Funciones:
- Gestión del estado global con Redux Toolkit (por ejemplo, estado de autenticación).
- Rutas dinámicas protegidas, validando si el usuario está logueado antes de acceder a ciertas páginas.
- Comunicación con los microservicios backend usando Axios para hacer peticiones a las rutas protegidas de autenticación y negocio.
- Renderizado del lado del servidor utilizando Next.js para mejorar el SEO y la experiencia del usuario.

---

## Estructura del Proyecto

### Capas y Patrones de Diseño

La arquitectura sigue un enfoque de **microservicios** con una estructura **modular** y basada en capas. El patrón de diseño utilizado permite una fácil escalabilidad y mantenibilidad:

### 1. Capa de Presentación (**Frontend**):
- El frontend en **Next.js** se encarga de la interacción con el usuario, utilizando **Redux Toolkit** para gestionar el estado de autenticación y las rutas protegidas.
- Rutas dinámicas en **Next.js** permiten que las páginas sean renderizadas según el estado de autenticación, y se valida si el usuario está logueado antes de acceder a rutas protegidas.

### 2. Capa de Aplicación (**Backend - Microservicios**):
Cada microservicio sigue el **patrón MVC** (Modelo-Vista-Controlador), donde:
- **Modelo**: Las entidades que representan los datos.
- **Vista**: Las respuestas HTTP de las APIs.
- **Controlador**: Los controladores que gestionan las peticiones HTTP.
- **Utiliza DTOs** para validar y transferir datos entre capas y servicios.
- **Guards** para proteger las rutas y permitir solo el acceso a usuarios autenticados mediante tokens JWT.

### 3. Capa de Persistencia (**Base de Datos**):
- **PostgreSQL** es la base de datos utilizada para la persistencia de datos. Se interactúa con ella mediante **TypeORM**, lo que facilita la conexión y ejecución de operaciones SQL de manera eficiente.

---

## Configuración de Entorno

Cada microservicio tiene su propio archivo **.env** para la configuración de variables de entorno.





