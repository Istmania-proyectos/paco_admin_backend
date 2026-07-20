/* Datos de prueba idempotentes para PACO_ADMIN_S4HANA_TEST.
   Todos los usuarios usan la clave: Ticket2026! */

DECLARE @PasswordHash NVARCHAR(MAX) = N'AQAAAAEAACcQAAAAEK9U9nkduICRQsgImwzb2thrO1hESaugWTcxRo0GVgUUArhWbLi51mEJfRf9IgVlEQ==';

DECLARE @Roles TABLE (Id NVARCHAR(450), Nombre NVARCHAR(256));
INSERT @Roles VALUES
    (N'TICKET-ROL-INTEGRACION', N'TICKET_INTEGRACION'),
    (N'TICKET-ROL-JEFE-MARCA', N'TICKET_JEFE_MARCA'),
    (N'TICKET-ROL-MERCADEO', N'TICKET_MERCADEO'),
    (N'TICKET-ROL-GERENCIA', N'TICKET_GERENCIA_GENERAL'),
    (N'TICKET-ROL-SUPERVISOR', N'TICKET_SUPERVISOR');

INSERT dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
SELECT R.Id, R.Nombre, UPPER(R.Nombre), CONVERT(NVARCHAR(36), NEWID())
FROM @Roles R
WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetRoles X WHERE X.Id = R.Id OR X.NormalizedName = UPPER(R.Nombre));

DECLARE @Usuarios TABLE (
    Id NVARCHAR(450), Email NVARCHAR(256), Nombre NVARCHAR(50), RolId NVARCHAR(450)
);
INSERT @Usuarios VALUES
    (N'TICKET-USER-INTEGRACION', N'ticket.integracion@test.local', N'Integración CheckIn', N'TICKET-ROL-INTEGRACION'),
    (N'TICKET-USER-JEFE-MARCA', N'ticket.jefemarca@test.local', N'Jefe de Marca', N'TICKET-ROL-JEFE-MARCA'),
    (N'TICKET-USER-MERCADEO', N'ticket.mercadeo@test.local', N'Gerente Mercadeo', N'TICKET-ROL-MERCADEO'),
    (N'TICKET-USER-GERENCIA', N'ticket.gerencia@test.local', N'Gerencia General', N'TICKET-ROL-GERENCIA'),
    (N'TICKET-USER-SUPERVISOR', N'ticket.supervisor@test.local', N'Supervisor Ventas', N'TICKET-ROL-SUPERVISOR');

INSERT dbo.AspNetUsers (
    Id, UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed,
    PasswordHash, SecurityStamp, ConcurrencyStamp, PhoneNumberConfirmed,
    TwoFactorEnabled, LockoutEnabled, AccessFailedCount, CreationDate,
    NombreContacto, Negocio
)
SELECT
    U.Id, U.Email, UPPER(U.Email), U.Email, UPPER(U.Email), 1,
    @PasswordHash, CONVERT(NVARCHAR(36), NEWID()), CONVERT(NVARCHAR(36), NEWID()),
    0, 0, 1, 0, GETDATE(), U.Nombre, N'DATOS DE PRUEBA TICKETS'
FROM @Usuarios U
WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetUsers X WHERE X.Id = U.Id OR X.NormalizedUserName = UPPER(U.Email));

-- Restablecer la clave conocida únicamente en las cuentas explícitas de prueba.
UPDATE U SET
    U.PasswordHash = @PasswordHash,
    U.EmailConfirmed = 1,
    U.SecurityStamp = CONVERT(NVARCHAR(36), NEWID()),
    U.ConcurrencyStamp = CONVERT(NVARCHAR(36), NEWID())
FROM dbo.AspNetUsers U
INNER JOIN @Usuarios T ON T.Id = U.Id;

INSERT dbo.AspNetUserRoles (UserId, RoleId)
SELECT U.Id, U.RolId
FROM @Usuarios U
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.AspNetUserRoles UR WHERE UR.UserId = U.Id AND UR.RoleId = U.RolId
);
GO

