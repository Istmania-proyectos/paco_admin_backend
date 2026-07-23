/*
  Automatizacion segura de tickets del formulario 14 de CheckIn.

  Requisitos:
    1. Ejecutar sql/tickets.sql.
    2. Ejecutar sql/tickets.aprobacion-correo.sql.
    3. Ejecutar este archivo en PACO_ADMIN_S4HANA_TEST (y, tras validar, en
       la base productiva equivalente).

  Ningun procedimiento envia correo. @Ejecutar=0 es una simulacion de solo
  lectura. El backend llama @Ejecutar=1 y solamente entonces notifica los
  tickets que el procedimiento devuelve con RequiereNotificacion=1.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.tbl_Ticket', 'DependenciaRespuesta') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD DependenciaRespuesta NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'JefeMarcaUsuarioId') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD JefeMarcaUsuarioId NVARCHAR(450) NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'CorreoJefeMarca') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CorreoJefeMarca NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'CorreoMercadeo') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CorreoMercadeo NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'CorreoGerenciaGeneral') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CorreoGerenciaGeneral NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'TicketAnteriorId') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD TicketAnteriorId BIGINT NULL;
IF COL_LENGTH('dbo.tbl_Ticket', 'CicloRenovacion') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CicloRenovacion INT NOT NULL
        CONSTRAINT DF_tbl_Ticket_CicloRenovacion DEFAULT (0);
IF COL_LENGTH('dbo.tbl_Ticket', 'EsDemo') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD EsDemo BIT NOT NULL
        CONSTRAINT DF_tbl_Ticket_EsDemo DEFAULT (0);
IF COL_LENGTH('dbo.tbl_Ticket', 'CorreoDemo') IS NULL
    ALTER TABLE dbo.tbl_Ticket ADD CorreoDemo NVARCHAR(256) NULL;
GO

/* Una respuesta puede pertenecer a dos tickets cuando contiene productos de
   jefes de marca distintos. Se conserva la validacion logica en los
   procedimientos y se sustituye el indice unico anterior por uno de lectura. */
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.tbl_Ticket')
      AND name = N'UX_tbl_Ticket_Origen'
)
    DROP INDEX UX_tbl_Ticket_Origen ON dbo.tbl_Ticket;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.tbl_Ticket')
      AND name = N'IX_tbl_Ticket_Origen'
)
    CREATE INDEX IX_tbl_Ticket_Origen
        ON dbo.tbl_Ticket(SistemaOrigen, IdFormularioOrigen, IdRespuestaOrigen);
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'dbo.tbl_Ticket')
      AND name = N'FK_tbl_Ticket_TicketAnterior'
)
    ALTER TABLE dbo.tbl_Ticket ADD CONSTRAINT FK_tbl_Ticket_TicketAnterior
        FOREIGN KEY (TicketAnteriorId) REFERENCES dbo.tbl_Ticket(IdTicket);
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.tbl_Ticket')
      AND name = N'UX_tbl_Ticket_TicketAnterior'
)
    CREATE UNIQUE INDEX UX_tbl_Ticket_TicketAnterior
        ON dbo.tbl_Ticket(TicketAnteriorId)
        WHERE TicketAnteriorId IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Checkin_Grupo', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Checkin_Grupo (
        IdGrupo BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_tbl_Ticket_Checkin_Grupo PRIMARY KEY,
        ClaveGrupo BINARY(32) NOT NULL,
        Formulario INT NOT NULL,
        DependenciaRespuesta NVARCHAR(200) NOT NULL,
        JefeMarcaUsuarioId NVARCHAR(450) NOT NULL,
        IdTicket BIGINT NOT NULL,
        FechaCreacion DATETIME2(3) NOT NULL
            CONSTRAINT DF_TicketCheckinGrupo_Fecha DEFAULT SYSUTCDATETIME(),
        FechaActualizacion DATETIME2(3) NULL,
        CONSTRAINT UQ_TicketCheckinGrupo_Clave UNIQUE (ClaveGrupo),
        CONSTRAINT FK_TicketCheckinGrupo_Ticket FOREIGN KEY (IdTicket)
            REFERENCES dbo.tbl_Ticket(IdTicket)
    );
    CREATE INDEX IX_TicketCheckinGrupo_Ticket
        ON dbo.tbl_Ticket_Checkin_Grupo(IdTicket);
END
GO

