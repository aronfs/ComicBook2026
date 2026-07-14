# ComicBook 2.0 API

Backend REST profesional para la gestión y catálogo de cómics. Reemplaza el almacenamiento local SQLite de la aplicación Android original por una API centralizada con PostgreSQL.

## Stack Tecnológico

| Tecnología    | Uso                          |
| ------------- | ---------------------------- |
| **Bun**       | Runtime JavaScript/TypeScript |
| **TypeScript** | Lenguaje de programación      |
| **ElysiaJS**  | Framework HTTP                |
| **Prisma ORM** | Mapeo objeto-relacional       |
| **PostgreSQL** | Base de datos relacional      |
| **JWT**       | Autenticación stateless       |
| **Zod**       | Validación de esquemas        |
| **Swagger**   | Documentación OpenAPI         |
| **Bruno**     | Colección de pruebas de API   |
| **Bun Test**  | Pruebas automatizadas         |

## Migración desde Android Java + SQLite

| App Original      | Backend Nuevo            |
| ----------------- | ------------------------ |
| `Comic.java`      | Modelo Prisma `Comic`    |
| `Persona.java`    | Modelo Prisma `User`     |
| `Tipo_Comic.java` | Modelo Prisma `ComicType` |
| `Tipo_Persona.java` | Enum `UserRole`          |
| `DbHelper.java`   | Prisma ORM + PostgreSQL  |
| `SQLite`          | PostgreSQL               |
| Almacenamiento local | API REST centralizada   |

## Requisitos

