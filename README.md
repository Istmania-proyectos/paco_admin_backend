# PACO Admin Backend

Migración a NestJS del backend ASP.NET Core ubicado en
`/Users/oscarvasquez/Documents/ASP.NET/paco_admin_backend`.

La implementación conserva:

- Las mismas rutas públicas y protegidas.
- SQL Server y las tablas existentes de ASP.NET Identity.
- Los procedimientos `PACO_GET_PEDIDOS`, `PACO_INSERT_PEDIDOS`,
  `PACO_CORREO` y `PACO_GET_PUNTEO`.
- Verificación y generación de hashes de contraseña ASP.NET Identity v2/v3.
- JWT HS256 con los claims `id`, `rol` y `roles`.
- El formato de respuesta utilizado por el frontend Angular existente.

## Configuración

```bash
cp .env.example .env
npm install
npm run start:dev
```

Swagger queda disponible en `http://localhost:3045/swagger`.

Para que los JWT emitidos por ASP.NET sigan siendo válidos, configure
`JWT_SECRET`, `JWT_ISSUER` y `JWT_AUDIENCE` con los mismos valores del
`appsettings.json` anterior. No active sincronización automática de esquemas:
este backend trabaja sobre las tablas Identity existentes.

## Endpoints migrados

| Método | Ruta | Autenticación |
| --- | --- | --- |
| POST | `/api/auth/Post` | Pública |
| POST | `/api/accounts/Post` | Pública |
| POST | `/api/accounts/ResetPassword` | Bearer JWT |
| POST | `/api/accounts/ResetPasswordAdmin` | Pública + secreto |
| GET | `/api/Paco/GetPACO` | Bearer JWT |
| POST | `/api/Paco/PostPACO` | Bearer JWT |
| GET | `/api/Paco/Correo` | Bearer JWT |
| GET | `/api/Dashboard/Home` | Bearer JWT |
| GET | `/api/Punteo` | Pública |

## Validación

```bash
npm run build
npm test
```

Las pruebas de integración con SQL Server requieren acceso de red a
`DB_HOST` y una base que ya contenga las tablas y procedimientos del sistema
PACO.
