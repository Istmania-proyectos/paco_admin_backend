/*
  PRUEBAS: modulo aislado de tickets de vencimiento.
  Seguro para correr junto a los tickets existentes: no altera ni borra objetos
  ajenos. Ejecutar en PACO_ADMIN_S4HANA (o la base de pruebas equivalente).
*/
IF OBJECT_ID('dbo.tbl_Ticket_Vencimiento','U') IS NULL
CREATE TABLE dbo.tbl_Ticket_Vencimiento(
 IdTicketVencimiento BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TicketVencimiento PRIMARY KEY,
 NumeroTicket VARCHAR(30) NOT NULL CONSTRAINT UQ_TicketVencimiento_Numero UNIQUE,
 SistemaOrigen VARCHAR(30) NOT NULL CONSTRAINT DF_TV_Origen DEFAULT('CHECKIN'),
 IdFormularioOrigen INT NOT NULL, IdRespuestaOrigen BIGINT NOT NULL,
 CodigoCliente VARCHAR(50) NOT NULL, NombreCliente NVARCHAR(200) NOT NULL,
 CodigoVendedor VARCHAR(50) NULL, NombreVendedor NVARCHAR(200) NULL, CorreoVendedor NVARCHAR(256) NULL,
 VendedorUsuarioId NVARCHAR(450) NOT NULL,
 CorreoJefeMarca NVARCHAR(256) NOT NULL, CorreoGerenteMercadeo NVARCHAR(256) NOT NULL, CorreoGerenciaGeneral NVARCHAR(256) NULL,
 Titulo NVARCHAR(250) NOT NULL, Descripcion NVARCHAR(MAX) NULL, Prioridad VARCHAR(20) NOT NULL CONSTRAINT DF_TV_Prioridad DEFAULT('NORMAL'),
 Estado VARCHAR(30) NOT NULL CONSTRAINT DF_TV_Estado DEFAULT('PENDIENTE_PLAN'),
 FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TV_Fecha DEFAULT SYSUTCDATETIME(),
 FechaActualizacion DATETIME2(3) NULL, FechaCierre DATETIME2(3) NULL, Activo BIT NOT NULL CONSTRAINT DF_TV_Activo DEFAULT 1,
 CONSTRAINT UQ_TV_Checkin UNIQUE(SistemaOrigen,IdFormularioOrigen,IdRespuestaOrigen),
 CONSTRAINT CK_TV_Prioridad CHECK(Prioridad IN('BAJA','NORMAL','ALTA','URGENTE')),
 CONSTRAINT CK_TV_Estado CHECK(Estado IN('PENDIENTE_PLAN','PENDIENTE_MERCADEO','PENDIENTE_GERENCIA_GENERAL','EN_EJECUCION','CERRADO','REABIERTO_URGENTE'))
);
GO
IF OBJECT_ID('dbo.tbl_Ticket_Vencimiento_Detalle','U') IS NULL
CREATE TABLE dbo.tbl_Ticket_Vencimiento_Detalle(
 IdDetalle BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TVD PRIMARY KEY, IdTicketVencimiento BIGINT NOT NULL,
 IdPreguntaOrigen INT NOT NULL, Pregunta NVARCHAR(500) NULL, TipoRespuesta VARCHAR(50) NULL, Valor NVARCHAR(MAX) NULL,
 CONSTRAINT FK_TVD_TV FOREIGN KEY(IdTicketVencimiento) REFERENCES dbo.tbl_Ticket_Vencimiento(IdTicketVencimiento),
 CONSTRAINT UQ_TVD_Pregunta UNIQUE(IdTicketVencimiento,IdPreguntaOrigen)
);
GO
IF OBJECT_ID('dbo.tbl_Ticket_Vencimiento_Plan','U') IS NULL
CREATE TABLE dbo.tbl_Ticket_Vencimiento_Plan(
 IdPlan BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TVP PRIMARY KEY, IdTicketVencimiento BIGINT NOT NULL,
 TipoAccion VARCHAR(50) NOT NULL, Descripcion NVARCHAR(MAX) NOT NULL, FechaCompromiso DATE NULL, Responsable NVARCHAR(450) NULL,
 Estado VARCHAR(20) NOT NULL CONSTRAINT DF_TVP_Estado DEFAULT('PROPUESTO'), CreadoPor NVARCHAR(256) NOT NULL, FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TVP_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_TVP_TV FOREIGN KEY(IdTicketVencimiento) REFERENCES dbo.tbl_Ticket_Vencimiento(IdTicketVencimiento)
);
GO
IF OBJECT_ID('dbo.tbl_Ticket_Vencimiento_Historial','U') IS NULL
CREATE TABLE dbo.tbl_Ticket_Vencimiento_Historial(
 IdHistorial BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TVH PRIMARY KEY, IdTicketVencimiento BIGINT NOT NULL,
 EstadoAnterior VARCHAR(30) NULL, EstadoNuevo VARCHAR(30) NOT NULL, Accion VARCHAR(50) NOT NULL, Comentario NVARCHAR(MAX) NULL,
 UsuarioId NVARCHAR(450) NULL, NombreUsuario NVARCHAR(256) NULL, RolUsuario VARCHAR(50) NULL, Fecha DATETIME2(3) NOT NULL CONSTRAINT DF_TVH_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_TVH_TV FOREIGN KEY(IdTicketVencimiento) REFERENCES dbo.tbl_Ticket_Vencimiento(IdTicketVencimiento)
);
GO
IF OBJECT_ID('dbo.tbl_Ticket_Vencimiento_AprobacionToken','U') IS NULL
CREATE TABLE dbo.tbl_Ticket_Vencimiento_AprobacionToken(
 IdToken BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TVAT PRIMARY KEY, IdTicketVencimiento BIGINT NOT NULL,
 Etapa VARCHAR(30) NOT NULL, CorreoDestino NVARCHAR(256) NOT NULL, TokenHash BINARY(32) NOT NULL CONSTRAINT UQ_TVAT_Hash UNIQUE,
 FechaExpiracion DATETIME2(3) NOT NULL, FechaUso DATETIME2(3) NULL, FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TVAT_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_TVAT_TV FOREIGN KEY(IdTicketVencimiento) REFERENCES dbo.tbl_Ticket_Vencimiento(IdTicketVencimiento),
 CONSTRAINT CK_TVAT_Etapa CHECK(Etapa IN('JEFE_MARCA','MERCADEO','GERENCIA_GENERAL'))
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_TV_Vendedor' AND object_id=OBJECT_ID('dbo.tbl_Ticket_Vencimiento')) CREATE INDEX IX_TV_Vendedor ON dbo.tbl_Ticket_Vencimiento(VendedorUsuarioId,Activo,FechaCreacion DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_TVD_Ticket' AND object_id=OBJECT_ID('dbo.tbl_Ticket_Vencimiento_Detalle')) CREATE INDEX IX_TVD_Ticket ON dbo.tbl_Ticket_Vencimiento_Detalle(IdTicketVencimiento);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_TVH_Ticket' AND object_id=OBJECT_ID('dbo.tbl_Ticket_Vencimiento_Historial')) CREATE INDEX IX_TVH_Ticket ON dbo.tbl_Ticket_Vencimiento_Historial(IdTicketVencimiento,Fecha DESC);
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_VENCIMIENTO_GET @Option INT,@Param1 VARCHAR(MAX),@Param2 NVARCHAR(MAX),@Param3 NVARCHAR(MAX),@Param4 NVARCHAR(MAX),@Param5 NVARCHAR(MAX)
AS BEGIN SET NOCOUNT ON;
 IF @Option=1 BEGIN DECLARE @P INT=ISNULL(TRY_CONVERT(INT,@Param2),1),@S INT=ISNULL(TRY_CONVERT(INT,@Param4),10); SELECT T.*,COUNT(*) OVER() TotalEncontrados FROM dbo.tbl_Ticket_Vencimiento T WHERE T.Activo=1 AND T.VendedorUsuarioId=@Param5 AND(NULLIF(@Param1,'') IS NULL OR T.Estado=@Param1) AND(NULLIF(@Param3,'') IS NULL OR T.NumeroTicket LIKE '%'+@Param3+'%' OR T.NombreCliente LIKE '%'+@Param3+'%') ORDER BY T.FechaCreacion DESC OFFSET (@P-1)*@S ROWS FETCH NEXT @S ROWS ONLY; RETURN; END
 IF @Option=2 SELECT * FROM dbo.tbl_Ticket_Vencimiento WHERE IdTicketVencimiento=TRY_CONVERT(BIGINT,@Param1) AND VendedorUsuarioId=@Param5;
 IF @Option=3 SELECT D.* FROM dbo.tbl_Ticket_Vencimiento_Detalle D JOIN dbo.tbl_Ticket_Vencimiento T ON T.IdTicketVencimiento=D.IdTicketVencimiento WHERE D.IdTicketVencimiento=TRY_CONVERT(BIGINT,@Param1) AND T.VendedorUsuarioId=@Param5;
 IF @Option=4 SELECT P.* FROM dbo.tbl_Ticket_Vencimiento_Plan P JOIN dbo.tbl_Ticket_Vencimiento T ON T.IdTicketVencimiento=P.IdTicketVencimiento WHERE P.IdTicketVencimiento=TRY_CONVERT(BIGINT,@Param1) AND T.VendedorUsuarioId=@Param5;
 IF @Option=5 SELECT H.* FROM dbo.tbl_Ticket_Vencimiento_Historial H JOIN dbo.tbl_Ticket_Vencimiento T ON T.IdTicketVencimiento=H.IdTicketVencimiento WHERE H.IdTicketVencimiento=TRY_CONVERT(BIGINT,@Param1) AND T.VendedorUsuarioId=@Param5 ORDER BY H.Fecha DESC;