-- Ticket 10001: pendiente de plan.
IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Ticket WHERE SistemaOrigen = 'DEMO' AND IdRespuestaOrigen = 10001)
EXEC dbo.PACO_INSERT_TICKET 1, N'{
  "sistemaOrigen":"DEMO","idRespuestaOrigen":10001,"idFormularioOrigen":13,
  "codigoCliente":"T100001","nombreCliente":"Supermercado La Central",
  "codigoVendedor":"V001","nombreVendedor":"Vendedor Ticket","correoVendedor":"vendedor.v001@test.local",
  "tipoTicket":"PRODUCTO_PROXIMO_VENCER","titulo":"Leche próxima a vencer",
  "descripcion":"Producto con vencimiento menor a tres meses","prioridad":"ALTA",
  "fechaRespuestaOrigen":"2026-07-10T09:15:00","fechaVencimiento":"2026-09-15",
  "detalles":[
    {"idDetalleOrigen":100011,"idPreguntaOrigen":1,"pregunta":"Código del producto","tipoRespuesta":"TEXTO","valor":"LEC-001"},
    {"idDetalleOrigen":100012,"idPreguntaOrigen":2,"pregunta":"Lote","tipoRespuesta":"TEXTO","valor":"L-250610"},
    {"idDetalleOrigen":100013,"idPreguntaOrigen":3,"pregunta":"Cantidad","tipoRespuesta":"NUMERO","valor":"24"}
  ]}', N'TICKET-USER-INTEGRACION', N'ticket.integracion@test.local', N'TICKET_INTEGRACION', N'';
GO

-- Ticket 10002: esperando aprobación de Mercadeo.
IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Ticket WHERE SistemaOrigen = 'DEMO' AND IdRespuestaOrigen = 10002)
BEGIN
    EXEC dbo.PACO_INSERT_TICKET 1, N'{
      "sistemaOrigen":"DEMO","idRespuestaOrigen":10002,"idFormularioOrigen":13,
      "codigoCliente":"T100002","nombreCliente":"Comercial San José",
      "codigoVendedor":"V001","nombreVendedor":"Vendedor Ticket","correoVendedor":"vendedor.v001@test.local",
      "tipoTicket":"PRODUCTO_PROXIMO_VENCER","titulo":"Yogur próximo a vencer",
      "prioridad":"NORMAL","fechaVencimiento":"2026-10-01",
      "detalles":[{"idDetalleOrigen":100021,"pregunta":"Producto / lote / cantidad","tipoRespuesta":"TEXTO","valor":"YOG-200 / YG2601 / 18"}]
    }', N'TICKET-USER-INTEGRACION', N'ticket.integracion@test.local', N'TICKET_INTEGRACION', N'';
    DECLARE @T2 BIGINT = (SELECT IdTicket FROM dbo.tbl_Ticket WHERE SistemaOrigen='DEMO' AND IdRespuestaOrigen=10002);
    EXEC dbo.PACO_INSERT_TICKET 2, @T2, N'{"accion":"PROPONER_PLAN","tipoAccion":"REUBICACION","descripcionPlan":"Mover inventario a tiendas de alta rotación","fechaCompromiso":"2026-07-25","responsable":"TICKET-USER-SUPERVISOR","comentario":"Plan listo para revisión"}', N'TICKET-USER-JEFE-MARCA', N'ticket.jefemarca@test.local', N'TICKET_JEFE_MARCA';
END
GO

