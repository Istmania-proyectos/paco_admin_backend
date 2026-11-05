/* Regresion del filtro de detalles usando el INSERT del procedimiento instalado.
   Ejecutar despues de tickets.automatizacion-checkin.sql en una base de pruebas.
   Solo escribe tablas temporales; no consulta CheckIn ni crea tickets reales. */
SET NOCOUNT ON;

DECLARE @Definition NVARCHAR(MAX) = OBJECT_DEFINITION(
    OBJECT_ID(N'dbo.PACO_TICKET_AUTOMATIZAR_CHECKIN'));
DECLARE @Start INT = CHARINDEX(N'INSERT dbo.tbl_Ticket_Detalle (', @Definition);
DECLARE @End INT = CHARINDEX(N'INSERT dbo.tbl_Ticket_Checkin_Origen (', @Definition, @Start);
IF @Definition IS NULL OR @Start IS NULL OR @Start = 0 OR @End <= @Start
    THROW 51000, 'No se encontro el bloque de detalles del procedimiento instalado.', 1;

CREATE TABLE #Base (
    respuesta_detalle BIGINT, respuesta BIGINT, pregunta INT,
    pregunta_descripcion NVARCHAR(500), tipo_pregunta VARCHAR(250),
    valor NVARCHAR(MAX), dependencia_respuesta NVARCHAR(200)
);
CREATE TABLE #Asignaciones (
    respuesta BIGINT, jefe_usuario_id NVARCHAR(450), cantidad_asignaciones INT
);
CREATE TABLE #ActualDetalles (
    IdTicket BIGINT, IdDetalleOrigen BIGINT, Respuesta BIGINT,
    IdPreguntaOrigen INT, Pregunta NVARCHAR(500), TipoRespuesta VARCHAR(250),
    Valor NVARCHAR(MAX)
);
INSERT #Base VALUES
    (1, 101, 47, N'Articulo', 'TEXTO', N'ART-A,Producto A', N'GRUPO-A'),
    (2, 102, 47, N'Articulo', 'TEXTO', N'ART-B,Producto B', N'GRUPO-B'),
    (3, 103, 47, N'Articulo', 'TEXTO', N'ART-C,Otro jefe', N'GRUPO-A'),
    (4, 104, 47, N'Articulo', 'TEXTO', N'ART-D,Asignacion ambigua', N'GRUPO-A');
INSERT #Asignaciones VALUES
    (101, N'JEFE-1', 1), (102, N'JEFE-1', 1),
    (103, N'JEFE-2', 1), (104, N'JEFE-1', 2);

DECLARE @Insert NVARCHAR(MAX) = REPLACE(
    SUBSTRING(@Definition, @Start, @End - @Start),
    N'dbo.tbl_Ticket_Detalle', N'#ActualDetalles');
DECLARE @Params NVARCHAR(MAX) = N'@IdTicket BIGINT, @Dependencia NVARCHAR(200), @JefeId NVARCHAR(450)';

EXEC sys.sp_executesql @Insert, @Params, @IdTicket=1, @Dependencia=N'GRUPO-A', @JefeId=N'JEFE-1';
EXEC sys.sp_executesql @Insert, @Params, @IdTicket=2, @Dependencia=N'GRUPO-B', @JefeId=N'JEFE-1';
-- Repetir el grupo no debe duplicar detalles.
EXEC sys.sp_executesql @Insert, @Params, @IdTicket=1, @Dependencia=N'GRUPO-A', @JefeId=N'JEFE-1';

IF (SELECT COUNT(*) FROM #ActualDetalles) <> 2
    OR NOT EXISTS (SELECT 1 FROM #ActualDetalles WHERE IdTicket=1 AND Respuesta=101)
    OR NOT EXISTS (SELECT 1 FROM #ActualDetalles WHERE IdTicket=2 AND Respuesta=102)
    THROW 51000, 'Los detalles mezclan dependencias, jefes o asignaciones ambiguas, o se duplican.', 1;

DROP TABLE #ActualDetalles;
DROP TABLE #Asignaciones;
DROP TABLE #Base;
PRINT 'OK: detalles aislados por dependencia y jefe, sin duplicados.';
