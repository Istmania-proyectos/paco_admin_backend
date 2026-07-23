/*
  Modulo de tickets PACO.
  Este script es idempotente y no se ejecuta automaticamente por TypeORM.
*/

IF OBJECT_ID(N'dbo.tbl_Ticket', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket (
        IdTicket BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tbl_Ticket PRIMARY KEY,
        NumeroTicket VARCHAR(30) NOT NULL,
        SistemaOrigen VARCHAR(50) NOT NULL CONSTRAINT DF_Ticket_SistemaOrigen DEFAULT ('MANUAL'),
        IdRespuestaOrigen BIGINT NULL,
        IdFormularioOrigen INT NULL,
        CodigoCliente VARCHAR(50) NOT NULL,
        NombreCliente NVARCHAR(200) NOT NULL,
        CodigoVendedor VARCHAR(50) NULL,
        NombreVendedor NVARCHAR(200) NULL,
        TipoTicket VARCHAR(50) NOT NULL,
        Titulo NVARCHAR(250) NOT NULL,
        Descripcion NVARCHAR(MAX) NULL,
        Prioridad VARCHAR(20) NOT NULL CONSTRAINT DF_Ticket_Prioridad DEFAULT ('NORMAL'),
        Estado VARCHAR(30) NOT NULL CONSTRAINT DF_Ticket_Estado DEFAULT ('PENDIENTE_PLAN'),
        FechaRespuestaOrigen DATETIME2(3) NULL,
        FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_Ticket_FechaCreacion DEFAULT (SYSUTCDATETIME()),
        FechaActualizacion DATETIME2(3) NULL,
        FechaVencimiento DATE NULL,
        FechaCierre DATETIME2(3) NULL,
        CreadoPor NVARCHAR(450) NOT NULL,
        ResponsableActual NVARCHAR(450) NULL,
        Activo BIT NOT NULL CONSTRAINT DF_Ticket_Activo DEFAULT (1),
        CONSTRAINT UQ_tbl_Ticket_NumeroTicket UNIQUE (NumeroTicket),
        CONSTRAINT CK_tbl_Ticket_Prioridad CHECK (Prioridad IN ('BAJA','NORMAL','ALTA','URGENTE')),
        CONSTRAINT CK_tbl_Ticket_Estado CHECK (Estado IN (
            'PENDIENTE_PLAN','PENDIENTE_MERCADEO','PENDIENTE_GERENCIA_GENERAL',
            'PLAN_APROBADO','EN_EJECUCION','PENDIENTE_CIERRE','CERRADO',
            'REABIERTO_URGENTE','CANCELADO'
        ))
    );
END
GO

/* Lectura de formularios CheckIn para importar tickets globales. Cada grupo
   (formulario, respuesta) se convierte en un ticket; sus preguntas en detalle. */
CREATE OR ALTER PROCEDURE dbo.PACO_GET_TICKET_CHECKIN @Formulario INT = 14
AS
BEGIN
    SET NOCOUNT ON;
    SELECT RD.respuesta, RD.pregunta, P.descripcion AS pregunta_descripcion,
           RD.valor, RD.formulario, F.descripcion AS formulario_descripcion,
           RD.tipo_pregunta
    FROM [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuesta_Detalle] RD
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Preguntas] P ON P.pregunta = RD.pregunta
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Formulario] F ON F.formulario = RD.formulario
    WHERE RD.formulario = @Formulario;
END
GO

IF COL_LENGTH('dbo.tbl_Ticket', 'CorreoVendedor') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CorreoVendedor NVARCHAR(256) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.tbl_Ticket') AND name = N'UX_tbl_Ticket_Origen')
    CREATE UNIQUE INDEX UX_tbl_Ticket_Origen
        ON dbo.tbl_Ticket(SistemaOrigen, IdRespuestaOrigen)
        WHERE IdRespuestaOrigen IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.tbl_Ticket') AND name = N'IX_tbl_Ticket_Bandeja')
    CREATE INDEX IX_tbl_Ticket_Bandeja
        ON dbo.tbl_Ticket(Activo, Estado, FechaCreacion DESC)
        INCLUDE (NumeroTicket, CodigoCliente, NombreCliente, Prioridad, ResponsableActual);
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Detalle (
        IdTicketDetalle BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tbl_Ticket_Detalle PRIMARY KEY,
        IdTicket BIGINT NOT NULL,
        IdDetalleOrigen BIGINT NULL,
        IdPreguntaOrigen INT NULL,
        Pregunta NVARCHAR(500) NULL,
        TipoRespuesta VARCHAR(250) NULL,
        Valor NVARCHAR(MAX) NULL,
        FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TicketDetalle_Fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_TicketDetalle_Ticket FOREIGN KEY (IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket)
    );
    CREATE INDEX IX_tbl_Ticket_Detalle_IdTicket ON dbo.tbl_Ticket_Detalle(IdTicket);