-- Ticket 10003: cambio pendiente de Gerencia General.
IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Ticket WHERE SistemaOrigen = 'DEMO' AND IdRespuestaOrigen = 10003)
BEGIN
    EXEC dbo.PACO_INSERT_TICKET 1, N'{
      "sistemaOrigen":"DEMO","idRespuestaOrigen":10003,"idFormularioOrigen":13,
      "codigoCliente":"T100003","nombreCliente":"Distribuidora El Ahorro",
      "codigoVendedor":"V002","nombreVendedor":"Ana López","correoVendedor":"vendedor.v002@test.local",
      "tipoTicket":"PRODUCTO_PROXIMO_VENCER","titulo":"Cereal requiere cambio",
      "prioridad":"URGENTE","fechaVencimiento":"2026-08-20",
      "detalles":[{"idDetalleOrigen":100031,"pregunta":"Producto / lote / cantidad","tipoRespuesta":"TEXTO","valor":"CER-050 / CE2410 / 40"}]
    }', N'TICKET-USER-INTEGRACION', N'ticket.integracion@test.local', N'TICKET_INTEGRACION', N'';
    DECLARE @T3 BIGINT = (SELECT IdTicket FROM dbo.tbl_Ticket WHERE SistemaOrigen='DEMO' AND IdRespuestaOrigen=10003);
    EXEC dbo.PACO_INSERT_TICKET 2, @T3, N'{"accion":"PROPONER_PLAN","tipoAccion":"CAMBIO","descripcionPlan":"Cambiar el lote completo","fechaCompromiso":"2026-07-22","responsable":"TICKET-USER-SUPERVISOR"}', N'TICKET-USER-JEFE-MARCA', N'ticket.jefemarca@test.local', N'TICKET_JEFE_MARCA';
    EXEC dbo.PACO_INSERT_TICKET 2, @T3, N'{"accion":"APROBAR_MERCADEO","comentario":"Cambio recomendado por Mercadeo"}', N'TICKET-USER-MERCADEO', N'ticket.mercadeo@test.local', N'TICKET_MERCADEO';
END
GO

-- Ticket 10004: plan en ejecución.
IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Ticket WHERE SistemaOrigen = 'DEMO' AND IdRespuestaOrigen = 10004)
BEGIN
    EXEC dbo.PACO_INSERT_TICKET 1, N'{
      "sistemaOrigen":"DEMO","idRespuestaOrigen":10004,"idFormularioOrigen":13,
      "codigoCliente":"T100004","nombreCliente":"Mini Market Kennedy",
      "codigoVendedor":"V003","nombreVendedor":"Carlos Rivera","correoVendedor":"vendedor.v003@test.local",
      "tipoTicket":"PRODUCTO_PROXIMO_VENCER","titulo":"Promoción de bebidas",
      "prioridad":"NORMAL","fechaVencimiento":"2026-11-05",
      "detalles":[{"idDetalleOrigen":100041,"pregunta":"Producto / lote / cantidad","tipoRespuesta":"TEXTO","valor":"BEB-100 / BE1105 / 60"}]
    }', N'TICKET-USER-INTEGRACION', N'ticket.integracion@test.local', N'TICKET_INTEGRACION', N'';
    DECLARE @T4 BIGINT = (SELECT IdTicket FROM dbo.tbl_Ticket WHERE SistemaOrigen='DEMO' AND IdRespuestaOrigen=10004);
    EXEC dbo.PACO_INSERT_TICKET 2, @T4, N'{"accion":"PROPONER_PLAN","tipoAccion":"PROMOCION","descripcionPlan":"Promoción dos por uno durante una semana","responsable":"TICKET-USER-SUPERVISOR"}', N'TICKET-USER-JEFE-MARCA', N'ticket.jefemarca@test.local', N'TICKET_JEFE_MARCA';
    EXEC dbo.PACO_INSERT_TICKET 2, @T4, N'{"accion":"APROBAR_MERCADEO","comentario":"Promoción aprobada"}', N'TICKET-USER-MERCADEO', N'ticket.mercadeo@test.local', N'TICKET_MERCADEO';
    EXEC dbo.PACO_INSERT_TICKET 2, @T4, N'{"accion":"INICIAR_EJECUCION","comentario":"Supervisor inició la promoción"}', N'TICKET-USER-SUPERVISOR', N'ticket.supervisor@test.local', N'TICKET_SUPERVISOR';
END
GO

