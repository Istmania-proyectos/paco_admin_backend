/*
  Prueba de regresion del reporte de tickets por producto.

  Ejecutar despues de tickets.sql y tickets-productos-flujo.sql. La prueba
  crea datos controlados dentro de una transaccion que siempre se revierte.
*/
SET XACT_ABORT ON;
GO

BEGIN TRY
    BEGIN TRAN;

    DECLARE @Creado TABLE (
        IdTicket BIGINT NOT NULL,
        NumeroTicket VARCHAR(30) NOT NULL,
        Estado VARCHAR(30) NOT NULL
    );
    DECLARE @Reporte TABLE (
        IdTicket BIGINT NOT NULL,
        NumeroTicket VARCHAR(30) NOT NULL,
        CodigoCliente VARCHAR(50) NULL,
        NombreCliente NVARCHAR(200) NULL,
        CodigoVendedor VARCHAR(50) NULL,
        NombreVendedor NVARCHAR(200) NULL,
        Titulo NVARCHAR(250) NULL,
        Prioridad VARCHAR(20) NULL,
        Estado VARCHAR(40) NULL,
        FechaCreacion DATETIME2(3) NULL,
        FechaVencimiento DATE NULL,
        ProductoNumero INT NULL,
        CodigoArticulo NVARCHAR(100) NULL,
        Articulo NVARCHAR(500) NULL,
        Marca NVARCHAR(200) NULL,
        Lote NVARCHAR(250) NULL,
        FechaVencimientoProducto DATE NULL,
        Cantidad DECIMAL(18,3) NULL,
        EstadoProducto VARCHAR(40) NULL,
        Motivo VARCHAR(50) NULL,
        PlanAccion NVARCHAR(MAX) NULL,
        FechaCompromiso DATE NULL
    );
    DECLARE @Ticket BIGINT;
    DECLARE @Json NVARCHAR(MAX) = N'{
      "sistemaOrigen":"PRUEBA_REPORTE_PRODUCTO",
      "idRespuestaOrigen":987654321,
      "idFormularioOrigen":14,
      "codigoCliente":"PRUEBA",
      "nombreCliente":"Cliente de prueba",
      "codigoVendedor":"PRUEBA",
      "nombreVendedor":"Vendedor de prueba",
      "correoVendedor":"prueba@example.test",
      "tipoTicket":"PRODUCTO_PROXIMO_VENCER",
      "titulo":"Prueba vencimiento por producto",
      "prioridad":"NORMAL",
      "detalles":[
        {"idDetalleOrigen":1,"respuesta":987654321,"idPreguntaOrigen":45,"pregunta":"Casa","tipoRespuesta":"TEXTO","valor":"CASA"},
        {"idDetalleOrigen":2,"respuesta":987654321,"idPreguntaOrigen":46,"pregunta":"Marca","tipoRespuesta":"TEXTO","valor":"MARCA"},
        {"idDetalleOrigen":3,"respuesta":987654321,"idPreguntaOrigen":47,"pregunta":"Articulo","tipoRespuesta":"TEXTO","valor":"ART-001,Articulo de prueba"},
        {"idDetalleOrigen":4,"respuesta":987654321,"idPreguntaOrigen":48,"pregunta":"Fecha reportada por producto","tipoRespuesta":"FECHA","valor":"10/10/2026"},
        {"idDetalleOrigen":5,"respuesta":987654321,"idPreguntaOrigen":49,"pregunta":"Cantidad","tipoRespuesta":"NUMERO","valor":"60"},
        {"idDetalleOrigen":6,"respuesta":987654321,"idPreguntaOrigen":1341,"pregunta":"Lote","tipoRespuesta":"TEXTO","valor":"LOTE-PRUEBA"}
      ]
    }';

    INSERT @Creado
    EXEC dbo.PACO_INSERT_TICKET
        @Option = 1,
        @Param1 = @Json,
        @Param2 = N'PRUEBA_REPORTE_PRODUCTO',
        @Param3 = N'Prueba reporte producto',
        @Param4 = N'TICKET_INTEGRACION',
        @Param5 = N'';

    SELECT @Ticket = IdTicket FROM @Creado;
    EXEC dbo.PACO_TICKET_PRODUCTOS_SINCRONIZAR @IdTicket = @Ticket;

    INSERT @Reporte
    EXEC dbo.PACO_TICKET_PRODUCTOS_EXPORTAR @Buscar = N'Prueba vencimiento por producto';

    IF NOT EXISTS (
        SELECT 1
        FROM @Reporte
        WHERE IdTicket = @Ticket
          AND ProductoNumero = 1
          AND FechaVencimiento = CONVERT(DATE, '20261010', 112)
    )
        THROW 51000,
            'El reporte debe exponer el vencimiento de cada producto en FechaVencimiento.',
            1;

    ROLLBACK;
    PRINT 'OK: el reporte expone el vencimiento de cada producto.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;
GO
