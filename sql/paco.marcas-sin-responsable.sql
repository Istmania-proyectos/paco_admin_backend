SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.tbl_Marca_Asignacion_Rechazo', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Marca_Asignacion_Rechazo
    (
        Id INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_tbl_Marca_Asignacion_Rechazo PRIMARY KEY,
        Marca NVARCHAR(100) NOT NULL,
        UserId NVARCHAR(450) NOT NULL,
        FechaRespuesta DATETIME NOT NULL
            CONSTRAINT DF_tbl_Marca_Asignacion_Rechazo_FechaRespuesta
            DEFAULT GETDATE(),
        CONSTRAINT UQ_tbl_Marca_Asignacion_Rechazo_Marca_User
            UNIQUE (Marca, UserId),
        CONSTRAINT FK_tbl_Marca_Asignacion_Rechazo_AspNetUsers
            FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id)
    );
END;
GO

-- Repara pedidos que quedaron sin tarea antes de que su marca tuviera responsable.
INSERT INTO dbo.tbl_Pedido_Usuario
(
    UserId,
    IdPedido,
    IdDetallePedido,
    DescAutorizado,
    Marca,
    FechaCreacion,
    EstadoNotificacion,
    Tipo,
    NombreCliente,
    LimiteDescuento
)
SELECT
    CU.UserId,
    D.PedidoID_ID,
    D.ID,
    D.discountAU,
    LTRIM(RTRIM(A.Marca)),
    ISNULL(P.fechacreacion, GETDATE()),
    1,
    N'DESCUENTO_AD',
    P.NombreCliente,
    CONVERT(INT, CU.LimiteDescuento)
FROM PACO_S4HANA.dbo.entityDetallePedidoes D
INNER JOIN PACO_S4HANA.dbo.entityPedidoes P ON P.ID = D.PedidoID_ID
INNER JOIN PACO_S4HANA.dbo.APP_ARTICULO A ON A.ItemCode = D.ItemCode
INNER JOIN dbo.tbl_Vendedor V ON V.id_sap_vendedor = P.slpcode
INNER JOIN dbo.tbl_Casa_Usuario CU
    ON CU.Marca = LTRIM(RTRIM(A.Marca)) COLLATE SQL_Latin1_General_CP1_CI_AS
   AND ISNULL(CU.Activo, 1) = 1
WHERE D.discountAU > 0
  AND D.AutorizadoDetalle IS NULL
  AND V.aplica_desc_adicional = 1
  AND NOT EXISTS
  (
      SELECT 1
      FROM dbo.tbl_Pedido_Usuario PU
      WHERE PU.UserId = CU.UserId
        AND PU.IdPedido = D.PedidoID_ID
        AND PU.IdDetallePedido = D.ID
        AND PU.Tipo = N'DESCUENTO_AD'
  );
GO

IF OBJECT_ID(N'dbo.PACO_GET_MARCAS_SIN_RESPONSABLE', N'P') IS NOT NULL
    DROP PROCEDURE dbo.PACO_GET_MARCAS_SIN_RESPONSABLE;
GO

CREATE PROCEDURE dbo.PACO_GET_MARCAS_SIN_RESPONSABLE
    @UserId NVARCHAR(450)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MAX(NULLIF(LTRIM(RTRIM(A.Casa)), '')) AS Casa,
        LTRIM(RTRIM(A.Marca)) AS Marca,
        COUNT(DISTINCT D.PedidoID_ID) AS PedidosPendientes,
        COUNT(*) AS ArticulosPendientes,
        MIN(P.fechaDocumento) AS PedidoMasAntiguo
    FROM PACO_S4HANA.dbo.entityDetallePedidoes D
    INNER JOIN PACO_S4HANA.dbo.entityPedidoes P
        ON P.ID = D.PedidoID_ID
    INNER JOIN PACO_S4HANA.dbo.APP_ARTICULO A
        ON A.ItemCode = D.ItemCode
    INNER JOIN dbo.tbl_Vendedor V
        ON V.id_sap_vendedor = P.slpcode
    WHERE D.discountAU > 0
      AND D.AutorizadoDetalle IS NULL
      AND V.aplica_desc_adicional = 1
      AND NULLIF(LTRIM(RTRIM(A.Marca)), '') IS NOT NULL
      AND EXISTS
      (
          SELECT 1
          FROM dbo.tbl_Casa_Usuario Autorizador
          WHERE Autorizador.UserId = @UserId
            AND ISNULL(Autorizador.Activo, 1) = 1
      )
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.tbl_Casa_Usuario CU
          WHERE CU.Marca = LTRIM(RTRIM(A.Marca)) COLLATE SQL_Latin1_General_CP1_CI_AS
            AND ISNULL(CU.Activo, 1) = 1
      )
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.tbl_Marca_Asignacion_Rechazo R
          WHERE R.UserId = @UserId
            AND R.Marca = LTRIM(RTRIM(A.Marca)) COLLATE SQL_Latin1_General_CP1_CI_AS
      )
    GROUP BY LTRIM(RTRIM(A.Marca))
    ORDER BY MIN(P.fechaDocumento), LTRIM(RTRIM(A.Marca));
END;
GO

IF OBJECT_ID(N'dbo.PACO_RESPONDER_MARCA', N'P') IS NOT NULL
    DROP PROCEDURE dbo.PACO_RESPONDER_MARCA;
GO

