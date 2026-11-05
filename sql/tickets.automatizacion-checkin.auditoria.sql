/* Auditoria global de solo lectura para los tickets CheckIn con dependencia.
   Las tablas temporales desaparecen al cerrar la sesion. No invoca GET de
   productos porque ese procedimiento puede sincronizar y escribir productos.
   OTRA_DEPENDENCIA confirma detalles de otro grupo; un origen eliminado no
   permite clasificar el detalle y se informa por separado. */
SET NOCOUNT ON;

SELECT T.IdTicket, T.NumeroTicket, T.Estado, T.Activo, T.EsDemo,
       T.DependenciaRespuesta, D.IdTicketDetalle, D.IdDetalleOrigen,
       D.Respuesta, D.IdPreguntaOrigen, D.Valor,
       R.creado AS FechaFormulario,
       CONVERT(NVARCHAR(200), COALESCE(
           NULLIF(CONVERT(NVARCHAR(200), R.dependencia_respuesta), ''),
           CONCAT(N'RESPUESTA:', D.Respuesta))) AS DependenciaOrigen,
       CASE WHEN R.respuesta IS NULL THEN 'ORIGEN_NO_ENCONTRADO'
            WHEN CONVERT(NVARCHAR(200), COALESCE(
                 NULLIF(CONVERT(NVARCHAR(200), R.dependencia_respuesta), ''),
                 CONCAT(N'RESPUESTA:', D.Respuesta))) COLLATE DATABASE_DEFAULT
                 = T.DependenciaRespuesta COLLATE DATABASE_DEFAULT
                 THEN 'MISMA_DEPENDENCIA'
            ELSE 'OTRA_DEPENDENCIA' END AS Diagnostico
INTO #AuditoriaDetalles
FROM dbo.tbl_Ticket T
JOIN dbo.tbl_Ticket_Detalle D ON D.IdTicket = T.IdTicket
LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuestas] R
    ON R.respuesta = D.Respuesta
WHERE T.SistemaOrigen = 'CHECKIN'
  AND T.DependenciaRespuesta IS NOT NULL;

SELECT P.IdTicket, P.IdTicketProducto, P.CodigoArticulo, P.Estado,
       (SELECT COUNT(*) FROM dbo.tbl_Ticket_Plan_Accion A
        WHERE A.IdTicketProducto = P.IdTicketProducto) AS Planes,
       (SELECT COUNT(*) FROM dbo.tbl_Ticket_Historial H
        WHERE H.IdTicketProducto = P.IdTicketProducto) AS Eventos
INTO #AuditoriaProductos
FROM dbo.tbl_Ticket_Producto P
WHERE EXISTS (
    SELECT 1 FROM #AuditoriaDetalles D
    WHERE D.IdTicket = P.IdTicket
      AND D.IdDetalleOrigen = P.IdDetalleOrigenInicio
      AND D.Diagnostico = 'OTRA_DEPENDENCIA'
);

SELECT
    (SELECT COUNT(*) FROM dbo.tbl_Ticket
     WHERE SistemaOrigen = 'CHECKIN' AND DependenciaRespuesta IS NOT NULL) AS TicketsRevisados,
    COUNT(DISTINCT CASE WHEN Diagnostico = 'OTRA_DEPENDENCIA' THEN IdTicket END) AS TicketsAfectados,
    COUNT(CASE WHEN Diagnostico = 'OTRA_DEPENDENCIA' THEN 1 END) AS DetallesAjenos,
    COUNT(CASE WHEN Diagnostico = 'OTRA_DEPENDENCIA' AND IdPreguntaOrigen = 47 THEN 1 END) AS ArticulosAjenos,
    COUNT(CASE WHEN Diagnostico = 'ORIGEN_NO_ENCONTRADO' THEN 1 END) AS DetallesSinOrigen,
    (SELECT COUNT(*) FROM #AuditoriaProductos) AS ProductosAjenosMaterializados,
    (SELECT COUNT(*) FROM #AuditoriaProductos WHERE Planes > 0 OR Eventos > 0) AS ProductosAjenosConActividad
FROM #AuditoriaDetalles;

SELECT D.IdTicket, D.NumeroTicket, D.Estado, D.Activo, D.EsDemo,
       D.DependenciaRespuesta,
       COUNT(*) AS DetallesAjenos,
       COUNT(DISTINCT D.Respuesta) AS RespuestasAjenas,
       COUNT(CASE WHEN D.IdPreguntaOrigen = 47 THEN 1 END) AS ArticulosAjenos,
       (SELECT COUNT(*) FROM #AuditoriaProductos P WHERE P.IdTicket = D.IdTicket) AS ProductosAjenosMaterializados,
       (SELECT COUNT(*) FROM #AuditoriaProductos P WHERE P.IdTicket = D.IdTicket AND (P.Planes > 0 OR P.Eventos > 0)) AS ProductosAjenosConActividad,
       (SELECT COUNT(*) FROM dbo.tbl_Ticket_Plan_Accion A WHERE A.IdTicket = D.IdTicket) AS PlanesDelTicket
FROM #AuditoriaDetalles D
WHERE D.Diagnostico = 'OTRA_DEPENDENCIA'
GROUP BY D.IdTicket, D.NumeroTicket, D.Estado, D.Activo, D.EsDemo, D.DependenciaRespuesta
ORDER BY D.IdTicket;

SELECT IdTicket, NumeroTicket, Respuesta, IdDetalleOrigen,
       Valor AS Articulo, FechaFormulario, DependenciaOrigen,
       DependenciaRespuesta AS DependenciaTicket
FROM #AuditoriaDetalles
WHERE Diagnostico = 'OTRA_DEPENDENCIA' AND IdPreguntaOrigen = 47
ORDER BY IdTicket, Respuesta, IdDetalleOrigen;

SELECT * FROM #AuditoriaProductos WHERE Planes > 0 OR Eventos > 0
ORDER BY IdTicket, IdTicketProducto;

SELECT DISTINCT IdTicket, NumeroTicket, Respuesta
FROM #AuditoriaDetalles WHERE Diagnostico = 'ORIGEN_NO_ENCONTRADO'
ORDER BY IdTicket, Respuesta;

DROP TABLE #AuditoriaProductos;
DROP TABLE #AuditoriaDetalles;