IF OBJECT_ID(N'dbo.tbl_Ticket_Checkin_Origen', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Ticket_Checkin_Origen (
        IdOrigen BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_tbl_Ticket_Checkin_Origen PRIMARY KEY,
        ClaveOrigen BINARY(32) NOT NULL,
        IdTicket BIGINT NOT NULL,
        Formulario INT NOT NULL,
        Respuesta BIGINT NOT NULL,
        DependenciaRespuesta NVARCHAR(200) NOT NULL,
        JefeMarcaUsuarioId NVARCHAR(450) NOT NULL,
        FechaCreacion DATETIME2(3) NOT NULL
            CONSTRAINT DF_TicketCheckinOrigen_Fecha DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_TicketCheckinOrigen_Clave UNIQUE (ClaveOrigen),
        CONSTRAINT FK_TicketCheckinOrigen_Ticket FOREIGN KEY (IdTicket)
            REFERENCES dbo.tbl_Ticket(IdTicket)
    );
    CREATE INDEX IX_TicketCheckinOrigen_Ticket
        ON dbo.tbl_Ticket_Checkin_Origen(IdTicket, Respuesta);
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_AUTOMATIZAR_CHECKIN
    @Formulario INT = 14,
    @Ejecutar BIT = 0,
    @CorreoMercadeo NVARCHAR(256) = NULL,
    @CorreoGerencia NVARCHAR(256) = NULL,
    @UsuarioSistema NVARCHAR(450) = N'AUTOMATIZACION_CHECKIN',
    @LimiteTickets INT = 0,
    @CorreoDemo NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Formulario <= 0
        RAISERROR('El formulario debe ser mayor que cero.', 16, 1);

    SELECT
        TRY_CONVERT(BIGINT, RD.respuesta_detalle) respuesta_detalle,
        TRY_CONVERT(BIGINT, RD.respuesta) respuesta,
        TRY_CONVERT(INT, RD.pregunta) pregunta,
        CONVERT(NVARCHAR(500), P.descripcion) pregunta_descripcion,
        TRY_CONVERT(INT, RD.formulario) formulario,
        CONVERT(NVARCHAR(250), F.descripcion) formulario_descripcion,
        CONVERT(NVARCHAR(250), RD.tipo_pregunta) tipo_pregunta,
        CONVERT(NVARCHAR(MAX), RD.valor) valor,
        CONVERT(NVARCHAR(200),
            COALESCE(NULLIF(CONVERT(NVARCHAR(200), R.dependencia_respuesta), ''),
                     CONCAT(N'RESPUESTA:', RD.respuesta))) dependencia_respuesta,
        CONVERT(NVARCHAR(450), R.usuario) usuario,
        CONVERT(NVARCHAR(50), R.cliente) cliente,
        R.creado,
        CONVERT(NVARCHAR(200), C.descripcion) cliente_descripcion,
        CONVERT(NVARCHAR(256), U.Email) vendedor_email,
        CONVERT(NVARCHAR(200), CONCAT(U.FirstName, N' ', U.LastName)) vendedor_nombre
    INTO #Base
    FROM [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuesta_Detalle] RD
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Preguntas] P
        ON P.pregunta = RD.pregunta
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Formulario] F
        ON F.formulario = RD.formulario
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuestas] R
        ON R.respuesta = RD.respuesta
    OUTER APPLY (
        SELECT TOP (1)
            CU.Email,
            CU.FirstName,
            CU.LastName
        FROM [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[Users] CU
        WHERE CU.UserID = TRY_CONVERT(UNIQUEIDENTIFIER, R.usuario)
           OR LTRIM(RTRIM(CU.Username)) COLLATE DATABASE_DEFAULT =
              LTRIM(RTRIM(CONVERT(NVARCHAR(450), R.usuario))) COLLATE DATABASE_DEFAULT
        ORDER BY CASE
            WHEN CU.UserID = TRY_CONVERT(UNIQUEIDENTIFIER, R.usuario) THEN 0
            ELSE 1
        END
    ) U
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Clientes_S4] C
        ON C.cliente = R.cliente
    WHERE RD.formulario = @Formulario;

    ;WITH Casas AS (
        SELECT respuesta,
               ROW_NUMBER() OVER (
                   PARTITION BY respuesta ORDER BY respuesta_detalle
               ) ocurrencia,
               LTRIM(RTRIM(LEFT(valor, CHARINDEX(',', valor + ',') - 1))) casa
        FROM #Base WHERE pregunta = 45 AND NULLIF(LTRIM(RTRIM(valor)), '') IS NOT NULL
    ),
    Marcas AS (
        SELECT respuesta,
               ROW_NUMBER() OVER (
                   PARTITION BY respuesta ORDER BY respuesta_detalle
               ) ocurrencia,
               LTRIM(RTRIM(LEFT(valor, CHARINDEX(',', valor + ',') - 1))) marca
        FROM #Base WHERE pregunta = 46 AND NULLIF(LTRIM(RTRIM(valor)), '') IS NOT NULL
    )
    SELECT COALESCE(C.respuesta, M.respuesta) respuesta,
           COALESCE(C.ocurrencia, M.ocurrencia) ocurrencia,
           C.casa, M.marca
    INTO #Productos
    FROM Casas C
    FULL JOIN Marcas M
        ON M.respuesta = C.respuesta AND M.ocurrencia = C.ocurrencia;

    SELECT DISTINCT
        P.respuesta, P.ocurrencia, P.casa, P.marca,
        CU.UserId jefe_usuario_id,
        AU.NombreContacto jefe_nombre,
        AU.Email jefe_email
    INTO #Coincidencias
    FROM #Productos P
    LEFT JOIN dbo.tbl_Casa_Usuario CU
        ON CU.Activo = 1
       AND LTRIM(RTRIM(CONVERT(NVARCHAR(200), CU.Casa)))
            COLLATE DATABASE_DEFAULT = P.casa COLLATE DATABASE_DEFAULT
       AND LTRIM(RTRIM(CONVERT(NVARCHAR(200), CU.Marca)))
            COLLATE DATABASE_DEFAULT = P.marca COLLATE DATABASE_DEFAULT
    LEFT JOIN dbo.AspNetUsers AU ON AU.Id = CU.UserId;

    SELECT C.*,
           COUNT(C.jefe_usuario_id) OVER (
               PARTITION BY C.respuesta, C.ocurrencia
           ) cantidad_asignaciones
    INTO #Asignaciones
    FROM #Coincidencias C;

    SELECT
        B.dependencia_respuesta,
        A.jefe_usuario_id,
        MAX(A.jefe_nombre) jefe_nombre,
        MAX(A.jefe_email) jefe_email,
        MIN(B.cliente) codigo_cliente,
        CONCAT(
            MIN(B.cliente),
            CASE WHEN NULLIF(MIN(B.cliente_descripcion), '') IS NULL THEN ''
                 ELSE CONCAT(N' - ', MIN(B.cliente_descripcion)) END
        ) nombre_cliente,
        MIN(B.usuario) codigo_vendedor,
        MIN(B.vendedor_nombre) nombre_vendedor,
        MIN(B.vendedor_email) correo_vendedor,
        MIN(B.creado) fecha_respuesta,
        COUNT(DISTINCT A.respuesta) cantidad_respuestas
    INTO #Grupos
    FROM #Asignaciones A
    INNER JOIN #Base B ON B.respuesta = A.respuesta
    WHERE A.cantidad_asignaciones = 1
      AND A.jefe_usuario_id IS NOT NULL
    GROUP BY B.dependencia_respuesta, A.jefe_usuario_id;

    CREATE TABLE #Salida (
        IdTicket BIGINT NULL,
        NumeroTicket VARCHAR(30) NULL,
        IdTicketExistente BIGINT NULL,
        NumeroTicketExistente VARCHAR(30) NULL,
        CorreoJefeMarcaExistente NVARCHAR(256) NULL,
        CoincideJefeTicketExistente BIT NULL,
        DependenciaRespuesta NVARCHAR(200) NULL,
        JefeMarcaUsuarioId NVARCHAR(450) NULL,
        JefeMarcaNombre NVARCHAR(256) NULL,
        CorreoJefeMarca NVARCHAR(256) NULL,
        CorreoMercadeo NVARCHAR(256) NULL,
        CorreoGerenciaGeneral NVARCHAR(256) NULL,
        EsDemo BIT NOT NULL DEFAULT (0),
        CorreoDemo NVARCHAR(256) NULL,
        NombreVendedor NVARCHAR(200) NULL,
        CorreoVendedor NVARCHAR(256) NULL,
        CodigoCliente NVARCHAR(50) NULL,
        Cliente NVARCHAR(250) NULL,
        Respuestas NVARCHAR(MAX) NULL,
        CasasMarcas NVARCHAR(MAX) NULL,
        CantidadRespuestas INT NULL,
        EstadoResultado VARCHAR(40) NOT NULL,
        Observacion NVARCHAR(1000) NULL,
        RequiereNotificacion BIT NOT NULL DEFAULT (0)
    );

    /* Errores de asignacion visibles en simulacion. Nunca crean tickets. */
    INSERT #Salida (
        DependenciaRespuesta, CodigoCliente, Cliente, Respuestas, CasasMarcas,
        CantidadRespuestas, EstadoResultado, Observacion
    )
    SELECT
        B.dependencia_respuesta,
        MIN(B.cliente),
        CONCAT(
            MIN(B.cliente),
            CASE WHEN NULLIF(MIN(B.cliente_descripcion), '') IS NULL THEN ''
                 ELSE CONCAT(N' - ', MIN(B.cliente_descripcion)) END
        ),
        CONVERT(NVARCHAR(30), A.respuesta),
        CONCAT(COALESCE(A.casa, N'<sin casa>'), N' / ',
               COALESCE(A.marca, N'<sin marca>')),
        1,
        CASE WHEN MAX(A.cantidad_asignaciones) = 0
             THEN 'SIN_JEFE_MARCA' ELSE 'ASIGNACION_AMBIGUA' END,
        CASE WHEN MAX(A.cantidad_asignaciones) = 0
             THEN N'No hay una asignacion activa Casa/Marca en tbl_Casa_Usuario.'
             ELSE N'La misma Casa/Marca tiene mas de un jefe activo.' END
    FROM #Asignaciones A
    INNER JOIN #Base B ON B.respuesta = A.respuesta
    WHERE A.cantidad_asignaciones <> 1
    GROUP BY B.dependencia_respuesta, A.respuesta, A.ocurrencia, A.casa, A.marca;

    INSERT #Salida (
        DependenciaRespuesta, JefeMarcaUsuarioId, JefeMarcaNombre,
        CorreoJefeMarca, CorreoMercadeo, CorreoGerenciaGeneral,
        NombreVendedor, CorreoVendedor, CodigoCliente, Cliente, Respuestas,
        CasasMarcas, CantidadRespuestas, IdTicketExistente,
        NumeroTicketExistente, CorreoJefeMarcaExistente,
        CoincideJefeTicketExistente, EstadoResultado, Observacion
    )
    SELECT
        G.dependencia_respuesta, G.jefe_usuario_id, G.jefe_nombre,
        G.jefe_email, NULLIF(@CorreoMercadeo, ''), NULLIF(@CorreoGerencia, ''),
        G.nombre_vendedor, G.correo_vendedor, G.codigo_cliente, G.nombre_cliente,
        STUFF((
            SELECT DISTINCT N', ' + CONVERT(NVARCHAR(30), A2.respuesta)
            FROM #Asignaciones A2
            INNER JOIN #Base B2 ON B2.respuesta = A2.respuesta
            WHERE B2.dependencia_respuesta = G.dependencia_respuesta
              AND A2.jefe_usuario_id = G.jefe_usuario_id
              AND A2.cantidad_asignaciones = 1
            FOR XML PATH(''), TYPE
        ).value('.', 'nvarchar(max)'), 1, 2, ''),
        STUFF((
            SELECT DISTINCT N', ' + CONCAT(A3.casa, N' / ', A3.marca)
            FROM #Asignaciones A3
            INNER JOIN #Base B3 ON B3.respuesta = A3.respuesta
            WHERE B3.dependencia_respuesta = G.dependencia_respuesta
              AND A3.jefe_usuario_id = G.jefe_usuario_id
              AND A3.cantidad_asignaciones = 1
            FOR XML PATH(''), TYPE
        ).value('.', 'nvarchar(max)'), 1, 2, ''),
        G.cantidad_respuestas,
        L.IdTicket,
        L.NumeroTicket,
        L.CorreoJefeMarca,
        CASE WHEN L.IdTicket IS NULL THEN NULL
             WHEN LOWER(LTRIM(RTRIM(COALESCE(L.CorreoJefeMarca, '')))) =
                  LOWER(LTRIM(RTRIM(COALESCE(G.jefe_email, ''))))
             THEN 1 ELSE 0 END,
        CASE
            WHEN NULLIF(G.jefe_email, '') IS NULL THEN 'JEFE_SIN_CORREO'
            WHEN X.IdTicket IS NOT NULL AND NOT EXISTS (
                SELECT 1
                FROM #Asignaciones AX
                INNER JOIN #Base BX ON BX.respuesta = AX.respuesta
                WHERE BX.dependencia_respuesta = G.dependencia_respuesta
                  AND AX.jefe_usuario_id = G.jefe_usuario_id
                  AND AX.cantidad_asignaciones = 1
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tbl_Ticket_Checkin_Origen O
                      WHERE O.Formulario = @Formulario
                        AND O.Respuesta = AX.respuesta
                        AND O.JefeMarcaUsuarioId = G.jefe_usuario_id
                  )
            ) THEN 'YA_IMPORTADO'
            WHEN X.IdTicket IS NOT NULL THEN 'LISTO_ACTUALIZAR'
            ELSE 'LISTO_CREAR'
        END,
        CONCAT(
        CASE
            WHEN NULLIF(G.jefe_email, '') IS NULL
                THEN N'El jefe de marca esta asignado pero no tiene correo.'
            WHEN NULLIF(@CorreoMercadeo, '') IS NULL
                THEN N'Pendiente configurar el correo estatico de Mercadeo antes de ejecutar.'
            WHEN NULLIF(@CorreoGerencia, '') IS NULL
                THEN N'Pendiente configurar Gerencia General; sera obligatorio si el plan es cambio o devolucion.'
            ELSE N'Grupo valido.' END,
        CASE WHEN L.IdTicket IS NOT NULL
             THEN CONCAT(
                 N' Antecedente: ', L.NumeroTicket,
                 N'; jefe configurado=', COALESCE(L.CorreoJefeMarca, N'<sin correo>'),
                 CASE WHEN LOWER(LTRIM(RTRIM(COALESCE(L.CorreoJefeMarca, '')))) <>
                                LOWER(LTRIM(RTRIM(COALESCE(G.jefe_email, ''))))
                      THEN N' (NO COINCIDE con la asignacion actual).' ELSE N' (coincide).' END
             )
             ELSE N'' END)
    FROM #Grupos G
    OUTER APPLY (
        SELECT TOP (1) CG.IdTicket
        FROM dbo.tbl_Ticket_Checkin_Grupo CG
        WHERE CG.ClaveGrupo = HASHBYTES(
            'SHA2_256',
            CONCAT(@Formulario, N'|', G.dependencia_respuesta, N'|',
                   G.jefe_usuario_id)
        )
    ) X
    OUTER APPLY (
        SELECT TOP (1)
            T.IdTicket, T.NumeroTicket, T.CorreoJefeMarca
        FROM dbo.tbl_Ticket T
        WHERE T.IdFormularioOrigen = @Formulario
          AND T.SistemaOrigen = 'CHECKIN'
          AND EXISTS (
              SELECT 1
              FROM #Asignaciones AL
              INNER JOIN #Base BL ON BL.respuesta = AL.respuesta
              WHERE BL.dependencia_respuesta = G.dependencia_respuesta
                AND AL.jefe_usuario_id = G.jefe_usuario_id
                AND AL.cantidad_asignaciones = 1
                AND T.IdRespuestaOrigen = AL.respuesta
          )
        ORDER BY T.FechaCreacion DESC
    ) L;

    IF @Ejecutar = 1 AND EXISTS (
        SELECT 1 FROM #Salida
        WHERE EstadoResultado IN ('LISTO_CREAR', 'LISTO_ACTUALIZAR')
    ) AND NULLIF(@CorreoMercadeo, '') IS NULL
        RAISERROR('Configure TICKETS_MARKETING_MANAGER_EMAIL antes de ejecutar.', 16, 1);

    IF @Ejecutar = 1
    BEGIN
        DECLARE
            @Dependencia NVARCHAR(200),
            @JefeId NVARCHAR(450),
            @JefeNombre NVARCHAR(256),
            @JefeCorreo NVARCHAR(256),
            @CodigoCliente NVARCHAR(50),
            @NombreCliente NVARCHAR(250),
            @CodigoVendedor NVARCHAR(450),
            @NombreVendedor NVARCHAR(200),
            @CorreoVendedor NVARCHAR(256),
            @FechaRespuesta DATETIME2(3),
            @IdTicket BIGINT,
            @NumeroTicket VARCHAR(30),
            @EsNuevo BIT,
            @CantidadNueva INT;

        DECLARE @MaxGrupos INT =
            CASE WHEN @LimiteTickets BETWEEN 1 AND 100
                 THEN @LimiteTickets ELSE 2147483647 END;

        DECLARE grupos CURSOR LOCAL FAST_FORWARD FOR
            SELECT TOP (@MaxGrupos)
                   G.dependencia_respuesta, G.jefe_usuario_id, G.jefe_nombre,
                   G.jefe_email, G.codigo_cliente, G.nombre_cliente,
                   G.codigo_vendedor, G.nombre_vendedor, G.correo_vendedor,
                   G.fecha_respuesta
            FROM #Grupos G
            WHERE NULLIF(G.jefe_email, '') IS NOT NULL
            ORDER BY G.fecha_respuesta DESC, G.dependencia_respuesta,
                     G.jefe_usuario_id;

        OPEN grupos;
        FETCH NEXT FROM grupos INTO
            @Dependencia, @JefeId, @JefeNombre, @JefeCorreo,
            @CodigoCliente, @NombreCliente, @CodigoVendedor, @NombreVendedor,
            @CorreoVendedor, @FechaRespuesta;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @IdTicket = NULL;
            SET @NumeroTicket = NULL;
            SET @EsNuevo = 0;
            SET @CantidadNueva = 0;

            BEGIN TRAN;

            SELECT @IdTicket = CG.IdTicket
            FROM dbo.tbl_Ticket_Checkin_Grupo CG WITH (UPDLOCK, HOLDLOCK)
            WHERE CG.ClaveGrupo = HASHBYTES(
                'SHA2_256',
                CONCAT(@Formulario, N'|', @Dependencia, N'|', @JefeId)
            );

            SELECT @CantidadNueva = COUNT(DISTINCT A.respuesta)
            FROM #Asignaciones A
            INNER JOIN #Base B ON B.respuesta = A.respuesta
            WHERE B.dependencia_respuesta = @Dependencia
              AND A.jefe_usuario_id = @JefeId
              AND A.cantidad_asignaciones = 1
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.tbl_Ticket_Checkin_Origen O
                  WHERE O.Formulario = @Formulario
                    AND O.Respuesta = A.respuesta
                    AND O.JefeMarcaUsuarioId = @JefeId
              );

            /* Repara datos de contacto aunque las respuestas ya estuvieran
               importadas. Algunos CheckIn guardan R.usuario como Username
               (por ejemplo T08) y no como GUID. */
            IF @IdTicket IS NOT NULL
                UPDATE dbo.tbl_Ticket
                SET CodigoVendedor = COALESCE(NULLIF(@CodigoVendedor, ''), CodigoVendedor),
                    NombreVendedor = COALESCE(NULLIF(@NombreVendedor, ''), NombreVendedor),
                    CorreoVendedor = COALESCE(NULLIF(@CorreoVendedor, ''), CorreoVendedor),
                    FechaActualizacion = SYSUTCDATETIME()
                WHERE IdTicket = @IdTicket;

            IF @CantidadNueva > 0
            BEGIN
                IF @IdTicket IS NULL
                BEGIN
                    INSERT dbo.tbl_Ticket (
                        NumeroTicket, SistemaOrigen, IdRespuestaOrigen,
                        IdFormularioOrigen, DependenciaRespuesta,
                        JefeMarcaUsuarioId, CodigoCliente, NombreCliente,
                        CodigoVendedor, NombreVendedor, CorreoVendedor,
                        CorreoJefeMarca, CorreoMercadeo, CorreoGerenciaGeneral,
                        TipoTicket, Titulo, Descripcion, Prioridad,
                        FechaRespuestaOrigen, CreadoPor, ResponsableActual,
                        EsDemo, CorreoDemo
                    )
                    SELECT
                        CONCAT('TMP-', LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 26)),
                        'CHECKIN', MIN(A.respuesta), @Formulario, @Dependencia,
                        @JefeId, @CodigoCliente, @NombreCliente,
                        @CodigoVendedor, @NombreVendedor, @CorreoVendedor,
                        @JefeCorreo, @CorreoMercadeo, NULLIF(@CorreoGerencia, ''),
                        'PRODUCTO_PROXIMO_VENCER',
                        CONCAT(N'Vencimiento - formulario ', @Formulario,
                               N', dependencia ', @Dependencia),
                        CONCAT(N'Generado automaticamente desde CheckIn. Casa/Marca: ',
                            STUFF((
                                SELECT DISTINCT N', ' + CONCAT(A4.casa, N' / ', A4.marca)
                                FROM #Asignaciones A4
                                INNER JOIN #Base B4 ON B4.respuesta = A4.respuesta
                                WHERE B4.dependencia_respuesta = @Dependencia
                                  AND A4.jefe_usuario_id = @JefeId
                                  AND A4.cantidad_asignaciones = 1
                                FOR XML PATH(''), TYPE
                            ).value('.', 'nvarchar(max)'), 1, 2, '')
                        ),
                        'NORMAL', @FechaRespuesta, @UsuarioSistema, @JefeId,
                        CASE WHEN NULLIF(@CorreoDemo, '') IS NULL THEN 0 ELSE 1 END,
                        NULLIF(@CorreoDemo, '')
                    FROM #Asignaciones A
                    INNER JOIN #Base B ON B.respuesta = A.respuesta
                    WHERE B.dependencia_respuesta = @Dependencia
                      AND A.jefe_usuario_id = @JefeId
                      AND A.cantidad_asignaciones = 1;

                    SET @IdTicket = SCOPE_IDENTITY();
                    SET @EsNuevo = 1;
                    UPDATE dbo.tbl_Ticket
                    SET NumeroTicket = CONCAT(
                        'TKT-', RIGHT(REPLICATE('0', 10) +
                        CONVERT(VARCHAR(20), @IdTicket), 10)
                    )
                    WHERE IdTicket = @IdTicket;

                    INSERT dbo.tbl_Ticket_Checkin_Grupo (
                        ClaveGrupo, Formulario, DependenciaRespuesta,
                        JefeMarcaUsuarioId, IdTicket
                    ) VALUES (
                        HASHBYTES(
                            'SHA2_256',
                            CONCAT(@Formulario, N'|', @Dependencia, N'|', @JefeId)
                        ),
                        @Formulario, @Dependencia, @JefeId, @IdTicket
                    );
                END

                INSERT dbo.tbl_Ticket_Detalle (
                    IdTicket, IdDetalleOrigen, IdPreguntaOrigen,
                    Pregunta, TipoRespuesta, Valor
                )
                SELECT DISTINCT
                    @IdTicket, B.respuesta_detalle, B.pregunta,
                    B.pregunta_descripcion, B.tipo_pregunta, B.valor
                FROM #Base B
                WHERE EXISTS (
                    SELECT 1 FROM #Asignaciones A
                    WHERE A.respuesta = B.respuesta
                      AND A.jefe_usuario_id = @JefeId
                      AND A.cantidad_asignaciones = 1
                )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tbl_Ticket_Detalle D
                      WHERE D.IdTicket = @IdTicket
                        AND D.IdDetalleOrigen = B.respuesta_detalle
                  );

                INSERT dbo.tbl_Ticket_Checkin_Origen (
                    ClaveOrigen, IdTicket, Formulario, Respuesta,
                    DependenciaRespuesta, JefeMarcaUsuarioId
                )
                SELECT DISTINCT
                    HASHBYTES(
                        'SHA2_256',
                        CONCAT(@Formulario, N'|', A.respuesta, N'|', @JefeId)
                    ),
                    @IdTicket, @Formulario, A.respuesta, @Dependencia, @JefeId
                FROM #Asignaciones A
                INNER JOIN #Base B ON B.respuesta = A.respuesta
                WHERE B.dependencia_respuesta = @Dependencia
                  AND A.jefe_usuario_id = @JefeId
                  AND A.cantidad_asignaciones = 1
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tbl_Ticket_Checkin_Origen O
                      WHERE O.Formulario = @Formulario
                        AND O.Respuesta = A.respuesta
                        AND O.JefeMarcaUsuarioId = @JefeId
                  );

                INSERT dbo.tbl_Ticket_Historial (
                    IdTicket, EstadoAnterior, EstadoNuevo, Accion, Comentario,
                    UsuarioId, NombreUsuario, RolUsuario
                ) VALUES (
                    @IdTicket,
                    CASE WHEN @EsNuevo = 1 THEN NULL
                         ELSE (SELECT Estado FROM dbo.tbl_Ticket WHERE IdTicket = @IdTicket) END,
                    (SELECT Estado FROM dbo.tbl_Ticket WHERE IdTicket = @IdTicket),
                    CASE WHEN @EsNuevo = 1 THEN 'CREAR_AUTOMATICO' ELSE 'AGREGAR_RESPUESTAS' END,
                    CONCAT(@CantidadNueva, N' respuesta(s) de CheckIn incorporadas automaticamente.'),
                    @UsuarioSistema, N'Automatizacion CheckIn', N'TICKET_INTEGRACION'
                );

                UPDATE dbo.tbl_Ticket_Checkin_Grupo
                SET FechaActualizacion = SYSUTCDATETIME()
                WHERE IdTicket = @IdTicket;

                UPDATE dbo.tbl_Ticket
                SET FechaActualizacion = SYSUTCDATETIME()
                WHERE IdTicket = @IdTicket AND @EsNuevo = 0;

                IF NULLIF(@CorreoDemo, '') IS NOT NULL
                    UPDATE dbo.tbl_Ticket
                    SET EsDemo = 1, CorreoDemo = @CorreoDemo
                    WHERE IdTicket = @IdTicket;
            END

            SELECT @NumeroTicket = NumeroTicket
            FROM dbo.tbl_Ticket WHERE IdTicket = @IdTicket;

            COMMIT;

            IF @CantidadNueva > 0
                UPDATE #Salida
                SET IdTicket = @IdTicket,
                    NumeroTicket = @NumeroTicket,
                    EsDemo = CASE WHEN NULLIF(@CorreoDemo, '') IS NULL THEN 0 ELSE 1 END,
                    CorreoDemo = NULLIF(@CorreoDemo, ''),
                    EstadoResultado =
                        CASE WHEN @EsNuevo = 1 THEN 'CREADO' ELSE 'ACTUALIZADO' END,
                    RequiereNotificacion = 1
                WHERE DependenciaRespuesta = @Dependencia
                  AND JefeMarcaUsuarioId = @JefeId;

            FETCH NEXT FROM grupos INTO
                @Dependencia, @JefeId, @JefeNombre, @JefeCorreo,
                @CodigoCliente, @NombreCliente, @CodigoVendedor, @NombreVendedor,
                @CorreoVendedor, @FechaRespuesta;
        END

        CLOSE grupos;
        DEALLOCATE grupos;
    END

    SELECT *,
        CONCAT(
            N'JEFE_MARCA=', COALESCE(CorreoJefeMarca, N'<sin correo>'),
            N'; MERCADEO=', COALESCE(CorreoMercadeo, N'<pendiente configurar>'),
            N'; GERENCIA_GENERAL=',
                COALESCE(CorreoGerenciaGeneral, N'<pendiente configurar>'),
            N'; VENDEDOR=', COALESCE(CorreoVendedor, N'<sin correo>')
        ) ContactosHipoteticos
    FROM #Salida
    ORDER BY
        CASE WHEN EstadoResultado IN ('SIN_JEFE_MARCA','ASIGNACION_AMBIGUA','JEFE_SIN_CORREO')
             THEN 0 ELSE 1 END,
        DependenciaRespuesta, JefeMarcaNombre;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_DEMO_LIMPIAR
    @CorreoDemo NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Ids TABLE (IdTicket BIGINT PRIMARY KEY);
    INSERT @Ids(IdTicket)
    SELECT IdTicket
    FROM dbo.tbl_Ticket
    WHERE EsDemo = 1
      AND LOWER(LTRIM(RTRIM(CorreoDemo))) =
          LOWER(LTRIM(RTRIM(@CorreoDemo)));

    DECLARE @Cantidad INT = (SELECT COUNT(*) FROM @Ids);
    IF @Cantidad = 0
    BEGIN
        SELECT 0 TicketsEliminados, CAST(NULL AS UNIQUEIDENTIFIER) IdRespaldo;
        RETURN;
    END

    IF OBJECT_ID('dbo.Ticket_Demo_Reset_Archivo','U') IS NULL
    BEGIN
        CREATE TABLE dbo.Ticket_Demo_Reset_Archivo(
            IdArchivo BIGINT IDENTITY(1,1) PRIMARY KEY,
            IdCorte UNIQUEIDENTIFIER NOT NULL,
            FechaCorte DATETIME2(3) NOT NULL,
            Tabla SYSNAME NOT NULL,
            Cantidad BIGINT NOT NULL,
            DatosJson NVARCHAR(MAX) NULL
        );
    END

    DECLARE @Corte UNIQUEIDENTIFIER = NEWID();
    DECLARE @Fecha DATETIME2(3) = SYSUTCDATETIME();
    BEGIN TRAN;

    INSERT dbo.Ticket_Demo_Reset_Archivo(
        IdCorte, FechaCorte, Tabla, Cantidad, DatosJson
    )
    SELECT @Corte, @Fecha, 'tbl_Ticket', COUNT_BIG(*),
           (SELECT T.* FROM dbo.tbl_Ticket T
            INNER JOIN @Ids I ON I.IdTicket=T.IdTicket
            FOR JSON PATH, INCLUDE_NULL_VALUES)
    FROM dbo.tbl_Ticket T INNER JOIN @Ids I ON I.IdTicket=T.IdTicket
    UNION ALL
    SELECT @Corte,@Fecha,'tbl_Ticket_Detalle',COUNT_BIG(*),
           (SELECT X.* FROM dbo.tbl_Ticket_Detalle X
            INNER JOIN @Ids I ON I.IdTicket=X.IdTicket
            FOR JSON PATH, INCLUDE_NULL_VALUES)
    FROM dbo.tbl_Ticket_Detalle X INNER JOIN @Ids I ON I.IdTicket=X.IdTicket
    UNION ALL
    SELECT @Corte,@Fecha,'tbl_Ticket_Plan_Accion',COUNT_BIG(*),
           (SELECT X.* FROM dbo.tbl_Ticket_Plan_Accion X
            INNER JOIN @Ids I ON I.IdTicket=X.IdTicket
            FOR JSON PATH, INCLUDE_NULL_VALUES)
    FROM dbo.tbl_Ticket_Plan_Accion X INNER JOIN @Ids I ON I.IdTicket=X.IdTicket
    UNION ALL
    SELECT @Corte,@Fecha,'tbl_Ticket_Historial',COUNT_BIG(*),
           (SELECT X.* FROM dbo.tbl_Ticket_Historial X
            INNER JOIN @Ids I ON I.IdTicket=X.IdTicket
            FOR JSON PATH, INCLUDE_NULL_VALUES)
    FROM dbo.tbl_Ticket_Historial X INNER JOIN @Ids I ON I.IdTicket=X.IdTicket
    UNION ALL
    SELECT @Corte,@Fecha,'tbl_Ticket_Notificacion',COUNT_BIG(*),
           (SELECT X.* FROM dbo.tbl_Ticket_Notificacion X
            INNER JOIN @Ids I ON I.IdTicket=X.IdTicket
            FOR JSON PATH, INCLUDE_NULL_VALUES)
    FROM dbo.tbl_Ticket_Notificacion X INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;

    DELETE X FROM dbo.tbl_Ticket_Checkin_Grupo X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;
    DELETE X FROM dbo.tbl_Ticket_Checkin_Origen X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;
    DELETE X FROM dbo.tbl_Ticket_Token_Aprobacion X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;
    DELETE X FROM dbo.tbl_Ticket_Token_Vendedor X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;
    DELETE X FROM dbo.tbl_Ticket_Notificacion X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;
    DELETE X FROM dbo.tbl_Ticket_Historial X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;
    DELETE X FROM dbo.tbl_Ticket_Plan_Accion X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;
    DELETE X FROM dbo.tbl_Ticket_Detalle X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;
    DELETE X FROM dbo.tbl_Ticket X
    INNER JOIN @Ids I ON I.IdTicket=X.IdTicket;

    COMMIT;

    IF NOT EXISTS (SELECT 1 FROM dbo.tbl_Ticket)
        DBCC CHECKIDENT ('dbo.tbl_Ticket', RESEED, 0) WITH NO_INFOMSGS;

    SELECT @Cantidad TicketsEliminados, @Corte IdRespaldo;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_RENOVAR_MENSUAL
    @Ejecutar BIT = 0,
    @Dias INT = 30,
    @UsuarioSistema NVARCHAR(450) = N'AUTOMATIZACION_CHECKIN'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Dias < 1 OR @Dias > 365
        RAISERROR('Dias debe estar entre 1 y 365.', 16, 1);

    CREATE TABLE #Renovaciones (
        IdTicketAnterior BIGINT NOT NULL,
        NumeroTicketAnterior VARCHAR(30) NOT NULL,
        IdTicket BIGINT NULL,
        NumeroTicket VARCHAR(30) NULL,
        EstadoAnterior VARCHAR(30) NOT NULL,
        FechaApertura DATETIME2(3) NOT NULL,
        DiasAbierto INT NOT NULL,
        CicloRenovacion INT NOT NULL,
        CorreoJefeMarca NVARCHAR(256) NULL,
        CorreoMercadeo NVARCHAR(256) NULL,
        CorreoGerenciaGeneral NVARCHAR(256) NULL,
        CorreoVendedor NVARCHAR(256) NULL,
        ResumenTicketAnterior NVARCHAR(MAX) NULL,
        EstadoResultado VARCHAR(30) NOT NULL,
        RequiereNotificacion BIT NOT NULL DEFAULT (0)
    );

    INSERT #Renovaciones (
        IdTicketAnterior, NumeroTicketAnterior, EstadoAnterior, FechaApertura,
        DiasAbierto, CicloRenovacion, CorreoJefeMarca, CorreoMercadeo,
        CorreoGerenciaGeneral, CorreoVendedor, ResumenTicketAnterior,
        EstadoResultado
    )
    SELECT
        T.IdTicket, T.NumeroTicket, T.Estado, T.FechaCreacion,
        DATEDIFF(DAY, T.FechaCreacion, SYSUTCDATETIME()),
        ISNULL(T.CicloRenovacion, 0) + 1,
        T.CorreoJefeMarca, T.CorreoMercadeo, T.CorreoGerenciaGeneral,
        T.CorreoVendedor,
        CONCAT(
            N'Ticket anterior ', T.NumeroTicket, N'. Estado al vencer: ', T.Estado,
            N'. Abierto durante ',
            DATEDIFF(DAY, T.FechaCreacion, SYSUTCDATETIME()), N' dias.',
            N' Actualizaciones: ',
            COALESCE(STUFF((
                SELECT N' | ' + CONVERT(NVARCHAR(19), H.Fecha, 120) +
                       N' [' + H.Accion + N'] ' +
                       COALESCE(NULLIF(H.Comentario, ''), N'Sin comentario')
                FROM dbo.tbl_Ticket_Historial H
                WHERE H.IdTicket = T.IdTicket
                ORDER BY H.Fecha
                FOR XML PATH(''), TYPE
            ).value('.', 'nvarchar(max)'), 1, 3, ''), N'Sin actualizaciones')
        ),
        'LISTO_RENOVAR'
    FROM dbo.tbl_Ticket T
    WHERE T.Activo = 1
      AND T.Estado NOT IN ('CERRADO', 'CANCELADO')
      AND T.FechaCreacion <= DATEADD(DAY, -@Dias, SYSUTCDATETIME())
      AND NOT EXISTS (
          SELECT 1 FROM dbo.tbl_Ticket Hijo
          WHERE Hijo.TicketAnteriorId = T.IdTicket
      );

    IF @Ejecutar = 1
    BEGIN
        DECLARE
            @Anterior BIGINT,
            @EstadoAnterior VARCHAR(30),
            @Resumen NVARCHAR(MAX),
            @Nuevo BIGINT,
            @NumeroNuevo VARCHAR(30);

        DECLARE vencidos CURSOR LOCAL FAST_FORWARD FOR
            SELECT IdTicketAnterior, EstadoAnterior, ResumenTicketAnterior
            FROM #Renovaciones;
        OPEN vencidos;
        FETCH NEXT FROM vencidos INTO @Anterior, @EstadoAnterior, @Resumen;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @Nuevo = NULL;
            BEGIN TRAN;

            IF EXISTS (
                SELECT 1 FROM dbo.tbl_Ticket WITH (UPDLOCK, HOLDLOCK)
                WHERE IdTicket = @Anterior
                  AND Estado NOT IN ('CERRADO', 'CANCELADO')
            ) AND NOT EXISTS (
                SELECT 1 FROM dbo.tbl_Ticket
                WHERE TicketAnteriorId = @Anterior
            )
            BEGIN
                INSERT dbo.tbl_Ticket (
                    NumeroTicket, SistemaOrigen, IdFormularioOrigen,
                    DependenciaRespuesta, JefeMarcaUsuarioId,
                    CodigoCliente, NombreCliente, CodigoVendedor,
                    NombreVendedor, CorreoVendedor, CorreoJefeMarca,
                    CorreoMercadeo, CorreoGerenciaGeneral, TipoTicket, Titulo,
                    Descripcion, Prioridad, FechaRespuestaOrigen,
                    FechaVencimiento, CreadoPor, ResponsableActual,
                    TicketAnteriorId, CicloRenovacion, EsDemo, CorreoDemo
                )
                SELECT
                    CONCAT('TMP-', LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 26)),
                    'RENOVACION_MENSUAL', IdFormularioOrigen,
                    DependenciaRespuesta, JefeMarcaUsuarioId,
                    CodigoCliente, NombreCliente, CodigoVendedor,
                    NombreVendedor, CorreoVendedor, CorreoJefeMarca,
                    CorreoMercadeo, CorreoGerenciaGeneral, TipoTicket,
                    LEFT(CONCAT(N'Renovacion ', ISNULL(CicloRenovacion, 0) + 1,
                           N': ', Titulo), 250),
                    CONCAT(
                        N'Renovacion automatica por falta de resolucion en ',
                        @Dias, N' dias.', CHAR(13), CHAR(10), @Resumen,
                        CHAR(13), CHAR(10), N'Descripcion original: ',
                        COALESCE(Descripcion, N'Sin descripcion')
                    ),
                    'ALTA', FechaRespuestaOrigen, FechaVencimiento,
                    @UsuarioSistema, JefeMarcaUsuarioId, IdTicket,
                    ISNULL(CicloRenovacion, 0) + 1, EsDemo, CorreoDemo
                FROM dbo.tbl_Ticket WHERE IdTicket = @Anterior;

                SET @Nuevo = SCOPE_IDENTITY();
                SET @NumeroNuevo = CONCAT(
                    'TKT-', RIGHT(REPLICATE('0', 10) +
                    CONVERT(VARCHAR(20), @Nuevo), 10)
                );
                UPDATE dbo.tbl_Ticket
                SET NumeroTicket = @NumeroNuevo
                WHERE IdTicket = @Nuevo;

                INSERT dbo.tbl_Ticket_Detalle (
                    IdTicket, IdDetalleOrigen, IdPreguntaOrigen,
                    Pregunta, TipoRespuesta, Valor
                )
                SELECT @Nuevo, IdDetalleOrigen, IdPreguntaOrigen,
                       Pregunta, TipoRespuesta, Valor
                FROM dbo.tbl_Ticket_Detalle
                WHERE IdTicket = @Anterior;

                UPDATE dbo.tbl_Ticket
                SET Estado = 'CANCELADO',
                    FechaActualizacion = SYSUTCDATETIME(),
                    FechaCierre = SYSUTCDATETIME()
                WHERE IdTicket = @Anterior;

                INSERT dbo.tbl_Ticket_Historial (
                    IdTicket, EstadoAnterior, EstadoNuevo, Accion, Comentario,
                    UsuarioId, NombreUsuario, RolUsuario
                ) VALUES
                (
                    @Anterior, @EstadoAnterior, 'CANCELADO', 'RENOVAR_MENSUAL',
                    CONCAT(N'Continuidad creada en ', @NumeroNuevo, N'.'),
                    @UsuarioSistema, N'Automatizacion CheckIn', N'TICKET_INTEGRACION'
                ),
                (
                    @Nuevo, NULL, 'PENDIENTE_PLAN', 'RENOVACION_MENSUAL',
                    @Resumen, @UsuarioSistema, N'Automatizacion CheckIn',
                    N'TICKET_INTEGRACION'
                );

                UPDATE dbo.tbl_Ticket_Checkin_Grupo
                SET IdTicket = @Nuevo, FechaActualizacion = SYSUTCDATETIME()
                WHERE IdTicket = @Anterior;
            END

            COMMIT;

            IF @Nuevo IS NOT NULL
                UPDATE #Renovaciones
                SET IdTicket = @Nuevo, NumeroTicket = @NumeroNuevo,
                    EstadoResultado = 'RENOVADO',
                    RequiereNotificacion = 1
                WHERE IdTicketAnterior = @Anterior;

            FETCH NEXT FROM vencidos INTO @Anterior, @EstadoAnterior, @Resumen;
        END

        CLOSE vencidos;
        DEALLOCATE vencidos;
    END

    SELECT *,
        CONCAT(
            N'JEFE_MARCA=', COALESCE(CorreoJefeMarca, N'<sin correo>'),
            N'; MERCADEO=', COALESCE(CorreoMercadeo, N'<pendiente configurar>'),
            N'; GERENCIA_GENERAL=',
                COALESCE(CorreoGerenciaGeneral, N'<pendiente configurar>'),
            N'; VENDEDOR=', COALESCE(CorreoVendedor, N'<sin correo>')
        ) ContactosHipoteticos
    FROM #Renovaciones
    ORDER BY FechaApertura;