CREATE PROCEDURE dbo.PACO_RESPONDER_MARCA
    @UserId NVARCHAR(450),
    @Marca NVARCHAR(100),
    @Aceptar BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Marca = LTRIM(RTRIM(@Marca));

    IF NOT EXISTS (SELECT 1 FROM dbo.AspNetUsers WHERE Id = @UserId)
    BEGIN
        RAISERROR('El usuario autenticado no existe.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.tbl_Casa_Usuario
        WHERE UserId = @UserId
          AND ISNULL(Activo, 1) = 1
    )
    BEGIN
        RAISERROR('El usuario no es autorizador de marcas.', 16, 1);
        RETURN;
    END;

    IF @Aceptar = 0
    BEGIN
        IF NOT EXISTS
        (
            SELECT 1
            FROM dbo.tbl_Casa_Usuario
            WHERE Marca = @Marca
              AND ISNULL(Activo, 1) = 1
        )
        BEGIN
            IF EXISTS
            (
                SELECT 1
                FROM dbo.tbl_Marca_Asignacion_Rechazo
                WHERE Marca = @Marca AND UserId = @UserId
            )
                UPDATE dbo.tbl_Marca_Asignacion_Rechazo
                   SET FechaRespuesta = GETDATE()
                 WHERE Marca = @Marca AND UserId = @UserId;
            ELSE
                INSERT INTO dbo.tbl_Marca_Asignacion_Rechazo
                    (Marca, UserId, FechaRespuesta)
                VALUES
                    (@Marca, @UserId, GETDATE());
        END;

        SELECT @Marca AS Marca, CAST(0 AS BIT) AS Asignada,
               N'La marca dejará de mostrarse a este usuario.' AS Mensaje;
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @ResultadoBloqueo INT;
        DECLARE @RecursoBloqueo NVARCHAR(255) = N'PACO_MARCA_' + @Marca;
        EXEC @ResultadoBloqueo = sys.sp_getapplock
            @Resource = @RecursoBloqueo,
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 5000;

        IF @ResultadoBloqueo < 0
            RAISERROR('No fue posible bloquear la marca para asignarla.', 16, 1);

        IF EXISTS
        (
            SELECT 1
            FROM dbo.tbl_Casa_Usuario WITH (UPDLOCK, HOLDLOCK)
            WHERE Marca = @Marca
              AND ISNULL(Activo, 1) = 1
        )
            RAISERROR('La marca ya fue asignada a otro usuario.', 16, 1);

        DECLARE @Casa NVARCHAR(100);
        DECLARE @LimiteDescuento REAL;

        SELECT TOP (1) @Casa = LTRIM(RTRIM(A.Casa))
        FROM PACO_S4HANA.dbo.entityDetallePedidoes D
        INNER JOIN PACO_S4HANA.dbo.entityPedidoes P ON P.ID = D.PedidoID_ID
        INNER JOIN PACO_S4HANA.dbo.APP_ARTICULO A ON A.ItemCode = D.ItemCode
        INNER JOIN dbo.tbl_Vendedor V ON V.id_sap_vendedor = P.slpcode
        WHERE D.discountAU > 0
          AND D.AutorizadoDetalle IS NULL
          AND V.aplica_desc_adicional = 1
          AND LTRIM(RTRIM(A.Marca)) = @Marca COLLATE SQL_Latin1_General_CP1_CI_AS;

        IF @Casa IS NULL
            RAISERROR('La marca ya no tiene artículos pendientes de autorización.', 16, 1);

        SELECT @LimiteDescuento = MAX(LimiteDescuento)
        FROM dbo.tbl_Casa_Usuario
        WHERE UserId = @UserId
          AND ISNULL(Activo, 1) = 1;

        INSERT INTO dbo.tbl_Casa_Usuario
            (UserId, Casa, Marca, LimiteDescuento, FechaCreacion, Activo)
        VALUES
            (@UserId, @Casa, @Marca, @LimiteDescuento, GETDATE(), 1);

        INSERT INTO dbo.tbl_Pedido_Usuario
        (
            UserId,
            IdPedido,
            IdDetallePedido,
            DescAutorizado,
            Marca,
            FechaCreacion,
            EstadoNotificacion,
            Tipo,
            NombreCliente,
            LimiteDescuento
        )
        SELECT
            @UserId,
            D.PedidoID_ID,
            D.ID,
            D.discountAU,
            @Marca,
            ISNULL(P.fechacreacion, GETDATE()),
            1,
            N'DESCUENTO_AD',
            P.NombreCliente,
            CONVERT(INT, @LimiteDescuento)
        FROM PACO_S4HANA.dbo.entityDetallePedidoes D
        INNER JOIN PACO_S4HANA.dbo.entityPedidoes P ON P.ID = D.PedidoID_ID
        INNER JOIN PACO_S4HANA.dbo.APP_ARTICULO A ON A.ItemCode = D.ItemCode
        INNER JOIN dbo.tbl_Vendedor V ON V.id_sap_vendedor = P.slpcode
        WHERE D.discountAU > 0
          AND D.AutorizadoDetalle IS NULL
          AND V.aplica_desc_adicional = 1
          AND LTRIM(RTRIM(A.Marca)) = @Marca COLLATE SQL_Latin1_General_CP1_CI_AS
          AND NOT EXISTS
          (
              SELECT 1
              FROM dbo.tbl_Pedido_Usuario PU
              WHERE PU.UserId = @UserId
                AND PU.IdPedido = D.PedidoID_ID
                AND PU.IdDetallePedido = D.ID
                AND PU.Tipo = N'DESCUENTO_AD'
          );

        DELETE FROM dbo.tbl_Marca_Asignacion_Rechazo WHERE Marca = @Marca;

        COMMIT TRANSACTION;

        SELECT @Marca AS Marca, CAST(1 AS BIT) AS Asignada,
               N'La marca fue asignada y sus pedidos pendientes ya están disponibles.' AS Mensaje;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        DECLARE @Mensaje NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Mensaje, 16, 1);
    END CATCH;
END;
GO