END
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_VENCIMIENTO_CREATE @Json NVARCHAR(MAX),@UsuarioId NVARCHAR(450),@NombreUsuario NVARCHAR(256)
AS BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @F INT=TRY_CONVERT(INT,JSON_VALUE(@Json,'$.idFormularioOrigen')),@R BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@Json,'$.idRespuestaOrigen'));
 IF @F IS NULL OR @R IS NULL RAISERROR('Formulario y respuesta son requeridos.',16,1);
 BEGIN TRAN; INSERT dbo.tbl_Ticket_Vencimiento(NumeroTicket,IdFormularioOrigen,IdRespuestaOrigen,CodigoCliente,NombreCliente,CodigoVendedor,NombreVendedor,CorreoVendedor,VendedorUsuarioId,CorreoJefeMarca,CorreoGerenteMercadeo,CorreoGerenciaGeneral,Titulo,Descripcion,Prioridad)
 VALUES(CONCAT('TMP-',LEFT(REPLACE(CONVERT(VARCHAR(36),NEWID()),'-',''),26)),@F,@R,JSON_VALUE(@Json,'$.codigoCliente'),JSON_VALUE(@Json,'$.nombreCliente'),JSON_VALUE(@Json,'$.codigoVendedor'),JSON_VALUE(@Json,'$.nombreVendedor'),JSON_VALUE(@Json,'$.correoVendedor'),@UsuarioId,JSON_VALUE(@Json,'$.correoJefeMarca'),JSON_VALUE(@Json,'$.correoGerenteMercadeo'),NULLIF(JSON_VALUE(@Json,'$.correoGerenciaGeneral'),''),JSON_VALUE(@Json,'$.titulo'),JSON_VALUE(@Json,'$.descripcion'),ISNULL(NULLIF(JSON_VALUE(@Json,'$.prioridad'),''),'NORMAL'));
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); UPDATE dbo.tbl_Ticket_Vencimiento SET NumeroTicket=CONCAT('TV-',RIGHT(REPLICATE('0',10)+CONVERT(VARCHAR(20),@Id),10)) WHERE IdTicketVencimiento=@Id;
 INSERT dbo.tbl_Ticket_Vencimiento_Detalle(IdTicketVencimiento,IdPreguntaOrigen,Pregunta,TipoRespuesta,Valor) SELECT @Id,idPreguntaOrigen,pregunta,tipoRespuesta,valor FROM OPENJSON(@Json,'$.detalles') WITH(idPreguntaOrigen INT '$.idPreguntaOrigen',pregunta NVARCHAR(500) '$.pregunta',tipoRespuesta VARCHAR(50) '$.tipoRespuesta',valor NVARCHAR(MAX) '$.valor');
 IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Vencimiento_Detalle WHERE IdTicketVencimiento=@Id) RAISERROR('La respuesta debe incluir detalles.',16,1);
 INSERT dbo.tbl_Ticket_Vencimiento_Historial(IdTicketVencimiento,EstadoNuevo,Accion,Comentario,UsuarioId,NombreUsuario,RolUsuario) VALUES(@Id,'PENDIENTE_PLAN','CREAR','Importado desde CheckIn',@UsuarioId,@NombreUsuario,'VENDEDOR'); COMMIT; SELECT IdTicketVencimiento IdTicket,NumeroTicket,Estado,CorreoJefeMarca CorreoDestino,'JEFE_MARCA' Etapa FROM dbo.tbl_Ticket_Vencimiento WHERE IdTicketVencimiento=@Id;
