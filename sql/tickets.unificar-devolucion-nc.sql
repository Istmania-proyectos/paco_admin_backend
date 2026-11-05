/*
  Migración opcional para unificar también el código de los planes históricos.
  Ejecutar después de tickets.sql. La aplicación acepta NOTA_CREDITO como alias
  de DEVOLUCION y muestra ambos como Devolución/NC (nota crédito).
  No modifica el historial ni la auditoría de solicitudes.
*/
SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE dbo.tbl_Ticket_Plan_Accion
SET TipoAccion = 'DEVOLUCION'
WHERE TipoAccion = 'NOTA_CREDITO';

COMMIT TRANSACTION;
