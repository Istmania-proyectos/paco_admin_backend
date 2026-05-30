# Migracion Market Online

Este modulo migra el backend ASP.NET ubicado en:

`/Users/oscarvasquez/Documents/ASP.NET/market_online_backend_2021/Market_ONLINE`

## Estructura aplicada

- `articulos`: reemplaza `ListaArticuloController` y los metodos de `Code/cArticulo.cs`.
- `orders`: reemplaza `OrdersController` y los metodos principales de `Code/cPedido.cs`.
- `accounts`: migra las consultas de direccion de `AccountsController` y `Code/cAccount.cs`.
- `auth`: conserva rutas `AuthController` para que el frontend no cambie sus URLs.
- `dashboard`: conserva rutas `DashboardController` y operaciones de perfil, direcciones, favoritos, ordenes y comentarios.
- `entities`: replica las entidades EF principales usadas por ordenes, pagos y cliente POS.
- `database/market/market.service.ts`: centraliza la ejecucion de procedimientos `Market_GET_ARTICULOS`, `Market_GET_MARKET`, `Market_GET_PEDIDOS` e `Market_GET_ACCOUNT`.

## Rutas migradas

- `GET /api/listaarticulo/GetFilter`
- `GET /api/listaarticulo/GetTodo`
- `GET /api/listaarticulo/GetTodoCombo`
- `GET /api/listaarticulo/GetComentario`
- `GET /api/listaarticulo/GetCupon`
- `GET /api/listaarticulo/GetMarket`
- `POST /api/listaarticulo/PostInicial`
- `POST /api/listaarticulo/PostFilter`
- `POST /api/orders/Order`
- `POST /api/orders/InsertClientePOS`
- `POST /api/orders/UpdateClientePOS`
- `GET /api/orders/GetFile`
- `POST /api/orders/UploadFile`
- `POST /api/orders/OrderPay`
- `GET /api/orders/OrderPayVerificacion`
- `POST /api/orders/CancelOrder`
- `GET /api/accounts/GetDireccion`
- `GET /api/accounts/GetDireccionUser`
- `POST /api/accounts/Post`
- `POST /api/accounts/GenerateConfirmEmail`
- `POST /api/accounts/ConfirmEmail`
- `POST /api/accounts/ResetPassword`
- `POST /api/accounts/ForgotPassword`
- `POST /api/accounts/ForgotPasswordAdmin`
- `POST /api/auth/Post`
- `POST /api/auth/LoginDelivery`
- `POST /api/auth/ExternalLogin`
- `POST /api/auth/GetUserClaims`
- `GET /api/dashboard/Home`
- `GET /api/dashboard/GetUserInfo`
- `POST /api/dashboard/InsertInfoUser`
- `POST /api/dashboard/UpdateInfoUser`
- `GET /api/dashboard/GetDireccionUser`
- `GET /api/dashboard/GetFile`
- `POST /api/dashboard/CreateDireccionUser`
- `POST /api/dashboard/UpdateDireccionUser`
- `POST /api/dashboard/DeleteDireccionUser`
- `GET /api/dashboard/GetOrderUser`
- `GET /api/dashboard/ChangePasswordAsync`
- `GET /api/dashboard/GetOrderUserDetails`
- `GET /api/dashboard/InsertFavoritoSKU`
- `POST /api/dashboard/InsertComentarioUser`
- `POST /api/dashboard/InsertComentarioRecetaUser`
- `POST /api/dashboard/InsertComentarioOrderUser`
- `POST /api/dashboard/ForgotPassword`

## Pendiente

- Revisar equivalencia de hashes de ASP.NET Identity antes de usar `Auth/Post` como reemplazo final. La ruta existe y devuelve el formato anterior (`id`, `access_token`, `expires_in`, `roles`), pero usa el login actual del proyecto Nest.
- El correo SMTP ya esta integrado para confirmacion y restauracion de contraseña mediante `EMAIL_*` en `.env`.
- `ResetPassword` valida el token enviado por correo y actualiza la contraseña usando el cifrado actual del proyecto Nest.
- Confirmar nombres reales de tablas/relaciones generadas por EF antes de activar `synchronize` en ambientes compartidos.
- Definir `Market_UPLOAD_DIR` en `.env`; si no existe, `UploadFile` usa `/tmp/market-transfer`.