END
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Plan_Accion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Plan_Accion (
        IdPlanAccion BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tbl_Ticket_Plan PRIMARY KEY,
        IdTicket BIGINT NOT NULL,
        TipoAccion VARCHAR(50) NOT NULL,
        Descripcion NVARCHAR(MAX) NOT NULL,
        FechaCompromiso DATE NULL,
        Responsable NVARCHAR(450) NULL,
        Estado VARCHAR(30) NOT NULL CONSTRAINT DF_TicketPlan_Estado DEFAULT ('PROPUESTO'),
        CreadoPor NVARCHAR(450) NOT NULL,
        FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TicketPlan_Fecha DEFAULT (SYSUTCDATETIME()),
        FechaActualizacion DATETIME2(3) NULL,
        CONSTRAINT FK_TicketPlan_Ticket FOREIGN KEY (IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket),
        CONSTRAINT CK_TicketPlan_Tipo CHECK (TipoAccion IN ('CAMBIO','DEVOLUCION','DESCUENTO','REUBICACION','PROMOCION','OTRO')),
        CONSTRAINT CK_TicketPlan_Estado CHECK (Estado IN ('PROPUESTO','APROBADO','RECHAZADO','EN_EJECUCION','FINALIZADO'))
    );
    CREATE INDEX IX_tbl_Ticket_Plan_IdTicket ON dbo.tbl_Ticket_Plan_Accion(IdTicket, FechaCreacion DESC);
END
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Historial', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Historial (
        IdHistorial BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tbl_Ticket_Historial PRIMARY KEY,
        IdTicket BIGINT NOT NULL,
        EstadoAnterior VARCHAR(30) NULL,
        EstadoNuevo VARCHAR(30) NOT NULL,
        Accion VARCHAR(50) NOT NULL,
        Comentario NVARCHAR(MAX) NULL,
        UsuarioId NVARCHAR(450) NOT NULL,
        NombreUsuario NVARCHAR(256) NULL,
        RolUsuario NVARCHAR(500) NULL,
        Fecha DATETIME2(3) NOT NULL CONSTRAINT DF_TicketHistorial_Fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_TicketHistorial_Ticket FOREIGN KEY (IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket)
    );
    CREATE INDEX IX_tbl_Ticket_Historial_IdTicket ON dbo.tbl_Ticket_Historial(IdTicket, Fecha DESC);
END
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Notificacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Notificacion (
        IdNotificacion BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tbl_Ticket_Notificacion PRIMARY KEY,
        IdTicket BIGINT NOT NULL,
        UsuarioDestino NVARCHAR(450) NULL,
        CorreoDestino NVARCHAR(256) NOT NULL,
        EstadoTicket VARCHAR(30) NOT NULL,
        EstadoEnvio VARCHAR(20) NOT NULL CONSTRAINT DF_TicketNotificacion_Estado DEFAULT ('PENDIENTE'),
        Error NVARCHAR(2000) NULL,
        FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TicketNotificacion_Fecha DEFAULT (SYSUTCDATETIME()),
        FechaEnvio DATETIME2(3) NULL,
        CONSTRAINT FK_TicketNotificacion_Ticket FOREIGN KEY (IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket),
        CONSTRAINT CK_TicketNotificacion_Estado CHECK (EstadoEnvio IN ('PENDIENTE','ENVIADO','ERROR'))
    );
    CREATE INDEX IX_tbl_Ticket_Notificacion_Ticket
        ON dbo.tbl_Ticket_Notificacion(IdTicket, FechaCreacion DESC);
    CREATE INDEX IX_tbl_Ticket_Notificacion_Pendiente
        ON dbo.tbl_Ticket_Notificacion(EstadoEnvio, FechaCreacion);
