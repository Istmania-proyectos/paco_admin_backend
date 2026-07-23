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
| GET | `/api/Tickets` | Bearer JWT |
| POST | `/api/Tickets` | Bearer JWT |
| POST | `/api/Tickets/:id/transiciones` | Bearer JWT |
| GET | `/api/Tickets/respuesta-vendedor?token=...` | Pública con token |
| POST | `/api/Tickets/respuesta-vendedor` | Pública con token |

## Módulo de tickets

El esquema y los procedimientos del módulo están en `sql/tickets.sql`.

La simulación, agrupación automática por dependencia/jefe de marca y la
renovación mensual están documentadas en
`docs/tickets-automatizacion-checkin.md`.
TypeORM mantiene únicamente el mapeo (`synchronize: false`), por lo que el
script debe revisarse y ejecutarse explícitamente en la base correspondiente.

Las lecturas usan `dbo.PACO_GET_TICKET`: opción 1 para la bandeja, 2 para el
encabezado, 3 para los detalles, 4 para los planes de acción y 5 para el
historial. Las creaciones y transiciones usan `dbo.PACO_INSERT_TICKET`.

Al crear o avanzar un ticket, el backend resuelve el siguiente destinatario,
envía el correo mediante SMTP y registra el resultado en
`dbo.tbl_Ticket_Notificacion`. Configure `TICKETS_FRONTEND_URL` con la URL base
del detalle del ticket para incluir el enlace en el mensaje.

Cuando el ticket pasa a `PENDIENTE_CIERRE`, el destinatario es el correo del
vendedor recibido en la migración (`correoVendedor`). El backend genera un
token opaco de un solo uso, guarda únicamente su hash SHA-256 y construye el
enlace público con:

```env
TICKETS_SELLER_RESPONSE_URL=https://admin.ejemplo.com/ticket/responder
TICKETS_SELLER_TOKEN_EXPIRATION_HOURS=72
```

El vendedor puede cerrar o reabrir el ticket sin una cuenta de plataforma. La
validación, transición, historial y consumo del token se ejecutan en una sola
transacción SQL. Un token inexistente responde 404, uno consumido o cuyo ticket
ya fue procesado responde 409 y uno vencido responde 410.

Por ejemplo, si Angular usa la ruta `/home/tickets/:id`:

```env
TICKETS_FRONTEND_URL=https://admin.ejemplo.com/home/tickets
```

El servidor que publica Angular debe reenviar las rutas que no correspondan a
archivos hacia `index.html`; de lo contrario, abrir directamente el enlace del
correo devolverá 404. Para IIS se incluye un ejemplo en
`docs/angular-iis-web.config.example`. Debe copiarse como `web.config` a la raíz
del artefacto Angular publicado y requiere el módulo IIS URL Rewrite.

## Validación

```bash
npm run build
npm test
```

Las pruebas de integración con SQL Server requieren acceso de red a
`DB_HOST` y una base que ya contenga las tablas y procedimientos del sistema
PACO.
