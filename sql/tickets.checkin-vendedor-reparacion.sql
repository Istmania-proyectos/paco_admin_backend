/* Instalar despues de tickets.automatizacion-checkin.sql.
   Ejecutar primero en simulacion y revisar los destinatarios:
     EXEC dbo.PACO_TICKET_CHECKIN_REASIGNAR_VENDEDOR @Ejecutar=0;
   Para aplicar un ticket revisado:
     EXEC dbo.PACO_TICKET_CHECKIN_REASIGNAR_VENDEDOR @Ejecutar=1, @IdTicket=123;
   No envia correos. Los enlaces anteriores se invalidan si cambia el responsable.
   Los tickets pendientes de cierre necesitan un nuevo enlace del flujo habitual. */
CREATE OR ALTER PROCEDURE dbo.PACO_TICKET_CHECKIN_REASIGNAR_VENDEDOR
    @Ejecutar BIT = 0,
    @IdTicket BIGINT = NULL,
    @Formulario INT = 14,
    @UsuarioSistema NVARCHAR(450) = N'CORRECCION_VENDEDOR_CHECKIN'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;
    SELECT T.IdTicket, T.NumeroTicket, T.Estado,
           T.CodigoCliente,
           T.CodigoVendedor CodigoAnterior, T.NombreVendedor NombreAnterior,
           T.CorreoVendedor CorreoAnterior,
           V.codigo_vendedor CodigoVendedor, V.nombre_vendedor NombreVendedor,
           V.correo_vendedor CorreoVendedor,
           CASE
               WHEN V.cantidad_asignaciones_sap > 1 OR V.cantidad_vendedores > 1
                   THEN 'VENDEDOR_AMBIGUO'
               WHEN V.cantidad_asignaciones_sap = 0 THEN 'SIN_VENDEDOR_CLIENTE'
               WHEN V.cantidad_vendedores = 0 OR V.codigo_vendedor IS NULL
                   THEN 'SIN_VENDEDOR_MAESTRO'
               WHEN V.correo_vendedor IS NULL THEN 'VENDEDOR_SIN_CORREO'
               WHEN ISNULL(T.CodigoVendedor, '') = V.codigo_vendedor
                AND ISNULL(T.NombreVendedor, '') = ISNULL(V.nombre_vendedor, '')
                AND ISNULL(T.CorreoVendedor, '') = V.correo_vendedor
                   THEN 'SIN_CAMBIOS'
               ELSE 'LISTO_CORREGIR'
           END EstadoResultado
    INTO #Correcciones
    FROM dbo.tbl_Ticket T WITH (UPDLOCK, HOLDLOCK)
    CROSS APPLY dbo.PACO_TICKET_VENDEDOR_CLIENTE(T.CodigoCliente) V
    WHERE T.SistemaOrigen = 'CHECKIN' AND T.IdFormularioOrigen = @Formulario
      AND T.Activo = 1 AND T.EsDemo = 0
      AND (@IdTicket IS NULL OR T.IdTicket = @IdTicket);

    IF @Ejecutar = 1
    BEGIN
        UPDATE V SET FechaUso = SYSUTCDATETIME()
        FROM dbo.tbl_Ticket_Token_Vendedor V
        JOIN #Correcciones C ON C.IdTicket = V.IdTicket
        WHERE C.EstadoResultado = 'LISTO_CORREGIR' AND V.FechaUso IS NULL
          AND (ISNULL(C.CodigoAnterior, '') <> C.CodigoVendedor
            OR ISNULL(C.CorreoAnterior, '') <> C.CorreoVendedor);

        INSERT dbo.tbl_Ticket_Historial (
            IdTicket, EstadoAnterior, EstadoNuevo, Accion, Comentario,
            UsuarioId, NombreUsuario, RolUsuario
        )
        SELECT IdTicket, Estado, Estado, 'REASIGNAR_VENDEDOR',
               CONCAT(N'Responsable resuelto por cliente ', CodigoCliente,
                      N'. Anterior: ', CodigoAnterior, N' / ', CorreoAnterior,
                      N'. Nuevo: ', CodigoVendedor, N' / ', CorreoVendedor),
               @UsuarioSistema, @UsuarioSistema, 'SISTEMA'
        FROM #Correcciones WHERE EstadoResultado = 'LISTO_CORREGIR';

        UPDATE T SET CodigoVendedor = C.CodigoVendedor,
                     NombreVendedor = C.NombreVendedor,
                     CorreoVendedor = C.CorreoVendedor,
                     FechaActualizacion = SYSUTCDATETIME()
        FROM dbo.tbl_Ticket T JOIN #Correcciones C ON C.IdTicket = T.IdTicket
        WHERE C.EstadoResultado = 'LISTO_CORREGIR';
    END
    COMMIT;

    SELECT *, CONVERT(BIT, CASE WHEN @Ejecutar=1 AND EstadoResultado='LISTO_CORREGIR'
                               THEN 1 ELSE 0 END) Aplicado
    FROM #Correcciones ORDER BY IdTicket;
END
GO
