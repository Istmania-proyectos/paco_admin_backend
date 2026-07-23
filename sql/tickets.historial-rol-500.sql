/* Corrige la auditoria para usuarios con varios roles de tickets. */
ALTER TABLE dbo.tbl_Ticket_Historial
ALTER COLUMN RolUsuario NVARCHAR(500) NULL;
GO
