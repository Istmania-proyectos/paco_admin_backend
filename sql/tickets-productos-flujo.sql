/*
  Flujo de tickets por producto.
  Ejecutar después de tickets.sql, tickets.automatizacion-checkin.sql y
  tickets-vencimiento-manual-aprobadores.sql.
*/
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Producto', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Producto (
        IdTicketProducto BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TicketProducto PRIMARY KEY,
        IdTicket BIGINT NOT NULL,
        IdDetalleOrigenInicio BIGINT NOT NULL,
        Ocurrencia INT NOT NULL,
        Casa NVARCHAR(200) NULL,
        Marca NVARCHAR(200) NULL,
        CodigoArticulo NVARCHAR(100) NULL,
        Articulo NVARCHAR(500) NULL,
        FechaVencimiento DATE NULL,
        Cantidad DECIMAL(18,3) NULL,
        Lote NVARCHAR(250) NULL,
        Estado VARCHAR(40) NOT NULL CONSTRAINT DF_TicketProducto_Estado DEFAULT ('PENDIENTE_PLAN'),
        FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TicketProducto_Fecha DEFAULT SYSUTCDATETIME(),
        FechaActualizacion DATETIME2(3) NULL,
        CONSTRAINT FK_TicketProducto_Ticket FOREIGN KEY(IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket) ON DELETE CASCADE,
        CONSTRAINT UQ_TicketProducto_Origen UNIQUE(IdTicket, IdDetalleOrigenInicio),
        CONSTRAINT CK_TicketProducto_Estado CHECK(Estado IN(
          'PENDIENTE_PLAN','PENDIENTE_MERCADEO','PENDIENTE_GERENCIA_GENERAL',
          'PLAN_APROBADO','PENDIENTE_CIERRE','CERRADO','REABIERTO_URGENTE',
          'RECHAZADO_POLITICA','CANCELADO'
        ))
    );
    CREATE INDEX IX_TicketProducto_TicketEstado ON dbo.tbl_Ticket_Producto(IdTicket,Estado);
END
GO

IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.tbl_Ticket_Producto') AND name='CK_TicketProducto_Estado')
  ALTER TABLE dbo.tbl_Ticket_Producto DROP CONSTRAINT CK_TicketProducto_Estado;
GO
ALTER TABLE dbo.tbl_Ticket_Producto WITH CHECK ADD CONSTRAINT CK_TicketProducto_Estado CHECK(Estado IN(
  'PENDIENTE_PLAN','PENDIENTE_MERCADEO','PENDIENTE_GERENCIA_GENERAL',
  'PLAN_APROBADO','PENDIENTE_CIERRE','CERRADO','REABIERTO_URGENTE',
  'RECHAZADO_POLITICA','CANCELADO'
));
GO

IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_TicketProducto_Ticket' AND delete_referential_action=0)
BEGIN
  ALTER TABLE dbo.tbl_Ticket_Producto DROP CONSTRAINT FK_TicketProducto_Ticket;
  ALTER TABLE dbo.tbl_Ticket_Producto ADD CONSTRAINT FK_TicketProducto_Ticket
    FOREIGN KEY(IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket) ON DELETE CASCADE;
END
GO

IF COL_LENGTH('dbo.tbl_Ticket_Plan_Accion','IdTicketProducto') IS NULL
    ALTER TABLE dbo.tbl_Ticket_Plan_Accion ADD IdTicketProducto BIGINT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_TicketPlan_Producto')
    ALTER TABLE dbo.tbl_Ticket_Plan_Accion ADD CONSTRAINT FK_TicketPlan_Producto
      FOREIGN KEY(IdTicketProducto) REFERENCES dbo.tbl_Ticket_Producto(IdTicketProducto);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.tbl_Ticket_Plan_Accion') AND name='IX_TicketPlan_Producto')
    CREATE INDEX IX_TicketPlan_Producto ON dbo.tbl_Ticket_Plan_Accion(IdTicketProducto,FechaCreacion DESC);
GO

IF COL_LENGTH('dbo.tbl_Ticket_Historial','IdTicketProducto') IS NULL
    ALTER TABLE dbo.tbl_Ticket_Historial ADD IdTicketProducto BIGINT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_TicketHistorial_Producto')
    ALTER TABLE dbo.tbl_Ticket_Historial ADD CONSTRAINT FK_TicketHistorial_Producto
      FOREIGN KEY(IdTicketProducto) REFERENCES dbo.tbl_Ticket_Producto(IdTicketProducto);
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.tbl_Ticket') AND name='CK_tbl_Ticket_Estado')
    ALTER TABLE dbo.tbl_Ticket DROP CONSTRAINT CK_tbl_Ticket_Estado;
GO
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.tbl_Ticket') AND name='CK_Ticket_Estado')
    ALTER TABLE dbo.tbl_Ticket DROP CONSTRAINT CK_Ticket_Estado;
