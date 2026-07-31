/*
  Correos relacionados y suplencias de Tickets.
  Ejecutar en PACO_ADMIN_S4HANA despues de los scripts base de tickets.
  La tabla tbl_correo_relacionados ya existe en produccion.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.AspNetUsers', 'vacaciones') IS NULL
BEGIN
    ALTER TABLE dbo.AspNetUsers ADD vacaciones BIT NOT NULL
        CONSTRAINT DF_AspNetUsers_Vacaciones DEFAULT (0);
END
GO

/* Los registros existentes son de PACO y no son suplentes principales hasta
   que un administrador lo indique expresamente. */
IF COL_LENGTH('dbo.tbl_correo_relacionados', 'app') IS NULL
BEGIN
    ALTER TABLE dbo.tbl_correo_relacionados ADD app NVARCHAR(50) NOT NULL
        CONSTRAINT DF_CorreoRelacionados_App DEFAULT (N'PACO');
END
GO

IF COL_LENGTH('dbo.tbl_correo_relacionados', 'EsSuplentePrincipal') IS NULL
BEGIN
    IF COL_LENGTH('dbo.tbl_correo_relacionados', 'esdestinatarioprincipalsuplente') IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE object_id = OBJECT_ID(N'dbo.tbl_correo_relacionados')
              AND name = N'UX_CorreoRelacionados_SuplentePrincipal'
        )
            DROP INDEX UX_CorreoRelacionados_SuplentePrincipal
                ON dbo.tbl_correo_relacionados;
        EXEC sp_rename
            N'dbo.tbl_correo_relacionados.esdestinatarioprincipalsuplente',
            N'EsSuplentePrincipal', N'COLUMN';
    END
    ELSE
        ALTER TABLE dbo.tbl_correo_relacionados
            ADD EsSuplentePrincipal BIT NOT NULL
            CONSTRAINT DF_CorreoRelacionados_PrincipalSuplente DEFAULT (0);
END
GO

UPDATE dbo.AspNetUsers SET vacaciones = 0 WHERE vacaciones IS NULL;
UPDATE dbo.tbl_correo_relacionados SET app = N'PACO' WHERE NULLIF(LTRIM(RTRIM(app)), N'') IS NULL;
UPDATE dbo.tbl_correo_relacionados
SET EsSuplentePrincipal = 0
WHERE EsSuplentePrincipal IS NULL;
GO

/* Solo puede existir un suplente preferido por correo principal y aplicacion. */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.tbl_correo_relacionados')
      AND name = N'UX_CorreoRelacionados_SuplentePrincipal'
)
CREATE UNIQUE INDEX UX_CorreoRelacionados_SuplentePrincipal
    ON dbo.tbl_correo_relacionados(app, correoprincipal)
    WHERE EsSuplentePrincipal = 1;
GO

CREATE OR ALTER PROCEDURE dbo.PACO_CORREOS_RELACIONADOS_LISTAR
    @App NVARCHAR(50) = N'PACO',
    @CorreoPrincipal NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Hoy DATE = CONVERT(DATE, SYSUTCDATETIME());
    SELECT R.id, R.correoprincipal, R.correorelacionado, R.fechainicio,
           R.fechafinal, R.app, R.EsSuplentePrincipal,
           CAST(CASE WHEN R.fechainicio IS NULL OR R.fechainicio <= @Hoy
                      THEN CASE WHEN R.fechafinal IS NULL OR R.fechafinal >= @Hoy
                                THEN 1 ELSE 0 END
                      ELSE 0 END AS BIT) AS Vigente,
           CAST(ISNULL(U.vacaciones, 0) AS BIT) AS PrincipalEnVacaciones
    FROM dbo.tbl_correo_relacionados R
    LEFT JOIN dbo.AspNetUsers U
      ON LOWER(LTRIM(RTRIM(U.Email))) = LOWER(LTRIM(RTRIM(R.correoprincipal)))
    WHERE UPPER(LTRIM(RTRIM(R.app))) = UPPER(LTRIM(RTRIM(ISNULL(@App, N'PACO'))))
      AND (NULLIF(LTRIM(RTRIM(@CorreoPrincipal)), N'') IS NULL
        OR LOWER(LTRIM(RTRIM(R.correoprincipal))) = LOWER(LTRIM(RTRIM(@CorreoPrincipal))) )
    ORDER BY R.correoprincipal, R.EsSuplentePrincipal DESC,
             R.fechainicio DESC, R.id DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_CORREO_RELACIONADO_GUARDAR
    @Id INT = NULL,
    @CorreoPrincipal NVARCHAR(256),
    @CorreoRelacionado NVARCHAR(256),
    @FechaInicio DATE = NULL,
    @FechaFinal DATE = NULL,
    @App NVARCHAR(50) = N'PACO',
    @EsPrincipalSuplente BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @CorreoPrincipal = LOWER(LTRIM(RTRIM(@CorreoPrincipal)));
    SET @CorreoRelacionado = LOWER(LTRIM(RTRIM(@CorreoRelacionado)));
    SET @App = UPPER(LTRIM(RTRIM(ISNULL(NULLIF(@App, N''), N'PACO'))));

    IF NULLIF(@CorreoPrincipal, N'') IS NULL OR NULLIF(@CorreoRelacionado, N'') IS NULL
        THROW 51000, 'Los dos correos son requeridos.', 1;
    IF @CorreoPrincipal = @CorreoRelacionado
        THROW 51000, 'El correo relacionado debe ser diferente del principal.', 1;
    IF @FechaInicio IS NOT NULL AND @FechaFinal IS NOT NULL AND @FechaFinal < @FechaInicio
        THROW 51000, 'La fecha final no puede ser anterior a la fecha inicial.', 1;

    BEGIN TRAN;
    /* La actualizacion primero libera el suplente anterior para respetar el
       indice unico incluso si se intercambia el registro preferido. */
    IF @EsPrincipalSuplente = 1
        UPDATE dbo.tbl_correo_relacionados
        SET EsSuplentePrincipal = 0
        WHERE UPPER(LTRIM(RTRIM(app))) = @App
          AND LOWER(LTRIM(RTRIM(correoprincipal))) = @CorreoPrincipal
          AND (@Id IS NULL OR id <> @Id)
          AND EsSuplentePrincipal = 1;

    IF @Id IS NULL
    BEGIN
        INSERT dbo.tbl_correo_relacionados(
            correoprincipal, correorelacionado, fechainicio, fechafinal, app,
            EsSuplentePrincipal
        ) VALUES (
            @CorreoPrincipal, @CorreoRelacionado, @FechaInicio, @FechaFinal,
            @App, @EsPrincipalSuplente
        );
        SET @Id = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.tbl_correo_relacionados WHERE id = @Id)
            THROW 51000, 'El correo relacionado no existe.', 1;
        UPDATE dbo.tbl_correo_relacionados
        SET correoprincipal = @CorreoPrincipal,
            correorelacionado = @CorreoRelacionado,
            fechainicio = @FechaInicio,
            fechafinal = @FechaFinal,
            app = @App,
            EsSuplentePrincipal = @EsPrincipalSuplente
        WHERE id = @Id;
    END
    COMMIT;

    SELECT id, correoprincipal, correorelacionado, fechainicio, fechafinal,
           app, EsSuplentePrincipal
    FROM dbo.tbl_correo_relacionados WHERE id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_CORREO_RELACIONADO_ELIMINAR @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.tbl_correo_relacionados WHERE id = @Id;
    IF @@ROWCOUNT = 0 THROW 51000, 'El correo relacionado no existe.', 1;
    SELECT @Id AS IdEliminado;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_USUARIO_VACACIONES_GUARDAR
    @UsuarioId NVARCHAR(450), @Vacaciones BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.AspNetUsers SET vacaciones = @Vacaciones WHERE Id = @UsuarioId;
    IF @@ROWCOUNT = 0 THROW 51000, 'El usuario no existe.', 1;
    SELECT Id, Email, CAST(vacaciones AS BIT) vacaciones
    FROM dbo.AspNetUsers WHERE Id = @UsuarioId;
