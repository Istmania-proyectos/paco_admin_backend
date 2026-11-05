/* Solo lectura. Ejecutar en la base de PACO Admin.
   Reemplazar el numero por el ticket afectado. No ejecuta sincronizaciones
   ni elimina productos, respuestas o planes existentes. */
DECLARE @NumeroTicket VARCHAR(30) = 'TKT-0000003569';

SELECT T.IdTicket, T.NumeroTicket, T.Estado, T.DependenciaRespuesta,
       T.JefeMarcaUsuarioId, T.FechaCreacion, T.TicketAnteriorId
FROM dbo.tbl_Ticket T
WHERE T.NumeroTicket = @NumeroTicket;

/* Cada articulo conserva la respuesta desde la que se copio.
   Una dependencia diferente confirma que el detalle pertenece a otro grupo.
   Si el origen fue eliminado, el resultado se marca como no verificable. */
SELECT D.IdTicketDetalle, D.IdDetalleOrigen, D.Respuesta,
       D.Valor AS Articulo, D.FechaCreacion AS FechaCopia,
       R.creado AS FechaFormulario, R.cliente AS ClienteOrigen,
       R.usuario AS UsuarioOrigen, R.dependencia_respuesta AS DependenciaOrigen,
       T.DependenciaRespuesta AS DependenciaTicket,
       CASE WHEN R.respuesta IS NULL THEN 'ORIGEN_NO_ENCONTRADO'
            WHEN CONVERT(NVARCHAR(200), COALESCE(
                 NULLIF(CONVERT(NVARCHAR(200), R.dependencia_respuesta), ''),
                 CONCAT(N'RESPUESTA:', D.Respuesta))) COLLATE DATABASE_DEFAULT
                 = T.DependenciaRespuesta COLLATE DATABASE_DEFAULT
                 THEN 'MISMA_DEPENDENCIA'
            ELSE 'OTRA_DEPENDENCIA' END AS Diagnostico
FROM dbo.tbl_Ticket T
JOIN dbo.tbl_Ticket_Detalle D ON D.IdTicket = T.IdTicket
LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuestas] R
    ON R.respuesta = D.Respuesta
WHERE T.NumeroTicket = @NumeroTicket
  AND D.IdPreguntaOrigen = 47
ORDER BY D.Respuesta, D.IdDetalleOrigen;

SELECT H.Fecha, H.Accion, H.Comentario
FROM dbo.tbl_Ticket_Historial H
JOIN dbo.tbl_Ticket T ON T.IdTicket = H.IdTicket
WHERE T.NumeroTicket = @NumeroTicket
ORDER BY H.Fecha, H.IdHistorial;