- [Bun](https://bun.sh) >= 1.1
- [PostgreSQL](https://www.postgresql.org) >= 16
- [Docker](https://www.docker.com) (opcional, para PostgreSQL)

## Instalación

### 1. Instalar Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd comicbook-api
```

### 3. Instalar dependencias

```bash
bun install
```

### 4. Configurar PostgreSQL

#### Opción A: Docker (recomendado)

```bash
docker compose up -d
```

#### Opción B: PostgreSQL local

Crear la base de datos:

```bash
createdb comicbook_dev
```

### 5. Configurar variables de entorno

```bash
cp .env.development .env
# Editar .env si es necesario
```

### 6. Generar Cliente Prisma

```bash
bun run prisma:generate
```

### 7. Ejecutar migraciones

```bash
bun run prisma:migrate:dev
```

### 8. Poblar la base de datos

```bash
bun run prisma:seed
```

### 9. Iniciar servidor de desarrollo

```bash
bun run dev
```

## Arquitectura MVC

```
src/
├── config/        # Configuración (env, database, cors, swagger)
├── controllers/   # Controladores HTTP
├── services/      # Lógica de negocio
├── routes/        # Definición de rutas
├── middlewares/    # Middleware (auth, roles, validación, errores)
├── validators/    # Esquemas Zod
├── utils/         # Utilidades (JWT, paginación, respuestas)
└── types/         # Tipos TypeScript
```

### Flujo de una solicitud

```
Request → Routes → Middleware (auth/roles/validation) → Controller → Service → Prisma → PostgreSQL
                                                                              ↓
Response ← Routes ← Controller ← Service ← Prisma ← PostgreSQL
```

## Roles del Sistema

| Rol     | Permisos                                                                 |
| ------- | ------------------------------------------------------------------------ |
| **USER**   | Registro, login, perfil, catálogo, búsqueda, detalles, favoritos            |
| **EDITOR** | Todo lo de USER + crear/editar cómics, cambiar disponibilidad, publicar |
| **ADMIN**  | Todo lo de EDITOR + administrar usuarios, roles, tipos de cómic, auditoría |

## Estados

### Usuario

| Estado       | Descripción                      |
| ------------ | -------------------------------- |
| **ACTIVE**   | Usuario activo y funcional       |
| **INACTIVE** | No puede consumir rutas protegidas |
| **SUSPENDED** | No puede iniciar sesión          |

### Cómic

| Estado       | Descripción                                       |
| ------------ | ------------------------------------------------- |
| **DRAFT**    | Registrado pero no visible públicamente           |
| **PUBLISHED** | Visible en el catálogo público                   |
| **ARCHIVED** | No visible, conserva información histórica        |

### Disponibilidad

| Estado          | Descripción                         |
| --------------- | ----------------------------------- |
| **AVAILABLE**   | Disponible                          |
| **UNAVAILABLE** | No disponible                       |
| **COMING_SOON** | Próximamente                       |

## Endpoints

### Autenticación (`/api/v1/auth`)

| Método | Ruta              | Descripción              | Autenticación |
| ------ | ----------------- | ------------------------ | ------------- |
| POST   | `/register`       | Registrar usuario        | No            |
| POST   | `/login`          | Iniciar sesión           | No            |
| POST   | `/refresh`        | Renovar token            | No            |
| POST   | `/logout`         | Cerrar sesión            | Sí            |
| POST   | `/logout-all`     | Cerrar todas las sesiones | Sí           |
| GET    | `/me`             | Perfil del usuario       | Sí            |

### Usuarios (`/api/v1/users`)

| Método | Ruta              | Descripción              | Autenticación |
| ------ | ----------------- | ------------------------ | ------------- |
| GET    | `/me`             | Obtener perfil           | Sí            |
| PUT    | `/me`             | Actualizar perfil        | Sí            |
| PATCH  | `/me/password`    | Cambiar contraseña       | Sí            |
| DELETE | `/me`             | Eliminar cuenta          | Sí            |
| GET    | `/me/favorites`   | Listar favoritos         | Sí            |

### Catálogo (`/api/v1/comics`)

| Método | Ruta              | Descripción              | Autenticación |
| ------ | ----------------- | ------------------------ | ------------- |
| GET    | `/`               | Catálogo paginado        | No            |
| GET    | `/featured`       | Destacados               | No            |
| GET    | `/:slug`          | Detalle por slug         | No            |

### Tipos de Cómic (`/api/v1/comic-types`)

| Método | Ruta              | Descripción              | Autenticación |
| ------ | ----------------- | ------------------------ | ------------- |
| GET    | `/`               | Listar tipos             | No            |
| GET    | `/:slug`          | Detalle por slug         | No            |
| GET    | `/:slug/comics`   | Cómics por tipo          | No            |

### Favoritos (`/api/v1/favorites`)

| Método | Ruta              | Descripción              | Autenticación |
| ------ | ----------------- | ------------------------ | ------------- |
| GET    | `/`               | Listar favoritos         | Sí            |
| POST   | `/:comicId`       | Agregar favorito         | Sí            |
| DELETE | `/:comicId`       | Quitar favorito          | Sí            |

### Administración (`/api/v1/admin`)

#### Usuarios (ADMIN)

| Método | Ruta                | Descripción              |
| ------ | ------------------- | ------------------------ |
| GET    | `/users`            | Listar usuarios          |
| GET    | `/users/:id`        | Detalle de usuario       |
| PATCH  | `/users/:id/role`   | Cambiar rol              |
| PATCH  | `/users/:id/status` | Cambiar estado           |
| DELETE | `/users/:id`        | Eliminar usuario         |

#### Cómics (EDITOR/ADMIN)

| Método | Ruta                       | Descripción                |
| ------ | -------------------------- | -------------------------- |
| POST   | `/comics`                  | Crear cómic                |
| GET    | `/comics`                  | Listar cómics              |
| GET    | `/comics/:id`              | Detalle de cómic           |
| PUT    | `/comics/:id`              | Actualizar cómic           |
| PATCH  | `/comics/:id/status`       | Cambiar estado             |
| PATCH  | `/comics/:id/availability` | Cambiar disponibilidad     |
| PATCH  | `/comics/:id/featured`     | Cambiar destacado          |
| POST   | `/comics/:id/publish`      | Publicar cómic             |
| POST   | `/comics/:id/archive`      | Archivar cómic             |
| DELETE | `/comics/:id`              | Eliminar cómic             |

#### Tipos de Cómic (ADMIN)

| Método | Ruta                        | Descripción                |
| ------ | --------------------------- | -------------------------- |
| POST   | `/comic-types`              | Crear tipo                 |
| PUT    | `/comic-types/:id`          | Actualizar tipo            |
| PATCH  | `/comic-types/:id/status`   | Activar/desactivar         |
| DELETE | `/comic-types/:id`          | Eliminar tipo              |

#### Auditoría (ADMIN)

| Método | Ruta          | Descripción              |
| ------ | ------------- | ------------------------ |
| GET    | `/audit-logs` | Ver logs de auditoría    |

### Health Check

| Método | Ruta              |
| ------ | ----------------- |
| GET    | `/health`         |
| GET    | `/api/v1/health`  |

## Respuestas

### Éxito

```json
{
  "success": true,
  "message": "Operación realizada correctamente",
  "data": {}
}
```

### Paginación

```json
{
  "success": true,
  "message": "Cómics obtenidos correctamente",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 80,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Los datos enviados no son válidos",
  "errors": [
    {
      "field": "email",
      "message": "El correo electrónico ya se encuentra registrado"
    }
  ]
}
```

## Códigos HTTP

| Código | Descripción                |
| ------ | -------------------------- |
| 200    | OK                         |
| 201    | Created                    |
| 204    | No Content                 |
| 400    | Bad Request                |
| 401    | Unauthorized               |
| 403    | Forbidden                  |
| 404    | Not Found                  |
| 409    | Conflict                   |
| 422    | Unprocessable Entity       |
| 500    | Internal Server Error      |

## Seguridad

- Contraseñas hasheadas con Argon2id
- JWT de corta duración (15 min access, 7 días refresh)
- Rotación de refresh tokens
- Revocación de sesiones
- Rate limiting en login/registro
- CORS configurable
- Validación estricta con Zod
- Autorización por rol
- Soft delete en todas las entidades
- Errores genéricos en producción
- Logs sin información sensible
- Normalización de emails

## Swagger

Una vez iniciado el servidor en desarrollo:

```
http://localhost:3000/api/docs
```

## Bruno

Importar la carpeta `bruno/` en Bruno App.

### Flujo de pruebas

1. Ejecutar `Register` o `Login` para obtener tokens
2. Las variables `accessToken` y `refreshToken` se guardan automáticamente
3. Probar los demás endpoints

## Pruebas

```bash
# Ejecutar todas las pruebas
bun test

# Modo watch
bun test --watch
```

## Comandos Frecuentes

| Comando                      | Descripción                       |
| ---------------------------- | --------------------------------- |
| `bun run dev`                | Iniciar servidor de desarrollo    |
| `bun run start`              | Iniciar servidor                  |
| `bun run start:prod`         | Iniciar en producción             |
| `bun run build`              | Compilar para producción          |
| `bun run typecheck`          | Verificar tipos TypeScript        |
| `bun run prisma:generate`    | Generar cliente Prisma            |
| `bun run prisma:migrate:dev` | Ejecutar migraciones en desarrollo |
| `bun run prisma:migrate:deploy` | Ejecutar migraciones en producción |
| `bun run prisma:studio`      | Abrir Prisma Studio               |
| `bun run prisma:seed`        | Ejecutar seed                     |
| `bun test`                   | Ejecutar pruebas                  |

## Producción

```bash
# Configurar variables de producción
cp .env.production.example .env
# Editar .env con valores reales

# Ejecutar migraciones
NODE_ENV=production bun run prisma:migrate:deploy

# Iniciar
NODE_ENV=production bun run start:prod
```

Consideraciones:

- Usar HTTPS mediante proxy reverso (Nginx, Caddy)
- CORS restringido a orígenes específicos
- Swagger desactivado
- Errores genéricos (sin stack trace)
- Variables de entorno seguras

## Clientes Compatibles

La API está diseñada para conectarse con:

- Aplicación Android (Java/Kotlin)
- Flutter
- Angular
- React
- Cualquier frontend web

## Licencia

MIT
