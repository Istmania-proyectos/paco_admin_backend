/* Amplia el tipo de pregunta importado desde CheckIn sin tocar datos. */
ALTER TABLE dbo.tbl_Ticket_Detalle
ALTER COLUMN TipoRespuesta VARCHAR(250) NULL;
GO