-- Ticket 10005: pendiente de respuesta pública del vendedor.
IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Ticket WHERE SistemaOrigen = 'DEMO' AND IdRespuestaOrigen = 10005)
BEGIN
    EXEC dbo.PACO_INSERT_TICKET 1, N'{
      "sistemaOrigen":"DEMO","idRespuestaOrigen":10005,"idFormularioOrigen":13,
      "codigoCliente":"T100005","nombreCliente":"Pulpería Las Flores",
      "codigoVendedor":"V001","nombreVendedor":"Vendedor Ticket","correoVendedor":"vendedor.v001@test.local",
      "tipoTicket":"PRODUCTO_PROXIMO_VENCER","titulo":"Descuento aplicado a galletas",
      "prioridad":"BAJA","fechaVencimiento":"2026-12-10",
      "detalles":[{"idDetalleOrigen":100051,"pregunta":"Producto / lote / cantidad","tipoRespuesta":"TEXTO","valor":"GAL-010 / GA1210 / 12"}]
    }', N'TICKET-USER-INTEGRACION', N'ticket.integracion@test.local', N'TICKET_INTEGRACION', N'';
    DECLARE @T5 BIGINT = (SELECT IdTicket FROM dbo.tbl_Ticket WHERE SistemaOrigen='DEMO' AND IdRespuestaOrigen=10005);
    EXEC dbo.PACO_INSERT_TICKET 2, @T5, N'{"accion":"PROPONER_PLAN","tipoAccion":"DESCUENTO","descripcionPlan":"Aplicar descuento comercial del 10%","responsable":"TICKET-USER-SUPERVISOR"}', N'TICKET-USER-JEFE-MARCA', N'ticket.jefemarca@test.local', N'TICKET_JEFE_MARCA';
    EXEC dbo.PACO_INSERT_TICKET 2, @T5, N'{"accion":"APROBAR_MERCADEO","comentario":"Descuento aprobado"}', N'TICKET-USER-MERCADEO', N'ticket.mercadeo@test.local', N'TICKET_MERCADEO';
    EXEC dbo.PACO_INSERT_TICKET 2, @T5, N'{"accion":"INICIAR_EJECUCION"}', N'TICKET-USER-SUPERVISOR', N'ticket.supervisor@test.local', N'TICKET_SUPERVISOR';
    EXEC dbo.PACO_INSERT_TICKET 2, @T5, N'{"accion":"SOLICITAR_CIERRE","comentario":"Descuento aplicado; pendiente de respuesta del vendedor"}', N'TICKET-USER-SUPERVISOR', N'ticket.supervisor@test.local', N'TICKET_SUPERVISOR';
END
GO

-- Correccion de semillas anteriores: el vendedor no accede a PACO Admin.
UPDATE dbo.tbl_Ticket
SET CreadoPor = N'TICKET-USER-INTEGRACION',
    ResponsableActual = CASE
        WHEN ResponsableActual = N'TICKET-USER-VENDEDOR' THEN N'TICKET-USER-JEFE-MARCA'
        ELSE ResponsableActual
    END
WHERE SistemaOrigen = 'DEMO' AND CreadoPor = N'TICKET-USER-VENDEDOR';

UPDATE dbo.tbl_Ticket_Historial
SET UsuarioId = N'TICKET-USER-INTEGRACION',
    NombreUsuario = N'ticket.integracion@test.local',
    RolUsuario = N'TICKET_INTEGRACION'
WHERE Accion = 'CREAR' AND UsuarioId = N'TICKET-USER-VENDEDOR';

UPDATE dbo.tbl_Ticket_Historial
SET UsuarioId = N'TICKET-USER-SUPERVISOR',
    NombreUsuario = N'ticket.supervisor@test.local',
    RolUsuario = N'TICKET_SUPERVISOR',
    Comentario = N'Resultado validado por el supervisor'
WHERE Accion = 'CERRAR' AND UsuarioId = N'TICKET-USER-VENDEDOR';

DELETE FROM dbo.AspNetUserRoles WHERE UserId = N'TICKET-USER-VENDEDOR';
DELETE FROM dbo.AspNetUsers WHERE Id = N'TICKET-USER-VENDEDOR';
DELETE FROM dbo.AspNetRoles WHERE Id = N'TICKET-ROL-VENDEDOR';

UPDATE dbo.tbl_Ticket
SET CorreoVendedor = CASE CodigoVendedor
    WHEN 'V002' THEN N'vendedor.v002@test.local'
    WHEN 'V003' THEN N'vendedor.v003@test.local'
    ELSE N'vendedor.v001@test.local'
END
WHERE SistemaOrigen = 'DEMO' AND NULLIF(CorreoVendedor, '') IS NULL;
GO