GO
ALTER TABLE dbo.tbl_Ticket WITH CHECK ADD CONSTRAINT CK_tbl_Ticket_Estado CHECK(Estado IN(
  'PENDIENTE_PLAN','PENDIENTE_MERCADEO','PENDIENTE_GERENCIA_GENERAL',
  'PLAN_APROBADO','EN_EJECUCION','PENDIENTE_CIERRE','EN_PROCESO_PARCIAL',
  'CERRADO','REABIERTO_URGENTE','CANCELADO'
));
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_SINCRONIZAR @IdTicket BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  ;WITH Inicios AS (
    SELECT D.IdTicketDetalle,D.IdTicket,D.IdDetalleOrigen,
      LEAD(D.IdDetalleOrigen) OVER(PARTITION BY D.IdTicket ORDER BY D.IdDetalleOrigen) Siguiente,
      ROW_NUMBER() OVER(PARTITION BY D.IdTicket ORDER BY D.IdDetalleOrigen) Ocurrencia,
      D.Valor Casa
    FROM dbo.tbl_Ticket_Detalle D
    WHERE D.IdTicket=@IdTicket AND D.IdPreguntaOrigen=45 AND D.IdDetalleOrigen IS NOT NULL
  )
  INSERT dbo.tbl_Ticket_Producto(
    IdTicket,IdDetalleOrigenInicio,Ocurrencia,Casa,Marca,CodigoArticulo,Articulo,
    FechaVencimiento,Cantidad,Lote,Estado
  )
  SELECT I.IdTicket,I.IdDetalleOrigen,I.Ocurrencia,
    LTRIM(RTRIM(LEFT(I.Casa,CHARINDEX(',',I.Casa+',')-1))),
    LTRIM(RTRIM(LEFT(M.Valor,CHARINDEX(',',M.Valor+',')-1))),
    LTRIM(RTRIM(LEFT(A.Valor,CHARINDEX(',',A.Valor+',')-1))),
    NULLIF(LTRIM(RTRIM(SUBSTRING(A.Valor,CHARINDEX(',',A.Valor+',')+1,LEN(A.Valor)))), ''),
    COALESCE(TRY_CONVERT(DATE,F.Valor,103),TRY_CONVERT(DATE,F.Valor)),
    TRY_CONVERT(DECIMAL(18,3),REPLACE(C.Valor,',','.')),L.Valor,
    CASE T.Estado
      WHEN 'EN_EJECUCION' THEN 'PLAN_APROBADO'
      WHEN 'EN_PROCESO_PARCIAL' THEN 'PENDIENTE_PLAN'
      ELSE T.Estado
    END
  FROM Inicios I
  JOIN dbo.tbl_Ticket T ON T.IdTicket=I.IdTicket
  OUTER APPLY(SELECT TOP(1) D.Valor FROM dbo.tbl_Ticket_Detalle D WHERE D.IdTicket=I.IdTicket AND D.IdPreguntaOrigen=46 AND D.IdDetalleOrigen>I.IdDetalleOrigen AND (I.Siguiente IS NULL OR D.IdDetalleOrigen<I.Siguiente) ORDER BY D.IdDetalleOrigen) M
  OUTER APPLY(SELECT TOP(1) D.Valor FROM dbo.tbl_Ticket_Detalle D WHERE D.IdTicket=I.IdTicket AND D.IdPreguntaOrigen=47 AND D.IdDetalleOrigen>I.IdDetalleOrigen AND (I.Siguiente IS NULL OR D.IdDetalleOrigen<I.Siguiente) ORDER BY D.IdDetalleOrigen) A
  OUTER APPLY(SELECT TOP(1) D.Valor FROM dbo.tbl_Ticket_Detalle D WHERE D.IdTicket=I.IdTicket AND D.IdPreguntaOrigen=48 AND D.IdDetalleOrigen>I.IdDetalleOrigen AND (I.Siguiente IS NULL OR D.IdDetalleOrigen<I.Siguiente) ORDER BY D.IdDetalleOrigen) F
  OUTER APPLY(SELECT TOP(1) D.Valor FROM dbo.tbl_Ticket_Detalle D WHERE D.IdTicket=I.IdTicket AND D.IdPreguntaOrigen=49 AND D.IdDetalleOrigen>I.IdDetalleOrigen AND (I.Siguiente IS NULL OR D.IdDetalleOrigen<I.Siguiente) ORDER BY D.IdDetalleOrigen) C
  OUTER APPLY(SELECT TOP(1) D.Valor FROM dbo.tbl_Ticket_Detalle D WHERE D.IdTicket=I.IdTicket AND D.IdPreguntaOrigen=1341 AND D.IdDetalleOrigen>I.IdDetalleOrigen AND (I.Siguiente IS NULL OR D.IdDetalleOrigen<I.Siguiente) ORDER BY D.IdDetalleOrigen) L
  WHERE NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=I.IdTicket AND P.IdDetalleOrigenInicio=I.IdDetalleOrigen);
END
GO

/* Ajusta únicamente productos recién migrados que todavía no tienen actividad
   propia. De esta manera los tickets históricos conservan su avance. */
UPDATE P SET Estado=CASE T.Estado
    WHEN 'EN_EJECUCION' THEN 'PLAN_APROBADO'
    WHEN 'EN_PROCESO_PARCIAL' THEN 'PENDIENTE_PLAN'
    ELSE T.Estado
  END,
  FechaActualizacion=SYSUTCDATETIME()
