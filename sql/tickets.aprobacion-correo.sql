/* Aprobacion por correo para tickets globales. Ejecutar una vez. */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF COL_LENGTH('dbo.tbl_Ticket','CorreoJefeMarca') IS NULL ALTER TABLE dbo.tbl_Ticket ADD CorreoJefeMarca NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.tbl_Ticket','CorreoMercadeo') IS NULL ALTER TABLE dbo.tbl_Ticket ADD CorreoMercadeo NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.tbl_Ticket','CorreoGerenciaGeneral') IS NULL ALTER TABLE dbo.tbl_Ticket ADD CorreoGerenciaGeneral NVARCHAR(256) NULL;
GO
IF OBJECT_ID('dbo.tbl_Ticket_Token_Aprobacion','U') IS NULL
CREATE TABLE dbo.tbl_Ticket_Token_Aprobacion(
 IdToken BIGINT IDENTITY PRIMARY KEY, IdTicket BIGINT NOT NULL, Etapa VARCHAR(30) NOT NULL, CorreoDestino NVARCHAR(256) NOT NULL,
 TokenHash BINARY(32) NOT NULL UNIQUE, FechaExpiracion DATETIME2(3) NOT NULL, FechaUso DATETIME2(3) NULL, FechaCreacion DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_TicketTokenAprobacion FOREIGN KEY(IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket),
 CONSTRAINT CK_TicketTokenAprobacion_Etapa CHECK(Etapa IN('JEFE_MARCA','MERCADEO','GERENCIA_GENERAL'))
);
GO
IF EXISTS (
 SELECT 1 FROM sys.check_constraints
 WHERE parent_object_id=OBJECT_ID('dbo.tbl_Ticket_Token_Aprobacion')
   AND name='CK_TicketTokenAprobacion_Etapa'
)
 ALTER TABLE dbo.tbl_Ticket_Token_Aprobacion
 DROP CONSTRAINT CK_TicketTokenAprobacion_Etapa;
GO
ALTER TABLE dbo.tbl_Ticket_Token_Aprobacion WITH CHECK
ADD CONSTRAINT CK_TicketTokenAprobacion_Etapa
CHECK(Etapa IN('JEFE_MARCA','MERCADEO','GERENCIA_GENERAL','EJECUCION'));
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_CONFIGURAR_CORREOS @IdTicket BIGINT,@Jefe NVARCHAR(256),@Mercadeo NVARCHAR(256),@Gerencia NVARCHAR(256)
AS BEGIN UPDATE dbo.tbl_Ticket SET CorreoJefeMarca=NULLIF(@Jefe,''),CorreoMercadeo=NULLIF(@Mercadeo,''),CorreoGerenciaGeneral=NULLIF(@Gerencia,''),FechaActualizacion=SYSUTCDATETIME() WHERE IdTicket=@IdTicket; END
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_DESTINO_CORREO @IdTicket BIGINT
AS BEGIN SET NOCOUNT ON; SELECT T.IdTicket,T.NumeroTicket,T.Titulo,T.NombreCliente,T.Estado,
 CASE WHEN T.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE') THEN T.CorreoJefeMarca
      WHEN T.Estado='PENDIENTE_MERCADEO' THEN T.CorreoMercadeo
      WHEN T.Estado='PENDIENTE_GERENCIA_GENERAL' THEN T.CorreoGerenciaGeneral
      WHEN T.Estado IN('PLAN_APROBADO','EN_EJECUCION') THEN COALESCE(NULLIF(RU.Email,''),T.CorreoJefeMarca) END CorreoDestino,
 CASE WHEN T.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE') THEN 'JEFE_MARCA'
      WHEN T.Estado='PENDIENTE_MERCADEO' THEN 'MERCADEO'
      WHEN T.Estado='PENDIENTE_GERENCIA_GENERAL' THEN 'GERENCIA_GENERAL'
      WHEN T.Estado IN('PLAN_APROBADO','EN_EJECUCION') THEN 'EJECUCION' END Etapa
 FROM dbo.tbl_Ticket T LEFT JOIN dbo.AspNetUsers RU ON RU.Id=T.ResponsableActual
 WHERE T.IdTicket=@IdTicket AND T.Activo=1; END
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_EMITIR_TOKEN_APROBACION @IdTicket BIGINT,@Etapa VARCHAR(30),@Correo NVARCHAR(256),@Hash VARCHAR(64),@Expira DATETIME2(3)
AS BEGIN UPDATE dbo.tbl_Ticket_Token_Aprobacion SET FechaUso=SYSUTCDATETIME() WHERE IdTicket=@IdTicket AND Etapa=@Etapa AND FechaUso IS NULL; INSERT dbo.tbl_Ticket_Token_Aprobacion(IdTicket,Etapa,CorreoDestino,TokenHash,FechaExpiracion) VALUES(@IdTicket,@Etapa,@Correo,CONVERT(BINARY(32),@Hash,2),@Expira); END
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_GET_APROBACION @Hash VARCHAR(64)
AS BEGIN SELECT CASE WHEN X.FechaUso IS NOT NULL THEN 'USADO'
 WHEN X.FechaExpiracion<=SYSUTCDATETIME() THEN 'VENCIDO'
 WHEN (X.Etapa='JEFE_MARCA' AND T.Estado NOT IN('PENDIENTE_PLAN','REABIERTO_URGENTE'))
   OR (X.Etapa='MERCADEO' AND T.Estado<>'PENDIENTE_MERCADEO')
   OR (X.Etapa='GERENCIA_GENERAL' AND T.Estado<>'PENDIENTE_GERENCIA_GENERAL')
   OR (X.Etapa='EJECUCION' AND T.Estado NOT IN('PLAN_APROBADO','EN_EJECUCION'))
 THEN 'PROCESADO' ELSE 'VALIDO' END TokenEstado,
 X.Etapa,X.CorreoDestino,T.IdTicket,T.NumeroTicket,T.Titulo,T.NombreCliente,T.Estado,
 P.TipoAccion,P.Descripcion PlanDescripcion,P.FechaCompromiso,
 COALESCE(NULLIF(RU.NombreContacto,''),RU.UserName,P.Responsable) Responsable,
 P.Estado PlanEstado
 FROM dbo.tbl_Ticket_Token_Aprobacion X
 JOIN dbo.tbl_Ticket T ON T.IdTicket=X.IdTicket
 OUTER APPLY(SELECT TOP(1) PA.* FROM dbo.tbl_Ticket_Plan_Accion PA
             WHERE PA.IdTicket=T.IdTicket ORDER BY PA.IdPlanAccion DESC) P
 LEFT JOIN dbo.AspNetUsers RU ON RU.Id=P.Responsable
 WHERE X.TokenHash=CONVERT(BINARY(32),@Hash,2); END