END
GO

/* Consulta enriquecida para diagnostico/manual. Cliente ya viene concatenado. */
CREATE OR ALTER PROCEDURE dbo.PACO_GET_TICKET_CHECKIN
    @Formulario INT = 14
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        RD.respuesta_detalle, RD.respuesta, RD.pregunta,
        P.descripcion pregunta_descripcion, RD.formulario,
        F.descripcion formulario_descripcion, RD.tipo_pregunta, RD.valor,
        RD.checkin, R.dependencia_respuesta, R.usuario,
        R.cliente cliente_codigo, R.creado,
        C.descripcion cliente_descripcion,
        CONCAT(
            CONVERT(NVARCHAR(50), R.cliente),
            CASE WHEN NULLIF(CONVERT(NVARCHAR(200), C.descripcion), '') IS NULL
                 THEN '' ELSE CONCAT(N' - ', C.descripcion) END
        ) cliente,
        U.Email, U.FirstName, U.LastName,
        CONCAT(U.FirstName, N' ', U.LastName) nombre_usuario
    FROM [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuesta_Detalle] RD
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Preguntas] P
        ON P.pregunta = RD.pregunta
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Formulario] F
        ON F.formulario = RD.formulario
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuestas] R
        ON R.respuesta = RD.respuesta
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[Users] U
        ON U.UserID = TRY_CONVERT(UNIQUEIDENTIFIER, R.usuario)
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Clientes_S4] C
        ON C.cliente = R.cliente
    WHERE RD.formulario = @Formulario
    ORDER BY R.creado DESC, RD.respuesta, RD.respuesta_detalle;
END
GO