FROM dbo.tbl_Ticket_Producto P
JOIN dbo.tbl_Ticket T ON T.IdTicket=P.IdTicket
WHERE P.Estado='PENDIENTE_PLAN'
  AND T.Estado<>'PENDIENTE_PLAN'
  AND T.Estado IN(
    'PENDIENTE_MERCADEO','PENDIENTE_GERENCIA_GENERAL','PLAN_APROBADO',
    'EN_EJECUCION','PENDIENTE_CIERRE','CERRADO','REABIERTO_URGENTE','CANCELADO'
  )
  AND NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Plan_Accion A WHERE A.IdTicketProducto=P.IdTicketProducto)
  AND NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial H WHERE H.IdTicketProducto=P.IdTicketProducto);
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_RECALCULAR @IdTicket BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Total INT,@Distintos INT,@Unico VARCHAR(40),@Nuevo VARCHAR(40);
  SELECT @Total=COUNT(*),@Distintos=COUNT(DISTINCT Estado),@Unico=MAX(Estado)
  FROM dbo.tbl_Ticket_Producto WHERE IdTicket=@IdTicket;
  IF @Total=0 RETURN;
  SET @Nuevo=CASE
    WHEN NOT EXISTS(
      SELECT 1 FROM dbo.tbl_Ticket_Producto
      WHERE IdTicket=@IdTicket AND Estado NOT IN('CERRADO','RECHAZADO_POLITICA','CANCELADO')
    ) THEN CASE
      WHEN EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto WHERE IdTicket=@IdTicket AND Estado='CERRADO')
        THEN 'CERRADO'
      ELSE 'CANCELADO'
    END
    WHEN @Distintos=1 THEN @Unico
    ELSE 'EN_PROCESO_PARCIAL'
  END;
  UPDATE dbo.tbl_Ticket SET Estado=@Nuevo,
    FechaActualizacion=SYSUTCDATETIME(),
    FechaCierre=CASE WHEN @Nuevo='CERRADO' THEN SYSUTCDATETIME() ELSE NULL END
  WHERE IdTicket=@IdTicket;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_GET @IdTicket BIGINT,@Etapa VARCHAR(30)=NULL