END
GO

CREATE OR ALTER PROCEDURE dbo.PACO_USUARIO_VACACIONES_GUARDAR_POR_CORREO
    @Correo NVARCHAR(256), @Vacaciones BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.AspNetUsers
    SET vacaciones = @Vacaciones
    WHERE LOWER(LTRIM(RTRIM(Email))) = LOWER(LTRIM(RTRIM(@Correo)));
    IF @@ROWCOUNT = 0 THROW 51000, 'No existe un usuario con ese correo.', 1;
    SELECT Id, Email, CAST(vacaciones AS BIT) vacaciones
    FROM dbo.AspNetUsers
    WHERE LOWER(LTRIM(RTRIM(Email))) = LOWER(LTRIM(RTRIM(@Correo)));
END
GO

/* Esta consulta no modifica el ticket: decide el destinatario efectivo justo
   antes de enviar. Si no hay vacaciones, suplente o vigencia, conserva el
   correo original. */
CREATE OR ALTER PROCEDURE dbo.PACO_CORREO_RELACIONADO_RESOLVER
    @CorreoPrincipal NVARCHAR(256), @App NVARCHAR(50) = N'PACO'
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Principal NVARCHAR(256) = LOWER(LTRIM(RTRIM(@CorreoPrincipal)));
    DECLARE @Aplicacion NVARCHAR(50) = UPPER(LTRIM(RTRIM(ISNULL(NULLIF(@App, N''), N'PACO'))));
    DECLARE @Hoy DATE = CONVERT(DATE, SYSUTCDATETIME());

    SELECT TOP (1)
        COALESCE(R.correorelacionado, @Principal) CorreoDestino,
        @Principal CorreoPrincipal,
        R.id IdCorreoRelacionado,
        CAST(CASE WHEN R.id IS NULL THEN 0 ELSE 1 END AS BIT) UsaSuplente
    FROM (SELECT @Principal CorreoPrincipal) P
    LEFT JOIN dbo.AspNetUsers U
      ON LOWER(LTRIM(RTRIM(U.Email))) = P.CorreoPrincipal
     AND ISNULL(U.vacaciones, 0) = 1
    OUTER APPLY (
        SELECT TOP (1) X.id, X.correorelacionado
        FROM dbo.tbl_correo_relacionados X
        WHERE U.Id IS NOT NULL
          AND LOWER(LTRIM(RTRIM(X.correoprincipal))) = P.CorreoPrincipal
          AND UPPER(LTRIM(RTRIM(X.app))) = @Aplicacion
          AND X.EsSuplentePrincipal = 1
          AND (X.fechainicio IS NULL OR X.fechainicio <= @Hoy)
          AND (X.fechafinal IS NULL OR X.fechafinal >= @Hoy)
        ORDER BY X.fechainicio DESC, X.id DESC
    ) R;
END
GO
