/* Ejecutar despues de instalar la reparacion. Solo modifica tablas temporales.
   Usa el cuerpo real del procedimiento con un resolvedor temporal controlado. */
SET NOCOUNT ON;
DECLARE @Definition NVARCHAR(MAX) = OBJECT_DEFINITION(
    OBJECT_ID(N'dbo.PACO_TICKET_CHECKIN_REASIGNAR_VENDEDOR'));
DECLARE @Start INT = CHARINDEX(N'    SET NOCOUNT ON;', @Definition);
IF @Definition IS NULL OR @Start = 0
    THROW 51000, 'No se encontro el procedimiento de reparacion.', 1;

CREATE TABLE #Tickets (
    IdTicket BIGINT, NumeroTicket VARCHAR(30), Estado VARCHAR(40),
    CodigoCliente NVARCHAR(50), CodigoVendedor NVARCHAR(50),
    NombreVendedor NVARCHAR(200), CorreoVendedor NVARCHAR(256),
    SistemaOrigen VARCHAR(50), IdFormularioOrigen INT, Activo BIT, EsDemo BIT,
    FechaActualizacion DATETIME2(3)
);
CREATE TABLE #Tokens (IdTicket BIGINT, FechaUso DATETIME2(3));
CREATE TABLE #Historial (
    IdTicket BIGINT, EstadoAnterior VARCHAR(40), EstadoNuevo VARCHAR(40),
    Accion VARCHAR(50), Comentario NVARCHAR(MAX), UsuarioId NVARCHAR(450),
    NombreUsuario NVARCHAR(256), RolUsuario NVARCHAR(500)
);
CREATE TABLE #VendedorCliente (
    Cliente NVARCHAR(50), cantidad_asignaciones_sap INT, cantidad_vendedores INT,
    codigo_vendedor NVARCHAR(50), nombre_vendedor NVARCHAR(200),
    correo_vendedor NVARCHAR(256)
);
INSERT #VendedorCliente VALUES
    (N'C1', 1, 1, N'S07', N'Vendedor', N'vendedor@example.test'),
    (N'C2', 0, 0, NULL, NULL, NULL);
INSERT #Tickets VALUES
    (1,'T1','PENDIENTE_CIERRE','C1','IM2001','Impulsadora','impulsadora@example.test','CHECKIN',14,1,0,NULL),
    (2,'T2','PENDIENTE_CIERRE','C2','IM2001','Impulsadora','impulsadora@example.test','CHECKIN',14,1,0,NULL),
    (3,'T3','CERRADO','C1','IM2001','Impulsadora','impulsadora@example.test','CHECKIN',14,1,1,NULL);
INSERT #Tokens VALUES (1,NULL),(2,NULL),(3,NULL);

DECLARE @Body NVARCHAR(MAX) = SUBSTRING(@Definition, @Start, LEN(@Definition));
-- El BEGIN del procedimiento queda fuera del cuerpo extraido.
SET @Body = N'BEGIN ' + @Body;
SET @Body = REPLACE(@Body, N'dbo.tbl_Ticket_Token_Vendedor', N'#Tokens');
SET @Body = REPLACE(@Body, N'dbo.tbl_Ticket_Historial', N'#Historial');
SET @Body = REPLACE(@Body, N'dbo.tbl_Ticket', N'#Tickets');
SET @Body = REPLACE(@Body,
    N'CROSS APPLY dbo.PACO_TICKET_VENDEDOR_CLIENTE(T.CodigoCliente) V',
    N'CROSS APPLY (SELECT * FROM #VendedorCliente WHERE Cliente=T.CodigoCliente) V');
DECLARE @Params NVARCHAR(MAX) = N'@Ejecutar BIT, @IdTicket BIGINT, @Formulario INT, @UsuarioSistema NVARCHAR(450)';

EXEC sys.sp_executesql @Body, @Params, 0, NULL, 14, N'PRUEBA';
IF EXISTS (SELECT 1 FROM #Historial) OR EXISTS (SELECT 1 FROM #Tokens WHERE FechaUso IS NOT NULL)
    OR EXISTS (SELECT 1 FROM #Tickets WHERE CodigoVendedor <> 'IM2001')
    THROW 51000, 'La simulacion no debe modificar tickets ni enlaces.', 1;

EXEC sys.sp_executesql @Body, @Params, 1, NULL, 14, N'PRUEBA';
IF NOT EXISTS (SELECT 1 FROM #Tickets WHERE IdTicket=1 AND CodigoVendedor='S07'
    AND CorreoVendedor='vendedor@example.test' AND Estado='PENDIENTE_CIERRE')
    OR NOT EXISTS (SELECT 1 FROM #Tokens WHERE IdTicket=1 AND FechaUso IS NOT NULL)
    OR (SELECT COUNT(*) FROM #Historial) <> 1
    THROW 51000, 'La reparacion debe cambiar el vendedor, invalidar el enlace y dejar historial.', 1;
IF EXISTS (SELECT 1 FROM #Tickets WHERE IdTicket IN (2,3) AND CodigoVendedor<>'IM2001')
    OR EXISTS (SELECT 1 FROM #Tokens WHERE IdTicket IN (2,3) AND FechaUso IS NOT NULL)
    THROW 51000, 'No debe modificar demos ni casos sin vendedor valido.', 1;

EXEC sys.sp_executesql @Body, @Params, 1, NULL, 14, N'PRUEBA';
IF (SELECT COUNT(*) FROM #Historial) <> 1
    THROW 51000, 'Repetir la reparacion no debe duplicar cambios.', 1;

DROP TABLE #VendedorCliente;
DROP TABLE #Historial;
DROP TABLE #Tokens;
DROP TABLE #Tickets;
PRINT 'OK: simulacion, reasignacion, enlaces anteriores, historial y repeticion.';