AS
BEGIN
  SET NOCOUNT ON;
  EXEC dbo.PACO_TICKET_PRODUCTOS_SINCRONIZAR @IdTicket;
  SELECT P.*,A.IdPlanAccion,A.TipoAccion,A.Descripcion PlanAccion,
    A.FechaCompromiso,A.Responsable,A.Estado PlanEstado,
    CAST(CASE WHEN P.FechaVencimiento IS NOT NULL
      AND P.FechaVencimiento<DATEADD(MONTH,3,CONVERT(DATE,COALESCE(T.FechaRespuestaOrigen,T.FechaCreacion)))
      THEN 1 ELSE 0 END AS BIT) EsRechazablePolitica,
    DATEADD(MONTH,3,CONVERT(DATE,COALESCE(T.FechaRespuestaOrigen,T.FechaCreacion))) FechaMinimaPolitica,
    CAST(CASE
      WHEN LOWER(LTRIM(RTRIM(U.UserName)))='freyes01' AND UPPER(LTRIM(RTRIM(P.Casa)))='ILG' THEN 1
      WHEN LOWER(LTRIM(RTRIM(U.UserName)))='mmontalvan01' AND UPPER(LTRIM(RTRIM(P.Casa)))='GLOBALIZA' THEN 1
      ELSE 0 END AS BIT) OmiteMercadeo
  FROM dbo.tbl_Ticket_Producto P
  JOIN dbo.tbl_Ticket T ON T.IdTicket=P.IdTicket
  LEFT JOIN dbo.AspNetUsers U ON U.Id=T.JefeMarcaUsuarioId
  OUTER APPLY(SELECT TOP(1) X.* FROM dbo.tbl_Ticket_Plan_Accion X
    WHERE X.IdTicketProducto=P.IdTicketProducto ORDER BY X.IdPlanAccion DESC) A
  WHERE P.IdTicket=@IdTicket AND (
    NULLIF(@Etapa,'') IS NULL
    OR (@Etapa='JEFE_MARCA' AND P.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE'))
    OR (@Etapa='MERCADEO' AND P.Estado='PENDIENTE_MERCADEO')
    OR (@Etapa='GERENCIA_GENERAL' AND P.Estado='PENDIENTE_GERENCIA_GENERAL')
    OR (@Etapa='EJECUCION' AND P.Estado='PLAN_APROBADO')
    OR (@Etapa='VENDEDOR' AND P.Estado='PENDIENTE_CIERRE')
  ) ORDER BY P.Ocurrencia;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_DESTINOS @IdTicket BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  EXEC dbo.PACO_TICKET_PRODUCTOS_SINCRONIZAR @IdTicket;
  SELECT DISTINCT T.IdTicket,T.NumeroTicket,T.Titulo,T.NombreCliente,T.Estado,
    T.CodigoVendedor,T.NombreVendedor,D.Etapa,D.CorreoDestino
  FROM dbo.tbl_Ticket T
  LEFT JOIN dbo.AspNetUsers U ON U.Id=T.ResponsableActual
  CROSS APPLY(VALUES
    ('JEFE_MARCA',T.CorreoJefeMarca),
    ('MERCADEO',COALESCE(NULLIF(T.CorreoGerenteMercadeo,''),NULLIF(T.CorreoMercadeo,''))),
    ('GERENCIA_GENERAL',T.CorreoGerenciaGeneral),
    ('EJECUCION',COALESCE(NULLIF(U.Email,''),T.CorreoJefeMarca)),
    ('VENDEDOR',T.CorreoVendedor)
  ) D(Etapa,CorreoDestino)
  WHERE T.IdTicket=@IdTicket AND NULLIF(D.CorreoDestino,'') IS NOT NULL AND EXISTS(
    SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=T.IdTicket AND (
      (D.Etapa='JEFE_MARCA' AND P.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE'))
      OR (D.Etapa='MERCADEO' AND P.Estado='PENDIENTE_MERCADEO')
      OR (D.Etapa='GERENCIA_GENERAL' AND P.Estado='PENDIENTE_GERENCIA_GENERAL')
      OR (D.Etapa='EJECUCION' AND P.Estado='PLAN_APROBADO')
      OR (D.Etapa='VENDEDOR' AND P.Estado='PENDIENTE_CIERRE')
    )
  );
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_RESPONDER_APROBACION
  @HashHex VARCHAR(64),@Json NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRAN;
  DECLARE @Token BIGINT,@Ticket BIGINT,@Etapa VARCHAR(30),@Correo NVARCHAR(256),@Uso DATETIME2(3),@Expira DATETIME2(3),
    @JefeUsuario NVARCHAR(256);
  SELECT @Token=X.IdToken,@Ticket=X.IdTicket,@Etapa=X.Etapa,@Correo=X.CorreoDestino,
    @Uso=X.FechaUso,@Expira=X.FechaExpiracion
  FROM dbo.tbl_Ticket_Aprobacion_Token X WITH(UPDLOCK,HOLDLOCK)
  WHERE X.TokenHash=CONVERT(VARBINARY(32),@HashHex,2);
  IF @Token IS NULL OR @Uso IS NOT NULL OR @Expira<=SYSUTCDATETIME()
    THROW 51000,'El enlace no es valido.',1;
  SELECT @JefeUsuario=LOWER(LTRIM(RTRIM(U.UserName)))
  FROM dbo.tbl_Ticket T
  LEFT JOIN dbo.AspNetUsers U ON U.Id=T.JefeMarcaUsuarioId
  WHERE T.IdTicket=@Ticket;

  DECLARE @Items TABLE(
    IdProducto BIGINT,Decision VARCHAR(30),Tipo VARCHAR(50),Descripcion NVARCHAR(MAX),
    Fecha DATE,Responsable NVARCHAR(450),Comentario NVARCHAR(2000)
  );
  INSERT @Items SELECT IdProducto,Decision,Tipo,Descripcion,Fecha,Responsable,Comentario
  FROM OPENJSON(@Json,'$.productos') WITH(
    IdProducto BIGINT '$.idTicketProducto',Decision VARCHAR(30) '$.decision',
    Tipo VARCHAR(50) '$.tipoAccion',Descripcion NVARCHAR(MAX) '$.descripcionPlan',
    Fecha DATE '$.fechaCompromiso',Responsable NVARCHAR(450) '$.responsable',
    Comentario NVARCHAR(2000) '$.comentario'
  );
  IF NOT EXISTS(SELECT 1 FROM @Items) THROW 51000,'Debe responder al menos un producto.',1;
  IF EXISTS(
    SELECT 1 FROM @Items I
    JOIN dbo.tbl_Ticket_Producto P ON P.IdTicketProducto=I.IdProducto AND P.IdTicket=@Ticket
    JOIN dbo.tbl_Ticket T ON T.IdTicket=P.IdTicket
    WHERE I.Decision='RECHAZAR_CERRAR_POLITICA'
      AND (P.FechaVencimiento IS NULL
        OR P.FechaVencimiento>=DATEADD(MONTH,3,CONVERT(DATE,COALESCE(T.FechaRespuestaOrigen,T.FechaCreacion))))
  ) THROW 51000,'El producto no cumple la condicion de vencimiento menor a tres meses.',1;
  IF EXISTS(
    SELECT 1 FROM dbo.tbl_Ticket_Producto P
    WHERE P.IdTicket=@Ticket
      AND (
        (@Etapa='JEFE_MARCA' AND P.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE'))
        OR (@Etapa='MERCADEO' AND P.Estado='PENDIENTE_MERCADEO')
        OR (@Etapa='GERENCIA_GENERAL' AND P.Estado='PENDIENTE_GERENCIA_GENERAL')
        OR (@Etapa='EJECUCION' AND P.Estado='PLAN_APROBADO')
      )
      AND NOT EXISTS(SELECT 1 FROM @Items I WHERE I.IdProducto=P.IdTicketProducto)
  ) THROW 51000,'Debe responder todos los productos pendientes de esta etapa.',1;

  IF @Etapa='JEFE_MARCA'
  BEGIN
    IF EXISTS(SELECT 1 FROM @Items WHERE Decision NOT IN('PROPONER_PLAN','RECHAZAR_CERRAR_POLITICA'))
      THROW 51000,'Decision no valida para el Jefe de Marca.',1;
    IF EXISTS(SELECT 1 FROM @Items WHERE Decision='PROPONER_PLAN' AND (NULLIF(Tipo,'') IS NULL OR NULLIF(Descripcion,'') IS NULL))
      THROW 51000,'Todos los productos requieren un plan valido.',1;
    INSERT dbo.tbl_Ticket_Plan_Accion(IdTicket,IdTicketProducto,TipoAccion,Descripcion,FechaCompromiso,Responsable,Estado,CreadoPor)
    SELECT @Ticket,I.IdProducto,I.Tipo,I.Descripcion,I.Fecha,I.Responsable,
      CASE WHEN (
        (@JefeUsuario='freyes01' AND UPPER(LTRIM(RTRIM(P.Casa)))='ILG')
        OR (@JefeUsuario='mmontalvan01' AND UPPER(LTRIM(RTRIM(P.Casa)))='GLOBALIZA')
      ) AND I.Tipo NOT IN('CAMBIO','DEVOLUCION','NOTA_CREDITO') THEN 'APROBADO' ELSE 'PROPUESTO' END,@Correo
    FROM @Items I JOIN dbo.tbl_Ticket_Producto P ON P.IdTicketProducto=I.IdProducto AND P.IdTicket=@Ticket
    WHERE P.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE') AND I.Decision='PROPONER_PLAN';
    UPDATE P SET Estado=CASE
      WHEN I.Decision='RECHAZAR_CERRAR_POLITICA' THEN 'RECHAZADO_POLITICA'
      WHEN (
        (@JefeUsuario='freyes01' AND UPPER(LTRIM(RTRIM(P.Casa)))='ILG')
        OR (@JefeUsuario='mmontalvan01' AND UPPER(LTRIM(RTRIM(P.Casa)))='GLOBALIZA')
      ) THEN CASE WHEN I.Tipo IN('CAMBIO','DEVOLUCION','NOTA_CREDITO')
        THEN 'PENDIENTE_GERENCIA_GENERAL' ELSE 'PLAN_APROBADO' END
      ELSE 'PENDIENTE_MERCADEO' END,FechaActualizacion=SYSUTCDATETIME()
    FROM dbo.tbl_Ticket_Producto P JOIN @Items I ON I.IdProducto=P.IdTicketProducto
    WHERE P.IdTicket=@Ticket AND P.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE');
  END
  ELSE IF @Etapa='MERCADEO'
  BEGIN
    IF EXISTS(SELECT 1 FROM @Items WHERE Decision NOT IN('APROBAR','RECHAZAR','RECHAZAR_CERRAR_POLITICA'))
      THROW 51000,'Decision no valida para Mercadeo.',1;
    UPDATE P SET Estado=CASE WHEN I.Decision='RECHAZAR_CERRAR_POLITICA' THEN 'RECHAZADO_POLITICA'
      WHEN I.Decision='RECHAZAR' THEN 'PENDIENTE_PLAN'
      WHEN A.TipoAccion IN('CAMBIO','DEVOLUCION','NOTA_CREDITO') THEN 'PENDIENTE_GERENCIA_GENERAL'
      ELSE 'PLAN_APROBADO' END,FechaActualizacion=SYSUTCDATETIME()
    FROM dbo.tbl_Ticket_Producto P JOIN @Items I ON I.IdProducto=P.IdTicketProducto
    OUTER APPLY(SELECT TOP(1) X.TipoAccion FROM dbo.tbl_Ticket_Plan_Accion X WHERE X.IdTicketProducto=P.IdTicketProducto ORDER BY X.IdPlanAccion DESC) A
    WHERE P.IdTicket=@Ticket AND P.Estado='PENDIENTE_MERCADEO' AND I.Decision IN('APROBAR','RECHAZAR','RECHAZAR_CERRAR_POLITICA');
    UPDATE A SET Estado=CASE WHEN I.Decision IN('RECHAZAR','RECHAZAR_CERRAR_POLITICA') THEN 'RECHAZADO'
      WHEN I.Decision='APROBAR' THEN CASE WHEN A.TipoAccion IN('CAMBIO','DEVOLUCION','NOTA_CREDITO') THEN 'PROPUESTO' ELSE 'APROBADO' END END,
      FechaActualizacion=SYSUTCDATETIME()
    FROM dbo.tbl_Ticket_Plan_Accion A JOIN @Items I ON I.IdProducto=A.IdTicketProducto
    WHERE A.IdPlanAccion=(SELECT MAX(X.IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion X WHERE X.IdTicketProducto=A.IdTicketProducto);
  END
  ELSE IF @Etapa='GERENCIA_GENERAL'
  BEGIN
    IF EXISTS(SELECT 1 FROM @Items WHERE Decision NOT IN('APROBAR','RECHAZAR','RECHAZAR_CERRAR_POLITICA'))
      THROW 51000,'Decision no valida para Gerencia General.',1;
    UPDATE P SET Estado=CASE I.Decision WHEN 'APROBAR' THEN 'PLAN_APROBADO'
      WHEN 'RECHAZAR' THEN 'PENDIENTE_PLAN' ELSE 'RECHAZADO_POLITICA' END,FechaActualizacion=SYSUTCDATETIME()
    FROM dbo.tbl_Ticket_Producto P JOIN @Items I ON I.IdProducto=P.IdTicketProducto
    WHERE P.IdTicket=@Ticket AND P.Estado='PENDIENTE_GERENCIA_GENERAL' AND I.Decision IN('APROBAR','RECHAZAR','RECHAZAR_CERRAR_POLITICA');
    UPDATE A SET Estado=CASE I.Decision WHEN 'APROBAR' THEN 'APROBADO' ELSE 'RECHAZADO' END,
      FechaActualizacion=SYSUTCDATETIME()
    FROM dbo.tbl_Ticket_Plan_Accion A JOIN @Items I ON I.IdProducto=A.IdTicketProducto
    WHERE A.IdPlanAccion=(SELECT MAX(X.IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion X WHERE X.IdTicketProducto=A.IdTicketProducto);
  END
  ELSE IF @Etapa='EJECUCION'
  BEGIN
    UPDATE P SET Estado='PENDIENTE_CIERRE',FechaActualizacion=SYSUTCDATETIME()
    FROM dbo.tbl_Ticket_Producto P JOIN @Items I ON I.IdProducto=P.IdTicketProducto
    WHERE P.IdTicket=@Ticket AND P.Estado='PLAN_APROBADO' AND I.Decision='INICIAR_EJECUCION';
    UPDATE A SET Estado='EN_EJECUCION',FechaActualizacion=SYSUTCDATETIME()
    FROM dbo.tbl_Ticket_Plan_Accion A JOIN @Items I ON I.IdProducto=A.IdTicketProducto
    WHERE A.IdPlanAccion=(SELECT MAX(X.IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion X WHERE X.IdTicketProducto=A.IdTicketProducto);
  END
  ELSE THROW 51000,'Etapa no valida.',1;

  INSERT dbo.tbl_Ticket_Historial(IdTicket,IdTicketProducto,EstadoNuevo,Accion,Comentario,UsuarioId,NombreUsuario,RolUsuario)
  SELECT @Ticket,I.IdProducto,P.Estado,
    CASE WHEN @Etapa='JEFE_MARCA' AND I.Decision='PROPONER_PLAN'
      AND P.Estado IN('PENDIENTE_CIERRE','PENDIENTE_GERENCIA_GENERAL')
      THEN 'PROPONER_PLAN_SIN_MERCADEO' ELSE I.Decision END,
    CASE WHEN I.Decision='RECHAZAR_CERRAR_POLITICA' THEN COALESCE(NULLIF(I.Comentario,''),
      'Producto rechazado y cerrado por reporte con menos de tres meses de anticipacion.')
      ELSE I.Comentario END,@Correo,@Correo,@Etapa
  FROM @Items I JOIN dbo.tbl_Ticket_Producto P ON P.IdTicketProducto=I.IdProducto;
  UPDATE dbo.tbl_Ticket_Aprobacion_Token SET FechaUso=SYSUTCDATETIME() WHERE IdToken=@Token;
  EXEC dbo.PACO_TICKET_PRODUCTOS_RECALCULAR @Ticket;
  COMMIT;
  SELECT IdTicket,NumeroTicket,Estado,@Etapa EtapaRespuesta
  FROM dbo.tbl_Ticket WHERE IdTicket=@Ticket;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_EMITIR_TOKEN_VENDEDOR
 @IdTicket BIGINT,@HashHex VARCHAR(64),@Expira DATETIME2(3),@Correo NVARCHAR(256),@Codigo VARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket WHERE IdTicket=@IdTicket AND Activo=1)
    THROW 51000,'Ticket inexistente.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto WHERE IdTicket=@IdTicket AND Estado='PENDIENTE_CIERRE')
     AND NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket WHERE IdTicket=@IdTicket AND Estado='PENDIENTE_CIERRE')
    THROW 51000,'No hay productos pendientes de cierre.',1;
  INSERT dbo.tbl_Ticket_Token_Vendedor(IdTicket,TokenHash,CodigoVendedor,CorreoVendedor,FechaExpiracion)
  VALUES(@IdTicket,CONVERT(VARBINARY(32),@HashHex,2),NULLIF(@Codigo,''),@Correo,@Expira);
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_GET_VENDEDOR @HashHex VARCHAR(64)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT CASE WHEN V.FechaUso IS NOT NULL THEN 'USADO' WHEN V.FechaExpiracion<=SYSUTCDATETIME() THEN 'VENCIDO'
    WHEN T.Estado<>'PENDIENTE_CIERRE' AND NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=T.IdTicket AND P.Estado='PENDIENTE_CIERRE') THEN 'PROCESADO'
    ELSE 'VALIDO' END TokenEstado,T.IdTicket,T.NumeroTicket,T.CodigoCliente,T.NombreCliente,T.Titulo,T.Descripcion,T.Estado,T.FechaCreacion
  FROM dbo.tbl_Ticket_Token_Vendedor V JOIN dbo.tbl_Ticket T ON T.IdTicket=V.IdTicket
  WHERE V.TokenHash=CONVERT(VARBINARY(32),@HashHex,2);
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_RESPONDER_VENDEDOR @HashHex VARCHAR(64),@Json NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRAN;
  DECLARE @Token BIGINT,@Ticket BIGINT,@Uso DATETIME2(3),@Expira DATETIME2(3),@Correo NVARCHAR(256);
  SELECT @Token=V.IdToken,@Ticket=V.IdTicket,@Uso=V.FechaUso,@Expira=V.FechaExpiracion,@Correo=V.CorreoVendedor
  FROM dbo.tbl_Ticket_Token_Vendedor V WITH(UPDLOCK,HOLDLOCK)
  WHERE V.TokenHash=CONVERT(VARBINARY(32),@HashHex,2);
  IF @Token IS NULL OR @Uso IS NOT NULL OR @Expira<=SYSUTCDATETIME() THROW 51000,'Enlace invalido.',1;
  DECLARE @Items TABLE(IdProducto BIGINT,Accion VARCHAR(20),Comentario NVARCHAR(2000));
  INSERT @Items SELECT IdProducto,Accion,Comentario FROM OPENJSON(@Json,'$.productos')
    WITH(IdProducto BIGINT '$.idTicketProducto',Accion VARCHAR(20) '$.accion',Comentario NVARCHAR(2000) '$.comentario');
  IF NOT EXISTS(SELECT 1 FROM @Items) THROW 51000,'Debe responder al menos un producto.',1;
  IF EXISTS(
    SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=@Ticket AND P.Estado='PENDIENTE_CIERRE'
      AND NOT EXISTS(SELECT 1 FROM @Items I WHERE I.IdProducto=P.IdTicketProducto)
  ) THROW 51000,'Debe responder todos los productos pendientes de cierre.',1;
  UPDATE P SET Estado=CASE I.Accion WHEN 'CERRAR' THEN 'CERRADO' ELSE 'REABIERTO_URGENTE' END,FechaActualizacion=SYSUTCDATETIME()
  FROM dbo.tbl_Ticket_Producto P JOIN @Items I ON I.IdProducto=P.IdTicketProducto
  WHERE P.IdTicket=@Ticket AND P.Estado='PENDIENTE_CIERRE' AND I.Accion IN('CERRAR','REABRIR');
  INSERT dbo.tbl_Ticket_Historial(IdTicket,IdTicketProducto,EstadoNuevo,Accion,Comentario,UsuarioId,NombreUsuario,RolUsuario)
  SELECT @Ticket,I.IdProducto,P.Estado,I.Accion,I.Comentario,@Correo,@Correo,'VENDEDOR_EXTERNO'
  FROM @Items I JOIN dbo.tbl_Ticket_Producto P ON P.IdTicketProducto=I.IdProducto;
  UPDATE dbo.tbl_Ticket_Token_Vendedor SET FechaUso=SYSUTCDATETIME() WHERE IdTicket=@Ticket AND FechaUso IS NULL;
  EXEC dbo.PACO_TICKET_PRODUCTOS_RECALCULAR @Ticket;
  COMMIT;
  SELECT 'OK' Resultado,T.IdTicket,T.NumeroTicket,T.Estado,T.FechaActualizacion FROM dbo.tbl_Ticket T WHERE T.IdTicket=@Ticket;
END
GO

/* La validez del enlace depende de que al menos un producto siga esperando
   esa etapa. Sin productos se conserva la regla histórica del ticket. */
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_GET_APROBACION @HashHex VARCHAR(64)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT CASE
    WHEN X.FechaUso IS NOT NULL THEN 'USADO'
    WHEN X.FechaExpiracion<=SYSUTCDATETIME() THEN 'VENCIDO'
    WHEN EXISTS(
      SELECT 1 FROM dbo.tbl_Ticket_Producto TP WHERE TP.IdTicket=T.IdTicket AND (
        (X.Etapa='JEFE_MARCA' AND TP.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE'))
        OR (X.Etapa='MERCADEO' AND TP.Estado='PENDIENTE_MERCADEO')
        OR (X.Etapa='GERENCIA_GENERAL' AND TP.Estado='PENDIENTE_GERENCIA_GENERAL')
        OR (X.Etapa='EJECUCION' AND TP.Estado='PLAN_APROBADO')
      )
    ) THEN 'VALIDO'
    WHEN NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto TP WHERE TP.IdTicket=T.IdTicket)
      AND (
        (X.Etapa='JEFE_MARCA' AND T.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE'))
        OR (X.Etapa='MERCADEO' AND T.Estado='PENDIENTE_MERCADEO')
        OR (X.Etapa='GERENCIA_GENERAL' AND T.Estado='PENDIENTE_GERENCIA_GENERAL')
        OR (X.Etapa='EJECUCION' AND T.Estado='PLAN_APROBADO')
      ) THEN 'VALIDO'
    ELSE 'PROCESADO' END TokenEstado,
    X.Etapa,X.CorreoDestino,T.IdTicket,T.NumeroTicket,T.Titulo,T.NombreCliente,T.Estado,
    P.TipoAccion,P.Descripcion PlanDescripcion,P.FechaCompromiso,P.Responsable,P.Estado PlanEstado
  FROM dbo.tbl_Ticket_Aprobacion_Token X
  JOIN dbo.tbl_Ticket T ON T.IdTicket=X.IdTicket
  OUTER APPLY(SELECT TOP(1) A.* FROM dbo.tbl_Ticket_Plan_Accion A
    WHERE A.IdTicket=T.IdTicket ORDER BY A.IdPlanAccion DESC) P
  WHERE X.TokenHash=CONVERT(VARBINARY(32),@HashHex,2);
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_OBTENER_RECORDATORIOS @Horas INT=4
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Desde DATETIME2(3)=DATEADD(HOUR,-IIF(@Horas<1,4,@Horas),SYSUTCDATETIME());
  ;WITH UltimoVendedor AS(
    SELECT IdTicket,MAX(FechaCreacion) FechaEnvio FROM dbo.tbl_Ticket_Token_Vendedor
    WHERE FechaUso IS NULL GROUP BY IdTicket
  ),UltimaAprobacion AS(
    SELECT IdTicket,Etapa,MAX(FechaCreacion) FechaEnvio FROM dbo.tbl_Ticket_Aprobacion_Token
    WHERE FechaUso IS NULL GROUP BY IdTicket,Etapa
  )
  SELECT 'VENDEDOR' Tipo,T.IdTicket,T.NumeroTicket,T.Titulo,T.NombreCliente,T.Estado,
    T.NombreVendedor,V.CorreoVendedor Email,'VENDEDOR_EXTERNO' UserId,NULL Etapa
  FROM UltimoVendedor U JOIN dbo.tbl_Ticket T ON T.IdTicket=U.IdTicket
  JOIN dbo.tbl_Ticket_Token_Vendedor V ON V.IdTicket=U.IdTicket AND V.FechaCreacion=U.FechaEnvio
  WHERE T.Activo=1 AND U.FechaEnvio<=@Desde AND (
    T.Estado='PENDIENTE_CIERRE'
    OR EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=T.IdTicket AND P.Estado='PENDIENTE_CIERRE')
  )
  UNION ALL
  SELECT 'APROBACION',T.IdTicket,T.NumeroTicket,T.Titulo,T.NombreCliente,T.Estado,
    NULL,A.CorreoDestino,NULL,A.Etapa
  FROM UltimaAprobacion U JOIN dbo.tbl_Ticket T ON T.IdTicket=U.IdTicket
  JOIN dbo.tbl_Ticket_Aprobacion_Token A ON A.IdTicket=U.IdTicket AND A.Etapa=U.Etapa AND A.FechaCreacion=U.FechaEnvio
  WHERE T.Activo=1 AND U.FechaEnvio<=@Desde AND (
    (A.Etapa='JEFE_MARCA' AND (T.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE') OR EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=T.IdTicket AND P.Estado IN('PENDIENTE_PLAN','REABIERTO_URGENTE'))))
    OR (A.Etapa='MERCADEO' AND (T.Estado='PENDIENTE_MERCADEO' OR EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=T.IdTicket AND P.Estado='PENDIENTE_MERCADEO')))
    OR (A.Etapa='GERENCIA_GENERAL' AND (T.Estado='PENDIENTE_GERENCIA_GENERAL' OR EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=T.IdTicket AND P.Estado='PENDIENTE_GERENCIA_GENERAL')))
    OR (A.Etapa='EJECUCION' AND (T.Estado='PLAN_APROBADO' OR EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto P WHERE P.IdTicket=T.IdTicket AND P.Estado='PLAN_APROBADO')))
  );
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_PRODUCTOS_EXPORTAR
  @Estado VARCHAR(40)=NULL,@Buscar NVARCHAR(250)=NULL,@FechaDesde DATE=NULL,@FechaHasta DATE=NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT T.IdTicket,T.NumeroTicket,T.CodigoCliente,T.NombreCliente,T.CodigoVendedor,T.NombreVendedor,
    T.Titulo,T.Prioridad,T.Estado,T.FechaCreacion,T.FechaVencimiento,
    P.Ocurrencia ProductoNumero,P.CodigoArticulo,P.Articulo,P.Marca,P.Lote,
    P.FechaVencimiento FechaVencimientoProducto,P.Cantidad,P.Estado EstadoProducto,
    A.TipoAccion Motivo,A.Descripcion PlanAccion,A.FechaCompromiso
  FROM dbo.tbl_Ticket T
  LEFT JOIN dbo.tbl_Ticket_Producto P ON P.IdTicket=T.IdTicket
  OUTER APPLY(SELECT TOP(1) X.* FROM dbo.tbl_Ticket_Plan_Accion X
    WHERE X.IdTicket=T.IdTicket AND (X.IdTicketProducto=P.IdTicketProducto OR (P.IdTicketProducto IS NULL AND X.IdTicketProducto IS NULL))
    ORDER BY X.IdPlanAccion DESC) A
  WHERE T.Activo=1
    AND (NULLIF(@Estado,'') IS NULL OR T.Estado=@Estado OR P.Estado=@Estado)
    AND (@FechaDesde IS NULL OR T.FechaCreacion>=@FechaDesde)
    AND (@FechaHasta IS NULL OR T.FechaCreacion<DATEADD(DAY,1,@FechaHasta))
    AND (NULLIF(@Buscar,'') IS NULL OR T.NumeroTicket LIKE '%'+@Buscar+'%'
      OR T.CodigoCliente LIKE '%'+@Buscar+'%' OR T.NombreCliente LIKE '%'+@Buscar+'%'
      OR T.Titulo LIKE '%'+@Buscar+'%' OR P.CodigoArticulo LIKE '%'+@Buscar+'%' OR P.Articulo LIKE '%'+@Buscar+'%')
  ORDER BY T.FechaCreacion DESC,P.Ocurrencia;
END
GO
