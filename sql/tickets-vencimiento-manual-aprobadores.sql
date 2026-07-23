/*
  Ajuste del flujo de vencimientos.
  Ejecutar DESPUES de sql/tickets.sql, en PACO_ADMIN_S4HANA.

  Reglas implementadas:
  - El ticket pertenece a un usuario vendedor de PACO Admin.
  - Las direcciones de aprobacion se capturan por ticket, no se resuelven por rol.
  - Jefe de Marca define el plan por enlace de correo; Mercadeo y, cuando
    corresponde, Gerencia General aprueban/rechazan por enlaces de un solo uso.
*/

IF COL_LENGTH('dbo.tbl_Ticket', 'VendedorUsuarioId') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD VendedorUsuarioId NVARCHAR(450) NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'CorreoJefeMarca') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CorreoJefeMarca NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'CorreoGerenteMercadeo') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CorreoGerenteMercadeo NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'CorreoGerenciaGeneral') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CorreoGerenciaGeneral NVARCHAR(256) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_Ticket_Vendedor_Bandeja'
               AND object_id = OBJECT_ID('dbo.tbl_Ticket'))
    CREATE INDEX IX_tbl_Ticket_Vendedor_Bandeja
    ON dbo.tbl_Ticket(VendedorUsuarioId, Activo, FechaCreacion DESC);
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Aprobacion_Token', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Aprobacion_Token (
        IdToken BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TicketAprobacionToken PRIMARY KEY,
        IdTicket BIGINT NOT NULL,
        Etapa VARCHAR(30) NOT NULL,
        CorreoDestino NVARCHAR(256) NOT NULL,
        TokenHash BINARY(32) NOT NULL,
        FechaExpiracion DATETIME2(3) NOT NULL,
        FechaUso DATETIME2(3) NULL,
        FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TicketAprobacionToken_Fecha DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_TicketAprobacionToken_Ticket FOREIGN KEY (IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket),
        CONSTRAINT UQ_TicketAprobacionToken_Hash UNIQUE(TokenHash),
        CONSTRAINT CK_TicketAprobacionToken_Etapa CHECK (Etapa IN ('JEFE_MARCA','MERCADEO','GERENCIA_GENERAL'))
    );
    CREATE INDEX IX_TicketAprobacionToken_Ticket ON dbo.tbl_Ticket_Aprobacion_Token(IdTicket, Etapa, FechaCreacion DESC);
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_GET
    @Option INT, @Param1 VARCHAR(MAX), @Param2 NVARCHAR(MAX), @Param3 NVARCHAR(MAX),
    @Param4 NVARCHAR(MAX), @Param5 NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    /* 1=bandeja del vendedor. Param1=estado, Param2=pagina, Param3=texto,
       Param4=tamano, Param5=Id de usuario PACO. */
    IF @Option = 1
    BEGIN
        DECLARE @Pagina INT = IIF(TRY_CONVERT(INT,@Param2) > 0, TRY_CONVERT(INT,@Param2), 1);
        DECLARE @Tamano INT = IIF(TRY_CONVERT(INT,@Param4) BETWEEN 1 AND 100, TRY_CONVERT(INT,@Param4), 10);
        SELECT T.IdTicket,T.NumeroTicket,T.CodigoCliente,T.NombreCliente,T.CodigoVendedor,
          T.NombreVendedor,T.TipoTicket,T.Titulo,T.Prioridad,T.Estado,T.FechaCreacion,
          T.FechaActualizacion,T.VendedorUsuarioId,COUNT(*) OVER() TotalEncontrados
        FROM dbo.tbl_Ticket T
        WHERE T.Activo=1 AND T.VendedorUsuarioId=@Param5
          AND (NULLIF(@Param1,'') IS NULL OR T.Estado=@Param1)
          AND (NULLIF(@Param3,'') IS NULL OR T.NumeroTicket LIKE '%'+@Param3+'%'
               OR T.CodigoCliente LIKE '%'+@Param3+'%' OR T.NombreCliente LIKE '%'+@Param3+'%'
               OR T.Titulo LIKE '%'+@Param3+'%')
        ORDER BY T.FechaCreacion DESC
        OFFSET (@Pagina-1)*@Tamano ROWS FETCH NEXT @Tamano ROWS ONLY;
        RETURN;
    END
    IF @Option=2 SELECT * FROM dbo.tbl_Ticket WHERE IdTicket=TRY_CONVERT(BIGINT,@Param1) AND VendedorUsuarioId=@Param5;
    IF @Option=3 SELECT D.* FROM dbo.tbl_Ticket_Detalle D JOIN dbo.tbl_Ticket T ON T.IdTicket=D.IdTicket WHERE D.IdTicket=TRY_CONVERT(BIGINT,@Param1) AND T.VendedorUsuarioId=@Param5 ORDER BY D.IdTicketDetalle;
    IF @Option=4 SELECT P.* FROM dbo.tbl_Ticket_Plan_Accion P JOIN dbo.tbl_Ticket T ON T.IdTicket=P.IdTicket WHERE P.IdTicket=TRY_CONVERT(BIGINT,@Param1) AND T.VendedorUsuarioId=@Param5 ORDER BY P.IdPlanAccion DESC;
    IF @Option=5 SELECT H.* FROM dbo.tbl_Ticket_Historial H JOIN dbo.tbl_Ticket T ON T.IdTicket=H.IdTicket WHERE H.IdTicket=TRY_CONVERT(BIGINT,@Param1) AND T.VendedorUsuarioId=@Param5 ORDER BY H.Fecha DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_CREATE
    @Json NVARCHAR(MAX), @UsuarioId NVARCHAR(450), @NombreUsuario NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF ISJSON(@Json)<>1 RAISERROR('El ticket no es JSON valido.',16,1);
    IF NULLIF(JSON_VALUE(@Json,'$.correoJefeMarca'),'') IS NULL
       OR NULLIF(JSON_VALUE(@Json,'$.correoGerenteMercadeo'),'') IS NULL
       RAISERROR('Jefe de Marca y Gerente de Mercadeo requieren correo.',16,1);
    DECLARE @Respuesta BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@Json,'$.idRespuestaOrigen'));
    DECLARE @Formulario INT=TRY_CONVERT(INT,JSON_VALUE(@Json,'$.idFormularioOrigen'));
    IF @Respuesta IS NULL OR @Formulario IS NULL
       RAISERROR('El formulario y la respuesta de CheckIn son requeridos.',16,1);
    IF EXISTS(SELECT 1 FROM dbo.tbl_Ticket WHERE SistemaOrigen='CHECKIN' AND IdFormularioOrigen=@Formulario AND IdRespuestaOrigen=@Respuesta)
       RAISERROR('La respuesta de este formulario ya tiene un ticket.',16,1);
    BEGIN TRAN;
    INSERT dbo.tbl_Ticket(NumeroTicket,SistemaOrigen,IdRespuestaOrigen,IdFormularioOrigen,
      CodigoCliente,NombreCliente,CodigoVendedor,NombreVendedor,CorreoVendedor,VendedorUsuarioId,
      CorreoJefeMarca,CorreoGerenteMercadeo,CorreoGerenciaGeneral,TipoTicket,Titulo,Descripcion,
      Prioridad,CreadoPor,ResponsableActual)
    VALUES(CONCAT('TMP-',LEFT(REPLACE(CONVERT(VARCHAR(36),NEWID()),'-',''),26)),'CHECKIN',@Respuesta,
      @Formulario,
      JSON_VALUE(@Json,'$.codigoCliente'),JSON_VALUE(@Json,'$.nombreCliente'),
      JSON_VALUE(@Json,'$.codigoVendedor'),JSON_VALUE(@Json,'$.nombreVendedor'),JSON_VALUE(@Json,'$.correoVendedor'),
      @UsuarioId,JSON_VALUE(@Json,'$.correoJefeMarca'),JSON_VALUE(@Json,'$.correoGerenteMercadeo'),
      NULLIF(JSON_VALUE(@Json,'$.correoGerenciaGeneral'),''),'PRODUCTO_PROXIMO_VENCER',
      JSON_VALUE(@Json,'$.titulo'),JSON_VALUE(@Json,'$.descripcion'),
      ISNULL(NULLIF(JSON_VALUE(@Json,'$.prioridad'),''),'NORMAL'),@UsuarioId,NULL);
    DECLARE @Id BIGINT=SCOPE_IDENTITY();
    UPDATE dbo.tbl_Ticket SET NumeroTicket=CONCAT('TKT-',RIGHT(REPLICATE('0',10)+CONVERT(VARCHAR(20),@Id),10)) WHERE IdTicket=@Id;
    INSERT dbo.tbl_Ticket_Detalle(IdTicket,IdDetalleOrigen,IdPreguntaOrigen,Pregunta,TipoRespuesta,Valor)
    SELECT @Id,D.idDetalleOrigen,D.idPreguntaOrigen,D.pregunta,D.tipoRespuesta,D.valor
    FROM OPENJSON(@Json,'$.detalles') WITH(idDetalleOrigen BIGINT '$.idDetalleOrigen',idPreguntaOrigen INT '$.idPreguntaOrigen',pregunta NVARCHAR(500) '$.pregunta',tipoRespuesta VARCHAR(50) '$.tipoRespuesta',valor NVARCHAR(MAX) '$.valor') D;
    IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Detalle WHERE IdTicket=@Id) RAISERROR('Debe incluir respuestas de CheckIn.',16,1);
    INSERT dbo.tbl_Ticket_Historial(IdTicket,EstadoNuevo,Accion,Comentario,UsuarioId,NombreUsuario,RolUsuario)
      VALUES(@Id,'PENDIENTE_PLAN','CREAR','Ticket creado desde formulario CheckIn.',@UsuarioId,@NombreUsuario,'VENDEDOR');
    COMMIT;
    SELECT IdTicket,NumeroTicket,Estado,CorreoJefeMarca CorreoDestino,'JEFE_MARCA' Etapa FROM dbo.tbl_Ticket WHERE IdTicket=@Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_RESPUESTA_VENDEDOR
    @IdTicket BIGINT, @UsuarioId NVARCHAR(450), @Accion VARCHAR(20), @Comentario NVARCHAR(2000), @NombreUsuario NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    DECLARE @Estado VARCHAR(30); SELECT @Estado=Estado FROM dbo.tbl_Ticket WITH(UPDLOCK,HOLDLOCK) WHERE IdTicket=@IdTicket AND VendedorUsuarioId=@UsuarioId AND Activo=1;
    IF @Estado IS NULL RAISERROR('Ticket no encontrado o no asignado al vendedor.',16,1);
    DECLARE @Nuevo VARCHAR(30)=CASE WHEN @Accion='CERRAR' AND @Estado='EN_EJECUCION' THEN 'CERRADO' WHEN @Accion='REABRIR' AND @Estado='EN_EJECUCION' THEN 'REABIERTO_URGENTE' END;
    IF @Nuevo IS NULL RAISERROR('Solo se puede cerrar o reabrir un ticket en ejecucion.',16,1);
    UPDATE dbo.tbl_Ticket SET Estado=@Nuevo,Prioridad=IIF(@Nuevo='REABIERTO_URGENTE','URGENTE',Prioridad),FechaActualizacion=SYSUTCDATETIME(),FechaCierre=IIF(@Nuevo='CERRADO',SYSUTCDATETIME(),NULL) WHERE IdTicket=@IdTicket;
    INSERT dbo.tbl_Ticket_Historial(IdTicket,EstadoAnterior,EstadoNuevo,Accion,Comentario,UsuarioId,NombreUsuario,RolUsuario)
      VALUES(@IdTicket,@Estado,@Nuevo,@Accion,@Comentario,@UsuarioId,@NombreUsuario,'VENDEDOR');
    COMMIT;
    SELECT T.IdTicket,T.NumeroTicket,T.Estado,T.CorreoJefeMarca CorreoDestino,'JEFE_MARCA' Etapa FROM dbo.tbl_Ticket T WHERE T.IdTicket=@IdTicket AND @Nuevo='REABIERTO_URGENTE';
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_EMITIR_TOKEN_APROBACION
    @IdTicket BIGINT,@Etapa VARCHAR(30),@Correo NVARCHAR(256),@HashHex VARCHAR(64),@Expira DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.tbl_Ticket_Aprobacion_Token SET FechaUso=SYSUTCDATETIME() WHERE IdTicket=@IdTicket AND Etapa=@Etapa AND FechaUso IS NULL;
    INSERT dbo.tbl_Ticket_Aprobacion_Token(IdTicket,Etapa,CorreoDestino,TokenHash,FechaExpiracion)
      VALUES(@IdTicket,@Etapa,@Correo,CONVERT(VARBINARY(32),@HashHex,2),@Expira);
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_GET_APROBACION
    @HashHex VARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CASE WHEN X.FechaUso IS NOT NULL THEN 'USADO' WHEN X.FechaExpiracion<=SYSUTCDATETIME() THEN 'VENCIDO'
                WHEN (X.Etapa='JEFE_MARCA' AND T.Estado NOT IN('PENDIENTE_PLAN','REABIERTO_URGENTE'))
                  OR (X.Etapa='MERCADEO' AND T.Estado<>'PENDIENTE_MERCADEO')
                  OR (X.Etapa='GERENCIA_GENERAL' AND T.Estado<>'PENDIENTE_GERENCIA_GENERAL') THEN 'PROCESADO' ELSE 'VALIDO' END TokenEstado,
      X.Etapa,X.CorreoDestino,T.IdTicket,T.NumeroTicket,T.Titulo,T.NombreCliente,T.Estado
    FROM dbo.tbl_Ticket_Aprobacion_Token X JOIN dbo.tbl_Ticket T ON T.IdTicket=X.IdTicket
    WHERE X.TokenHash=CONVERT(VARBINARY(32),@HashHex,2);
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_RESPONDER_APROBACION
    @HashHex VARCHAR(64),@Json NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF ISJSON(@Json)<>1 RAISERROR('La respuesta no es JSON valido.',16,1);
    BEGIN TRAN;
    DECLARE @IdToken BIGINT,@IdTicket BIGINT,@Etapa VARCHAR(30),@Correo NVARCHAR(256),@Estado VARCHAR(30),@Expira DATETIME2(3),@Usado DATETIME2(3);
    SELECT @IdToken=X.IdToken,@IdTicket=X.IdTicket,@Etapa=X.Etapa,@Correo=X.CorreoDestino,@Expira=X.FechaExpiracion,@Usado=X.FechaUso,@Estado=T.Estado
    FROM dbo.tbl_Ticket_Aprobacion_Token X WITH(UPDLOCK,HOLDLOCK) JOIN dbo.tbl_Ticket T WITH(UPDLOCK,HOLDLOCK) ON T.IdTicket=X.IdTicket WHERE X.TokenHash=CONVERT(VARBINARY(32),@HashHex,2);
    IF @IdToken IS NULL OR @Usado IS NOT NULL OR @Expira<=SYSUTCDATETIME() RAISERROR('El enlace no es valido.',16,1);
    DECLARE @Decision VARCHAR(20)=JSON_VALUE(@Json,'$.decision'),@Nuevo VARCHAR(30),@SiguienteEtapa VARCHAR(30),@SiguienteCorreo NVARCHAR(256),@Tipo VARCHAR(50)=JSON_VALUE(@Json,'$.tipoAccion');
    IF @Etapa='JEFE_MARCA'
    BEGIN
      IF @Estado NOT IN('PENDIENTE_PLAN','REABIERTO_URGENTE') OR @Decision<>'PROPONER_PLAN' OR NULLIF(JSON_VALUE(@Json,'$.descripcionPlan'),'') IS NULL OR @Tipo IS NULL RAISERROR('Plan de accion invalido.',16,1);
      INSERT dbo.tbl_Ticket_Plan_Accion(IdTicket,TipoAccion,Descripcion,FechaCompromiso,Responsable,Estado,CreadoPor)
        VALUES(@IdTicket,@Tipo,JSON_VALUE(@Json,'$.descripcionPlan'),TRY_CONVERT(DATE,JSON_VALUE(@Json,'$.fechaCompromiso')),JSON_VALUE(@Json,'$.responsable'),'PROPUESTO',@Correo);
      SET @Nuevo='PENDIENTE_MERCADEO'; SET @SiguienteEtapa='MERCADEO'; SELECT @SiguienteCorreo=CorreoGerenteMercadeo FROM dbo.tbl_Ticket WHERE IdTicket=@IdTicket;
    END
    ELSE IF @Etapa='MERCADEO'
    BEGIN
      IF @Estado<>'PENDIENTE_MERCADEO' OR @Decision NOT IN('APROBAR','RECHAZAR') RAISERROR('Decision de Mercadeo invalida.',16,1);
      IF @Decision='RECHAZAR' BEGIN SET @Nuevo='PENDIENTE_PLAN'; SET @SiguienteEtapa='JEFE_MARCA'; SELECT @SiguienteCorreo=CorreoJefeMarca FROM dbo.tbl_Ticket WHERE IdTicket=@IdTicket; END
      ELSE IF EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Plan_Accion WHERE IdPlanAccion=(SELECT MAX(IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion WHERE IdTicket=@IdTicket) AND TipoAccion IN('CAMBIO','DEVOLUCION'))
        BEGIN SET @Nuevo='PENDIENTE_GERENCIA_GENERAL'; SET @SiguienteEtapa='GERENCIA_GENERAL'; SELECT @SiguienteCorreo=CorreoGerenciaGeneral FROM dbo.tbl_Ticket WHERE IdTicket=@IdTicket; IF NULLIF(@SiguienteCorreo,'') IS NULL RAISERROR('El correo de Gerencia General es obligatorio para cambio/devolucion.',16,1); END
      ELSE BEGIN SET @Nuevo='EN_EJECUCION'; END
    END
    ELSE IF @Etapa='GERENCIA_GENERAL'
    BEGIN
      IF @Estado<>'PENDIENTE_GERENCIA_GENERAL' OR @Decision NOT IN('APROBAR','RECHAZAR') RAISERROR('Decision de Gerencia invalida.',16,1);
      IF @Decision='APROBAR' SET @Nuevo='EN_EJECUCION'; ELSE BEGIN SET @Nuevo='PENDIENTE_PLAN'; SET @SiguienteEtapa='JEFE_MARCA'; SELECT @SiguienteCorreo=CorreoJefeMarca FROM dbo.tbl_Ticket WHERE IdTicket=@IdTicket; END
    END
    ELSE RAISERROR('Etapa no valida.',16,1);
    UPDATE dbo.tbl_Ticket_Aprobacion_Token SET FechaUso=SYSUTCDATETIME() WHERE IdToken=@IdToken;
    UPDATE dbo.tbl_Ticket SET Estado=@Nuevo,FechaActualizacion=SYSUTCDATETIME() WHERE IdTicket=@IdTicket;
    INSERT dbo.tbl_Ticket_Historial(IdTicket,EstadoAnterior,EstadoNuevo,Accion,Comentario,UsuarioId,NombreUsuario,RolUsuario)
      VALUES(@IdTicket,@Estado,@Nuevo,@Decision,JSON_VALUE(@Json,'$.comentario'),@Correo,@Correo,@Etapa);
    COMMIT;
    SELECT @IdTicket IdTicket,@Nuevo Estado,@SiguienteEtapa Etapa,@SiguienteCorreo CorreoDestino;
END
GO

/* Consulta de lectura para el linked server/base de CheckIn. No inserta ni modifica datos de origen. */
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_CHECKIN_RESPUESTAS @Formulario INT=14
AS
BEGIN
  SET NOCOUNT ON;
  SELECT RD.respuesta,RD.pregunta,P.descripcion pregunta_descripcion,RD.valor,RD.formulario,
         F.descripcion formulario_descripcion,RD.tipo_pregunta
  FROM [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuesta_Detalle] RD
  LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Preguntas] P ON P.pregunta=RD.pregunta
  LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Formulario] F ON F.formulario=RD.formulario
  WHERE RD.formulario=@Formulario;
END
GO