END
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_VENCIMIENTO_RESPUESTA_VENDEDOR @IdTicket BIGINT,@UsuarioId NVARCHAR(450),@Accion VARCHAR(20),@Comentario NVARCHAR(2000),@NombreUsuario NVARCHAR(256)
AS BEGIN SET NOCOUNT ON; DECLARE @Old VARCHAR(30),@New VARCHAR(30); SELECT @Old=Estado FROM dbo.tbl_Ticket_Vencimiento WHERE IdTicketVencimiento=@IdTicket AND VendedorUsuarioId=@UsuarioId; SET @New=CASE WHEN @Accion='CERRAR' AND @Old='EN_EJECUCION' THEN 'CERRADO' WHEN @Accion='REABRIR' AND @Old='EN_EJECUCION' THEN 'REABIERTO_URGENTE' END; IF @New IS NULL RAISERROR('Transicion no valida.',16,1); UPDATE dbo.tbl_Ticket_Vencimiento SET Estado=@New,Prioridad=IIF(@New='REABIERTO_URGENTE','URGENTE',Prioridad),FechaActualizacion=SYSUTCDATETIME(),FechaCierre=IIF(@New='CERRADO',SYSUTCDATETIME(),NULL) WHERE IdTicketVencimiento=@IdTicket; INSERT dbo.tbl_Ticket_Vencimiento_Historial(IdTicketVencimiento,EstadoAnterior,EstadoNuevo,Accion,Comentario,UsuarioId,NombreUsuario,RolUsuario) VALUES(@IdTicket,@Old,@New,@Accion,@Comentario,@UsuarioId,@NombreUsuario,'VENDEDOR'); END
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_VENCIMIENTO_CHECKIN_RESPUESTAS @Formulario INT=14
AS BEGIN SET NOCOUNT ON; SELECT RD.respuesta,RD.pregunta,P.descripcion pregunta_descripcion,RD.valor,RD.formulario,F.descripcion formulario_descripcion,RD.tipo_pregunta FROM [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuesta_Detalle] RD LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Preguntas] P ON P.pregunta=RD.pregunta LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Formulario] F ON F.formulario=RD.formulario WHERE RD.formulario=@Formulario; END
GO