END
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Token_Vendedor', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Token_Vendedor (
        IdToken BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tbl_Ticket_Token_Vendedor PRIMARY KEY,
        IdTicket BIGINT NOT NULL,
        TokenHash BINARY(32) NOT NULL,
        CodigoVendedor VARCHAR(50) NULL,
        CorreoVendedor NVARCHAR(256) NOT NULL,
        FechaExpiracion DATETIME2(3) NOT NULL,
        FechaCreacion DATETIME2(3) NOT NULL CONSTRAINT DF_TicketToken_Fecha DEFAULT (SYSUTCDATETIME()),
        FechaUso DATETIME2(3) NULL,
        CONSTRAINT FK_TicketToken_Ticket FOREIGN KEY (IdTicket) REFERENCES dbo.tbl_Ticket(IdTicket),
        CONSTRAINT UQ_TicketToken_Hash UNIQUE (TokenHash)
    );
    CREATE INDEX IX_TicketToken_Ticket ON dbo.tbl_Ticket_Token_Vendedor(IdTicket, FechaCreacion DESC);
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_GET_TICKET
    @Option INT,
    @Param1 VARCHAR(MAX),
    @Param2 NVARCHAR(MAX),
    @Param3 NVARCHAR(MAX),
    @Param4 NVARCHAR(MAX),
    @Param5 NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1: bandeja. Param1=estado, Param2=pagina, Param3=busqueda,
    -- Param4=tamano de pagina, Param5=usuario (reservado para filtros por rol).
    IF @Option = 1
    BEGIN
        DECLARE @Pagina INT = ISNULL(TRY_CONVERT(INT, NULLIF(@Param2, '')), 1);
        DECLARE @Tamano INT = ISNULL(TRY_CONVERT(INT, NULLIF(@Param4, '')), 10);
        SET @Pagina = IIF(@Pagina < 1, 1, @Pagina);
        SET @Tamano = IIF(@Tamano < 1 OR @Tamano > 100, 10, @Tamano);

        SELECT
            T.IdTicket, T.NumeroTicket, T.CodigoCliente, T.NombreCliente,
            T.CodigoVendedor, T.NombreVendedor, T.TipoTicket, T.Titulo,
            T.Prioridad, T.Estado, T.FechaRespuestaOrigen, T.FechaCreacion,
            T.FechaVencimiento, T.ResponsableActual,
            COUNT(*) OVER() AS TotalEncontrados
        FROM dbo.tbl_Ticket T
        WHERE T.Activo = 1
          AND (NULLIF(@Param1, '') IS NULL OR T.Estado = @Param1)
          AND (
              NULLIF(@Param3, '') IS NULL
              OR T.NumeroTicket LIKE '%' + @Param3 + '%'
              OR T.CodigoCliente LIKE '%' + @Param3 + '%'
              OR T.NombreCliente LIKE '%' + @Param3 + '%'
              OR T.Titulo LIKE '%' + @Param3 + '%'
          )
        ORDER BY T.FechaCreacion DESC
        OFFSET (@Pagina - 1) * @Tamano ROWS FETCH NEXT @Tamano ROWS ONLY;
        RETURN;
    END

    -- 2: encabezado del ticket. Param1=IdTicket.
    IF @Option = 2
    BEGIN
        SELECT * FROM dbo.tbl_Ticket WHERE IdTicket = TRY_CONVERT(BIGINT, @Param1);
        RETURN;
    END

    -- 3: respuestas/detalles de origen. Param1=IdTicket.
    IF @Option = 3
    BEGIN
        SELECT * FROM dbo.tbl_Ticket_Detalle
        WHERE IdTicket = TRY_CONVERT(BIGINT, @Param1)
        ORDER BY IdTicketDetalle;
        RETURN;
    END

    -- 4: planes de accion. Param1=IdTicket.
    IF @Option = 4
    BEGIN
        SELECT
            P.IdPlanAccion, P.IdTicket, P.TipoAccion, P.Descripcion,
            P.FechaCompromiso, P.Responsable,
            RU.UserName AS ResponsableNombre,
            P.Estado,
            P.CreadoPor AS DefinidoPor,
            CU.UserName AS DefinidoPorNombre,
            P.FechaCreacion, P.FechaActualizacion
        FROM dbo.tbl_Ticket_Plan_Accion P
        LEFT JOIN dbo.AspNetUsers RU ON RU.Id = P.Responsable
        LEFT JOIN dbo.AspNetUsers CU ON CU.Id = P.CreadoPor
        WHERE P.IdTicket = TRY_CONVERT(BIGINT, @Param1)
        ORDER BY P.FechaCreacion DESC;
        RETURN;
    END

    -- 5: historial. Param1=IdTicket.
    IF @Option = 5
    BEGIN
        SELECT * FROM dbo.tbl_Ticket_Historial
        WHERE IdTicket = TRY_CONVERT(BIGINT, @Param1)
        ORDER BY Fecha DESC;
        RETURN;
    END

    -- 6: destinatarios de la siguiente etapa. Param1=IdTicket.
    IF @Option = 6
    BEGIN
        ;WITH TicketDestino AS (
            SELECT
                T.IdTicket, T.NumeroTicket, T.Titulo, T.NombreCliente, T.Estado,
                T.ResponsableActual,
                CASE
                    WHEN T.Estado IN ('PENDIENTE_PLAN','REABIERTO_URGENTE') THEN 'TICKET_JEFE_MARCA'
                    WHEN T.Estado = 'PENDIENTE_MERCADEO' THEN 'TICKET_MERCADEO'
                    WHEN T.Estado = 'PENDIENTE_GERENCIA_GENERAL' THEN 'TICKET_GERENCIA_GENERAL'
                    WHEN T.Estado IN ('PLAN_APROBADO','EN_EJECUCION') THEN 'TICKET_SUPERVISOR'
                END RolDestino
            FROM dbo.tbl_Ticket T
            WHERE T.IdTicket = TRY_CONVERT(BIGINT, @Param1) AND T.Activo = 1
        )
        SELECT DISTINCT
            T.IdTicket, U.Id UserId, U.Email,
            ISNULL(NULLIF(U.NombreContacto, ''), U.UserName) Nombre,
            R.Name Rol, T.NumeroTicket, T.Titulo, T.NombreCliente, T.Estado,
            CAST(0 AS BIT) EsVendedorExterno
        FROM TicketDestino T
        INNER JOIN dbo.AspNetRoles R ON R.NormalizedName = T.RolDestino
        INNER JOIN dbo.AspNetUserRoles UR ON UR.RoleId = R.Id
        INNER JOIN dbo.AspNetUsers U ON U.Id = UR.UserId
        WHERE T.RolDestino IS NOT NULL
          AND U.EmailConfirmed = 1
          AND NULLIF(U.Email, '') IS NOT NULL
          AND (
              T.Estado NOT IN ('PLAN_APROBADO','EN_EJECUCION')
              OR T.ResponsableActual IS NULL
              OR NOT EXISTS (
                  SELECT 1 FROM dbo.AspNetUsers AU
                  WHERE AU.Id = T.ResponsableActual
                    AND AU.EmailConfirmed = 1
                    AND NULLIF(AU.Email, '') IS NOT NULL
              )
          )
        UNION
        SELECT
            T.IdTicket, U.Id UserId, U.Email,
            ISNULL(NULLIF(U.NombreContacto, ''), U.UserName) Nombre,
            'RESPONSABLE' Rol, T.NumeroTicket, T.Titulo, T.NombreCliente, T.Estado,
            CAST(0 AS BIT) EsVendedorExterno
        FROM TicketDestino T
        INNER JOIN dbo.AspNetUsers U ON U.Id = T.ResponsableActual
        WHERE T.Estado IN ('PLAN_APROBADO','EN_EJECUCION')
          AND U.EmailConfirmed = 1
          AND NULLIF(U.Email, '') IS NOT NULL
        UNION
        SELECT
            T.IdTicket,
            ISNULL(NULLIF(T.CodigoVendedor, ''), CONCAT('VENDEDOR-TICKET-', T.IdTicket)) UserId,
            T.CorreoVendedor Email,
            ISNULL(NULLIF(T.NombreVendedor, ''), 'Vendedor') Nombre,
            'VENDEDOR_EXTERNO' Rol,
            T.NumeroTicket, T.Titulo, T.NombreCliente, T.Estado,
            CAST(1 AS BIT) EsVendedorExterno
        FROM dbo.tbl_Ticket T
        WHERE T.IdTicket = TRY_CONVERT(BIGINT, @Param1)
          AND T.Activo = 1
          AND T.Estado = 'PENDIENTE_CIERRE'
          AND NULLIF(T.CorreoVendedor, '') IS NOT NULL;
        RETURN;
    END

    -- 7: consulta publica por hash SHA-256 hexadecimal. Param1=hash.
    IF @Option = 7
    BEGIN
        SELECT
            CASE
                WHEN V.FechaUso IS NOT NULL THEN 'USADO'
                WHEN V.FechaExpiracion <= SYSUTCDATETIME() THEN 'VENCIDO'
                WHEN T.Estado <> 'PENDIENTE_CIERRE' THEN 'PROCESADO'
                ELSE 'VALIDO'
            END TokenEstado,
            T.NumeroTicket, T.CodigoCliente, T.NombreCliente, T.Titulo,
            T.Descripcion, T.Estado, T.FechaCreacion
        FROM dbo.tbl_Ticket_Token_Vendedor V
        INNER JOIN dbo.tbl_Ticket T ON T.IdTicket = V.IdTicket
        WHERE V.TokenHash = TRY_CONVERT(VARBINARY(32), @Param1, 2);
        RETURN;
    END

    RAISERROR('Opcion no valida para PACO_GET_TICKET.', 16, 1);
    RETURN;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_INSERT_TICKET
    @Option INT,
    @Param1 VARCHAR(MAX),
    @Param2 NVARCHAR(MAX),
    @Param3 NVARCHAR(MAX),
    @Param4 NVARCHAR(MAX),
    @Param5 NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    -- Evita evaluaciones anticipadas de JSON_VALUE sobre Param2 durante la
    -- compilacion del plan cuando Option=1 y Param2 contiene un usuario.
    DECLARE @ActionJson NVARCHAR(MAX) = CASE WHEN ISJSON(@Param2) = 1 THEN @Param2 ELSE N'{}' END;
    DECLARE @RolesJson NVARCHAR(MAX) = CASE WHEN ISJSON(@Param5) = 1 THEN @Param5 ELSE N'[]' END;
    DECLARE @CreateRolesJson NVARCHAR(MAX) = CASE WHEN ISJSON(@Param4) = 1 THEN @Param4 ELSE N'[]' END;

    -- 1: crear/importar. Param1=JSON, Param2=UsuarioId, Param3=Nombre, Param4=Rol.
    IF @Option = 1
    BEGIN
        IF @Param4 <> 'TICKET_INTEGRACION' AND NOT EXISTS (
            SELECT 1 FROM OPENJSON(@CreateRolesJson) WHERE [value] = 'TICKET_INTEGRACION'
        )
        BEGIN
            RAISERROR('Solo el proceso de integracion puede crear tickets.', 16, 1);
            RETURN;
        END

        IF ISJSON(@Param1) <> 1
        BEGIN
            RAISERROR('El cuerpo del ticket no es JSON valido.', 16, 1);
            RETURN;
        END

        IF NULLIF(JSON_VALUE(@Param1, '$.correoVendedor'), '') IS NULL
        BEGIN
            RAISERROR('El correo del vendedor es requerido para crear el ticket.', 16, 1);
            RETURN;
        END

        DECLARE @IdTicket BIGINT;
        DECLARE @SistemaOrigen VARCHAR(50) = ISNULL(NULLIF(JSON_VALUE(@Param1, '$.sistemaOrigen'), ''), 'MANUAL');
        DECLARE @IdRespuesta BIGINT = TRY_CONVERT(BIGINT, JSON_VALUE(@Param1, '$.idRespuestaOrigen'));

        IF @IdRespuesta IS NOT NULL AND EXISTS (
            SELECT 1 FROM dbo.tbl_Ticket WHERE SistemaOrigen = @SistemaOrigen AND IdRespuestaOrigen = @IdRespuesta
        )
        BEGIN
            RAISERROR('La respuesta de origen ya fue importada.', 16, 1);
            RETURN;
        END

        BEGIN TRAN;

        INSERT dbo.tbl_Ticket (
            NumeroTicket, SistemaOrigen, IdRespuestaOrigen, IdFormularioOrigen,
            CodigoCliente, NombreCliente, CodigoVendedor, NombreVendedor, CorreoVendedor,
            TipoTicket, Titulo, Descripcion, Prioridad, FechaRespuestaOrigen,
            FechaVencimiento, CreadoPor, ResponsableActual
        )
        VALUES (
            CONCAT('TMP-', LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 26)),
            @SistemaOrigen,
            @IdRespuesta,
            TRY_CONVERT(INT, JSON_VALUE(@Param1, '$.idFormularioOrigen')),
            JSON_VALUE(@Param1, '$.codigoCliente'),
            JSON_VALUE(@Param1, '$.nombreCliente'),
            JSON_VALUE(@Param1, '$.codigoVendedor'),
            JSON_VALUE(@Param1, '$.nombreVendedor'),
            JSON_VALUE(@Param1, '$.correoVendedor'),
            JSON_VALUE(@Param1, '$.tipoTicket'),
            JSON_VALUE(@Param1, '$.titulo'),
            JSON_VALUE(@Param1, '$.descripcion'),
            ISNULL(NULLIF(JSON_VALUE(@Param1, '$.prioridad'), ''), 'NORMAL'),
            TRY_CONVERT(DATETIME2(3), JSON_VALUE(@Param1, '$.fechaRespuestaOrigen')),
            TRY_CONVERT(DATE, JSON_VALUE(@Param1, '$.fechaVencimiento')),
            @Param2,
            @Param2
        );

        SET @IdTicket = SCOPE_IDENTITY();
        UPDATE dbo.tbl_Ticket
        SET NumeroTicket = CONCAT('TKT-', RIGHT(REPLICATE('0', 10) + CONVERT(VARCHAR(20), @IdTicket), 10))
        WHERE IdTicket = @IdTicket;

        INSERT dbo.tbl_Ticket_Detalle (
            IdTicket, IdDetalleOrigen, IdPreguntaOrigen, Pregunta, TipoRespuesta, Valor
        )
        SELECT @IdTicket, D.IdDetalleOrigen, D.IdPreguntaOrigen, D.Pregunta, D.TipoRespuesta, D.Valor
        FROM OPENJSON(@Param1, '$.detalles') WITH (
            IdDetalleOrigen BIGINT '$.idDetalleOrigen',
            IdPreguntaOrigen INT '$.idPreguntaOrigen',
            Pregunta NVARCHAR(500) '$.pregunta',
            TipoRespuesta VARCHAR(250) '$.tipoRespuesta',
            Valor NVARCHAR(MAX) '$.valor'
        ) D;

        IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Ticket_Detalle WHERE IdTicket = @IdTicket)
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('El ticket debe contener al menos un detalle.', 16, 1);
            RETURN;
        END

        INSERT dbo.tbl_Ticket_Historial (
            IdTicket, EstadoAnterior, EstadoNuevo, Accion, Comentario,
            UsuarioId, NombreUsuario, RolUsuario
        ) VALUES (
            @IdTicket, NULL, 'PENDIENTE_PLAN', 'CREAR',
            N'Ticket creado', @Param2, NULLIF(@Param3, ''), NULLIF(@Param4, '')
        );

        COMMIT;
        SELECT IdTicket, NumeroTicket, Estado FROM dbo.tbl_Ticket WHERE IdTicket = @IdTicket;
        RETURN;
    END

    -- 2: transicion. Param1=IdTicket, Param2=JSON, Param3=UsuarioId,
    -- Param4=Nombre, Param5=Rol.
    IF @Option = 2
    BEGIN
        IF ISJSON(@Param2) <> 1
        BEGIN
            RAISERROR('La accion no es JSON valido.', 16, 1);
            RETURN;
        END

        DECLARE @Ticket BIGINT = TRY_CONVERT(BIGINT, @Param1);
        DECLARE @Accion VARCHAR(50) = JSON_VALUE(@ActionJson, '$.accion');
        DECLARE @Anterior VARCHAR(30);
        DECLARE @Nuevo VARCHAR(30);
        DECLARE @TipoAccion VARCHAR(50) = JSON_VALUE(@ActionJson, '$.tipoAccion');

        BEGIN TRAN;
        SELECT @Anterior = Estado FROM dbo.tbl_Ticket WITH (UPDLOCK, HOLDLOCK)
        WHERE IdTicket = @Ticket AND Activo = 1;
        IF @Anterior IS NULL
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('Ticket no encontrado.', 16, 1);
            RETURN;
        END

        -- Autorizacion de acciones del flujo. El plan solo lo define el Jefe de Marca;
        -- Responsable indica quien lo ejecutara, no quien lo propuso.
        IF @Accion = 'PROPONER_PLAN' AND NOT EXISTS (
            SELECT 1 FROM OPENJSON(@RolesJson) WHERE [value] = 'TICKET_JEFE_MARCA'
        )
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('Solo el Jefe de Marca puede definir el plan de accion.', 16, 1);
            RETURN;
        END

        IF @Accion IN ('APROBAR_MERCADEO','RECHAZAR_MERCADEO') AND NOT EXISTS (
            SELECT 1 FROM OPENJSON(@RolesJson) WHERE [value] = 'TICKET_MERCADEO'
        )
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('Solo Mercadeo puede aprobar o rechazar el plan.', 16, 1);
            RETURN;
        END

        IF @Accion IN ('APROBAR_GERENCIA','RECHAZAR_GERENCIA') AND NOT EXISTS (
            SELECT 1 FROM OPENJSON(@RolesJson) WHERE [value] = 'TICKET_GERENCIA_GENERAL'
        )
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('Solo Gerencia General puede decidir cambios o devoluciones.', 16, 1);
            RETURN;
        END

        IF @Accion IN ('INICIAR_EJECUCION','SOLICITAR_CIERRE') AND NOT EXISTS (
            SELECT 1 FROM OPENJSON(@RolesJson)
            WHERE [value] IN ('TICKET_SUPERVISOR','TICKET_JEFE_MARCA')
        )
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('Solo el Jefe de Marca o Supervisor puede gestionar la ejecucion.', 16, 1);
            RETURN;
        END

        IF @Accion <> 'PROPONER_PLAN'
        BEGIN
            SELECT TOP (1) @TipoAccion = TipoAccion
            FROM dbo.tbl_Ticket_Plan_Accion
            WHERE IdTicket = @Ticket
            ORDER BY IdPlanAccion DESC;
        END

        SET @Nuevo = CASE
            WHEN @Accion = 'PROPONER_PLAN' AND @Anterior IN ('PENDIENTE_PLAN','REABIERTO_URGENTE') THEN 'PENDIENTE_MERCADEO'
            WHEN @Accion = 'APROBAR_MERCADEO' AND @Anterior = 'PENDIENTE_MERCADEO' AND @TipoAccion IN ('CAMBIO','DEVOLUCION') THEN 'PENDIENTE_GERENCIA_GENERAL'
            WHEN @Accion = 'APROBAR_MERCADEO' AND @Anterior = 'PENDIENTE_MERCADEO' THEN 'PLAN_APROBADO'
            WHEN @Accion = 'RECHAZAR_MERCADEO' AND @Anterior = 'PENDIENTE_MERCADEO' THEN 'PENDIENTE_PLAN'
            WHEN @Accion = 'APROBAR_GERENCIA' AND @Anterior = 'PENDIENTE_GERENCIA_GENERAL' THEN 'PLAN_APROBADO'
            WHEN @Accion = 'RECHAZAR_GERENCIA' AND @Anterior = 'PENDIENTE_GERENCIA_GENERAL' THEN 'PENDIENTE_PLAN'
            WHEN @Accion = 'INICIAR_EJECUCION' AND @Anterior = 'PLAN_APROBADO' THEN 'EN_EJECUCION'
            WHEN @Accion = 'SOLICITAR_CIERRE' AND @Anterior = 'EN_EJECUCION' THEN 'PENDIENTE_CIERRE'
            WHEN @Accion = 'CANCELAR' AND @Anterior NOT IN ('CERRADO','CANCELADO') THEN 'CANCELADO'
        END;

        IF @Nuevo IS NULL
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('La transicion no es valida para el estado actual.', 16, 1);
            RETURN;
        END

        IF @Accion = 'PROPONER_PLAN'
        BEGIN
            IF NULLIF(@TipoAccion, '') IS NULL OR NULLIF(JSON_VALUE(@ActionJson, '$.descripcionPlan'), '') IS NULL
            BEGIN
                ROLLBACK TRAN;
                RAISERROR('El tipo y la descripcion del plan son requeridos.', 16, 1);
                RETURN;
            END

            INSERT dbo.tbl_Ticket_Plan_Accion (
                IdTicket, TipoAccion, Descripcion, FechaCompromiso,
                Responsable, Estado, CreadoPor
            ) VALUES (
                @Ticket, @TipoAccion, JSON_VALUE(@ActionJson, '$.descripcionPlan'),
                TRY_CONVERT(DATE, JSON_VALUE(@ActionJson, '$.fechaCompromiso')),
                JSON_VALUE(@ActionJson, '$.responsable'), 'PROPUESTO', @Param3
            );
        END
        IF @Accion IN ('APROBAR_MERCADEO','APROBAR_GERENCIA')
            UPDATE dbo.tbl_Ticket_Plan_Accion SET Estado = 'APROBADO', FechaActualizacion = SYSUTCDATETIME()
            WHERE IdPlanAccion = (SELECT MAX(IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion WHERE IdTicket = @Ticket);
        IF @Accion IN ('RECHAZAR_MERCADEO','RECHAZAR_GERENCIA')
            UPDATE dbo.tbl_Ticket_Plan_Accion SET Estado = 'RECHAZADO', FechaActualizacion = SYSUTCDATETIME()
            WHERE IdPlanAccion = (SELECT MAX(IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion WHERE IdTicket = @Ticket);
        IF @Accion = 'INICIAR_EJECUCION'
            UPDATE dbo.tbl_Ticket_Plan_Accion SET Estado = 'EN_EJECUCION', FechaActualizacion = SYSUTCDATETIME()
            WHERE IdPlanAccion = (SELECT MAX(IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion WHERE IdTicket = @Ticket);
        UPDATE dbo.tbl_Ticket
        SET Estado = @Nuevo,
            Prioridad = CASE WHEN @Nuevo = 'REABIERTO_URGENTE' THEN 'URGENTE' ELSE Prioridad END,
            FechaActualizacion = SYSUTCDATETIME(),
            FechaCierre = CASE WHEN @Nuevo = 'CERRADO' THEN SYSUTCDATETIME() WHEN @Nuevo = 'REABIERTO_URGENTE' THEN NULL ELSE FechaCierre END,
            ResponsableActual = COALESCE(NULLIF(JSON_VALUE(@ActionJson, '$.responsable'), ''), ResponsableActual)
        WHERE IdTicket = @Ticket;

        INSERT dbo.tbl_Ticket_Historial (
            IdTicket, EstadoAnterior, EstadoNuevo, Accion, Comentario,
            UsuarioId, NombreUsuario, RolUsuario
        ) VALUES (
            @Ticket, @Anterior, @Nuevo, @Accion,
            JSON_VALUE(@ActionJson, '$.comentario'), @Param3,
            NULLIF(@Param4, ''), NULLIF(@Param5, '')
        );

        COMMIT;
        SELECT IdTicket, NumeroTicket, Estado, FechaActualizacion
        FROM dbo.tbl_Ticket WHERE IdTicket = @Ticket;
        RETURN;
    END

    -- 3: crear bitacora de correo. Param1=IdTicket, Param2=correo,
    -- Param3=estado, Param4=numero (reservado), Param5=usuario destino.
    IF @Option = 3
    BEGIN
        INSERT dbo.tbl_Ticket_Notificacion (
            IdTicket, UsuarioDestino, CorreoDestino, EstadoTicket, EstadoEnvio
        ) VALUES (
            TRY_CONVERT(BIGINT, @Param1), NULLIF(@Param5, ''), @Param2, @Param3, 'PENDIENTE'
        );
        SELECT SCOPE_IDENTITY() IdNotificacion;
        RETURN;
    END

    -- 4: finalizar bitacora. Param1=IdNotificacion, Param2=ENVIADO|ERROR, Param3=error.
    IF @Option = 4
    BEGIN
        UPDATE dbo.tbl_Ticket_Notificacion
        SET EstadoEnvio = @Param2,
            Error = NULLIF(LEFT(@Param3, 2000), ''),
            FechaEnvio = CASE WHEN @Param2 = 'ENVIADO' THEN SYSUTCDATETIME() ELSE NULL END
        WHERE IdNotificacion = TRY_CONVERT(BIGINT, @Param1)
          AND EstadoEnvio = 'PENDIENTE';
        SELECT IdNotificacion, EstadoEnvio, FechaEnvio
        FROM dbo.tbl_Ticket_Notificacion
        WHERE IdNotificacion = TRY_CONVERT(BIGINT, @Param1);
        RETURN;
    END


    -- 5: emitir token de vendedor. Param1=IdTicket, Param2=hash hexadecimal,
    -- Param3=expiracion UTC, Param4=correo, Param5=codigo vendedor.
    IF @Option = 5
    BEGIN
        DECLARE @TokenTicket BIGINT = TRY_CONVERT(BIGINT, @Param1);
        IF NOT EXISTS (
            SELECT 1 FROM dbo.tbl_Ticket
            WHERE IdTicket = @TokenTicket AND Estado = 'PENDIENTE_CIERRE' AND Activo = 1
        )
        BEGIN
            RAISERROR('El ticket no esta pendiente de cierre.', 16, 1);
            RETURN;
        END

        UPDATE dbo.tbl_Ticket_Token_Vendedor
        SET FechaUso = SYSUTCDATETIME()
        WHERE IdTicket = @TokenTicket AND FechaUso IS NULL;

        INSERT dbo.tbl_Ticket_Token_Vendedor (
            IdTicket, TokenHash, CodigoVendedor, CorreoVendedor, FechaExpiracion
        ) VALUES (
            @TokenTicket, CONVERT(VARBINARY(32), @Param2, 2), NULLIF(@Param5, ''),
            @Param4, TRY_CONVERT(DATETIME2(3), @Param3)
        );
        SELECT SCOPE_IDENTITY() IdToken;
        RETURN;
    END

    -- 6: respuesta publica atomica. Param1=hash, Param2=CERRAR|REABRIR,
    -- Param3=comentario.
    IF @Option = 6
    BEGIN
        DECLARE @SellerTokenId BIGINT;
        DECLARE @SellerTicketId BIGINT;
        DECLARE @SellerExpiration DATETIME2(3);
        DECLARE @SellerUsed DATETIME2(3);
        DECLARE @SellerCurrentState VARCHAR(30);
        DECLARE @SellerNewState VARCHAR(30);
        DECLARE @SellerCode VARCHAR(50);
        DECLARE @SellerEmail NVARCHAR(256);

        BEGIN TRAN;
        SELECT
            @SellerTokenId = V.IdToken,
            @SellerTicketId = V.IdTicket,
            @SellerExpiration = V.FechaExpiracion,
            @SellerUsed = V.FechaUso,
            @SellerCode = V.CodigoVendedor,
            @SellerEmail = V.CorreoVendedor,
            @SellerCurrentState = T.Estado
        FROM dbo.tbl_Ticket_Token_Vendedor V WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.tbl_Ticket T WITH (UPDLOCK, HOLDLOCK) ON T.IdTicket = V.IdTicket
        WHERE V.TokenHash = TRY_CONVERT(VARBINARY(32), @Param1, 2);

        IF @SellerTokenId IS NULL
        BEGIN
            ROLLBACK TRAN;
            SELECT 'NO_ENCONTRADO' Resultado;
            RETURN;
        END
        IF @SellerUsed IS NOT NULL
        BEGIN
            ROLLBACK TRAN;
            SELECT 'USADO' Resultado;
            RETURN;
        END
        IF @SellerExpiration <= SYSUTCDATETIME()
        BEGIN
            ROLLBACK TRAN;
            SELECT 'VENCIDO' Resultado;
            RETURN;
        END
        IF @SellerCurrentState <> 'PENDIENTE_CIERRE'
        BEGIN
            ROLLBACK TRAN;
            SELECT 'PROCESADO' Resultado;
            RETURN;
        END
        IF @Param2 NOT IN ('CERRAR','REABRIR')
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('Accion de vendedor no valida.', 16, 1);
            RETURN;
        END

        SET @SellerNewState = CASE WHEN @Param2 = 'CERRAR' THEN 'CERRADO' ELSE 'REABIERTO_URGENTE' END;

        UPDATE dbo.tbl_Ticket_Token_Vendedor
        SET FechaUso = SYSUTCDATETIME()
        WHERE IdTicket = @SellerTicketId AND FechaUso IS NULL;

        UPDATE dbo.tbl_Ticket
        SET Estado = @SellerNewState,
            Prioridad = CASE WHEN @SellerNewState = 'REABIERTO_URGENTE' THEN 'URGENTE' ELSE Prioridad END,
            FechaActualizacion = SYSUTCDATETIME(),
            FechaCierre = CASE WHEN @SellerNewState = 'CERRADO' THEN SYSUTCDATETIME() ELSE NULL END,
            ResponsableActual = CASE WHEN @SellerNewState = 'REABIERTO_URGENTE' THEN NULL ELSE ResponsableActual END
        WHERE IdTicket = @SellerTicketId;

        IF @SellerNewState = 'CERRADO'
            UPDATE dbo.tbl_Ticket_Plan_Accion
            SET Estado = 'FINALIZADO', FechaActualizacion = SYSUTCDATETIME()
            WHERE IdPlanAccion = (
                SELECT MAX(IdPlanAccion) FROM dbo.tbl_Ticket_Plan_Accion WHERE IdTicket = @SellerTicketId
            );

        INSERT dbo.tbl_Ticket_Historial (
            IdTicket, EstadoAnterior, EstadoNuevo, Accion, Comentario,
            UsuarioId, NombreUsuario, RolUsuario
        ) VALUES (
            @SellerTicketId, @SellerCurrentState, @SellerNewState, @Param2,
            @Param3, ISNULL(NULLIF(@SellerCode, ''), 'VENDEDOR_EXTERNO'),
            @SellerEmail, 'VENDEDOR_EXTERNO'
        );

        COMMIT TRAN;
        SELECT
            'OK' Resultado, T.IdTicket, T.NumeroTicket, T.Estado, T.FechaActualizacion
        FROM dbo.tbl_Ticket T WHERE T.IdTicket = @SellerTicketId;
        RETURN;
    END

    RAISERROR('Opcion no valida para PACO_INSERT_TICKET.', 16, 1);
    RETURN;
END
GO