GO
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_RESPONDER_APROBACION @Hash VARCHAR(64),@Json NVARCHAR(MAX)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRAN;
 DECLARE @Token BIGINT,@Ticket BIGINT,@Etapa VARCHAR(30),@Correo NVARCHAR(256),@Estado VARCHAR(30),@Uso DATETIME2(3),@Expira DATETIME2(3);
 SELECT @Token=X.IdToken,@Ticket=X.IdTicket,@Etapa=X.Etapa,@Correo=X.CorreoDestino,@Uso=X.FechaUso,@Expira=X.FechaExpiracion,@Estado=T.Estado
 FROM dbo.tbl_Ticket_Token_Aprobacion X WITH(UPDLOCK,HOLDLOCK) JOIN dbo.tbl_Ticket T WITH(UPDLOCK,HOLDLOCK) ON T.IdTicket=X.IdTicket WHERE X.TokenHash=CONVERT(BINARY(32),@Hash,2);
 IF @Token IS NULL OR @Uso IS NOT NULL OR @Expira<=SYSUTCDATETIME() RAISERROR('Enlace invalido o vencido.',16,1);
 DECLARE @Decision VARCHAR(30)=JSON_VALUE(@Json,'$.decision'),@Nuevo VARCHAR(30),@Tipo VARCHAR(50)=JSON_VALUE(@Json,'$.tipoAccion'),@CorreoSiguiente NVARCHAR(256),@EtapaSiguiente VARCHAR(30);
 IF @Etapa='JEFE_MARCA'
 BEGIN
   IF @Estado NOT IN('PENDIENTE_PLAN','REABIERTO_URGENTE') OR @Decision<>'PROPONER_PLAN' OR NULLIF(JSON_VALUE(@Json,'$.descripcionPlan'),'') IS NULL OR @Tipo IS NULL RAISERROR('Plan de accion invalido.',16,1);
   INSERT dbo.tbl_Ticket_Plan_Accion(IdTicket,TipoAccion,Descripcion,FechaCompromiso,Responsable,Estado,CreadoPor) VALUES(@Ticket,@Tipo,JSON_VALUE(@Json,'$.descripcionPlan'),TRY_CONVERT(DATE,JSON_VALUE(@Json,'$.fechaCompromiso')),JSON_VALUE(@Json,'$.responsable'),'PROPUESTO',@Correo);
   SET @Nuevo='PENDIENTE_MERCADEO'; SELECT @CorreoSiguiente=CorreoMercadeo FROM dbo.tbl_Ticket WHERE IdTicket=@Ticket; SET @EtapaSiguiente='MERCADEO';
 END
 ELSE IF @Etapa='MERCADEO'
 BEGIN
   IF @Estado<>'PENDIENTE_MERCADEO' OR @Decision NOT IN('APROBAR','RECHAZAR') RAISERROR('Decision de Mercadeo invalida.',16,1);
   IF @Decision='RECHAZAR' BEGIN SET @Nuevo='PENDIENTE_PLAN';SELECT @CorreoSiguiente=CorreoJefeMarca FROM dbo.tbl_Ticket WHERE IdTicket=@Ticket;SET @EtapaSiguiente='JEFE_MARCA';END
   ELSE IF EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Plan_Accion WHERE IdPlanAccion=(SELECT MAX(IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion WHERE IdTicket=@Ticket) AND TipoAccion IN('CAMBIO','DEVOLUCION')) BEGIN SET @Nuevo='PENDIENTE_GERENCIA_GENERAL';SELECT @CorreoSiguiente=CorreoGerenciaGeneral FROM dbo.tbl_Ticket WHERE IdTicket=@Ticket;SET @EtapaSiguiente='GERENCIA_GENERAL';IF NULLIF(@CorreoSiguiente,'') IS NULL RAISERROR('Falta correo de Gerencia General.',16,1);END
   ELSE SET @Nuevo='PLAN_APROBADO';
 END
 ELSE IF @Etapa='GERENCIA_GENERAL'
 BEGIN
   IF @Estado<>'PENDIENTE_GERENCIA_GENERAL' OR @Decision NOT IN('APROBAR','RECHAZAR') RAISERROR('Decision de Gerencia invalida.',16,1);
   IF @Decision='APROBAR' SET @Nuevo='PLAN_APROBADO'; ELSE BEGIN SET @Nuevo='PENDIENTE_PLAN';SELECT @CorreoSiguiente=CorreoJefeMarca FROM dbo.tbl_Ticket WHERE IdTicket=@Ticket;SET @EtapaSiguiente='JEFE_MARCA';END
 END
 ELSE IF @Etapa='EJECUCION'
 BEGIN
   IF @Estado='PLAN_APROBADO' AND @Decision='INICIAR_EJECUCION'
   BEGIN
     SET @Nuevo='EN_EJECUCION';
     SET @EtapaSiguiente='EJECUCION';
     SELECT @CorreoSiguiente=COALESCE(NULLIF(U.Email,''),T.CorreoJefeMarca)
     FROM dbo.tbl_Ticket T LEFT JOIN dbo.AspNetUsers U ON U.Id=T.ResponsableActual
     WHERE T.IdTicket=@Ticket;
     UPDATE dbo.tbl_Ticket_Plan_Accion SET Estado='EN_EJECUCION',FechaActualizacion=SYSUTCDATETIME()
     WHERE IdPlanAccion=(SELECT MAX(IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion WHERE IdTicket=@Ticket);
   END
   ELSE IF @Estado='EN_EJECUCION' AND @Decision='SOLICITAR_CIERRE'
   BEGIN
     SET @Nuevo='PENDIENTE_CIERRE';
   END
   ELSE RAISERROR('Accion de ejecucion invalida.',16,1);
 END
 ELSE RAISERROR('Etapa invalida.',16,1);
 UPDATE dbo.tbl_Ticket_Token_Aprobacion SET FechaUso=SYSUTCDATETIME() WHERE IdToken=@Token;
 UPDATE dbo.tbl_Ticket SET Estado=@Nuevo,FechaActualizacion=SYSUTCDATETIME() WHERE IdTicket=@Ticket;
 INSERT dbo.tbl_Ticket_Historial(IdTicket,EstadoAnterior,EstadoNuevo,Accion,Comentario,UsuarioId,NombreUsuario,RolUsuario) VALUES(@Ticket,@Estado,@Nuevo,@Decision,JSON_VALUE(@Json,'$.comentario'),@Correo,@Correo,@Etapa);
 COMMIT; SELECT @Ticket IdTicket,@Nuevo Estado,@CorreoSiguiente CorreoDestino,@EtapaSiguiente Etapa;
END
GO
