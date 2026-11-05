/* Regresion de la resolucion instalada. Solo crea tablas temporales.
   Ejecutar despues de tickets.automatizacion-checkin.sql. */
SET NOCOUNT ON;
DECLARE @Definition NVARCHAR(MAX) = OBJECT_DEFINITION(
    OBJECT_ID(N'dbo.PACO_TICKET_VENDEDOR_CLIENTE'));
DECLARE @Start INT = CHARINDEX(N'SELECT S.cantidad_asignaciones_sap', @Definition);
IF @Definition IS NULL OR @Start = 0
    THROW 51000, 'No se encontro la funcion de vendedor por cliente.', 1;

CREATE TABLE #Clientes (CardCode NVARCHAR(50), SlpCode NVARCHAR(50));
CREATE TABLE #Vendedores (
    id_sap_vendedor VARCHAR(10), codigo_vendedor VARCHAR(10),
    nombre_vendedor NVARCHAR(120), email NVARCHAR(200)
);
CREATE TABLE #Actual (
    cantidad_asignaciones_sap INT, cantidad_vendedores INT,
    codigo_vendedor VARCHAR(10), nombre_vendedor NVARCHAR(120),
    correo_vendedor NVARCHAR(200)
);
INSERT #Clientes VALUES
    (N'0005007733', N'T07'), (N'0005007733', N'T07'),
    (N'AMBIGUO', N'T07'), (N'AMBIGUO', N'T08'),
    (N'SIN_MAESTRO', N'T99'), (N'SIN_CORREO', N'T09'),
    (N'VACIO', NULL);
INSERT #Vendedores VALUES
    ('T07', 'V07', N'Vendedor del cliente', N'vendedor@example.test'),
    ('T08', 'V08', N'Otro vendedor', N'otro@example.test'),
    ('T09', 'V09', N'Sin correo', N'  '),
    ('IM2001', 'IM2001', N'Impulsadora remitente', N'impulsadora@example.test');

-- Ejecuta el SELECT real de la funcion con fuentes temporales.
DECLARE @Query NVARCHAR(MAX) = N'INSERT #Actual ' + SUBSTRING(
    @Definition, @Start, CHARINDEX(N');', @Definition, @Start) - @Start);
SET @Query = REPLACE(@Query, N'[PACO_S4HANA].dbo.APP_CLIENTES_S4', N'#Clientes');
SET @Query = REPLACE(@Query, N'dbo.tbl_Vendedor', N'#Vendedores');
EXEC sys.sp_executesql @Query, N'@Cliente NVARCHAR(50)', @Cliente=N'0005007733';
IF (SELECT COUNT(*) FROM #Actual) <> 1 OR NOT EXISTS (
    SELECT 1 FROM #Actual WHERE cantidad_asignaciones_sap=1 AND cantidad_vendedores=1
      AND codigo_vendedor='V07' AND correo_vendedor=N'vendedor@example.test'
)
    THROW 51000, 'Debe usar el vendedor del cliente, no IM2001, sin duplicar por filas SAP repetidas.', 1;

TRUNCATE TABLE #Actual;
EXEC sys.sp_executesql @Query, N'@Cliente NVARCHAR(50)', @Cliente=N'AMBIGUO';
IF NOT EXISTS (SELECT 1 FROM #Actual WHERE cantidad_asignaciones_sap=2 AND cantidad_vendedores=0)
    THROW 51000, 'No debe escoger arbitrariamente entre dos vendedores del cliente.', 1;

TRUNCATE TABLE #Actual;
EXEC sys.sp_executesql @Query, N'@Cliente NVARCHAR(50)', @Cliente=N'INEXISTENTE';
IF NOT EXISTS (SELECT 1 FROM #Actual WHERE cantidad_asignaciones_sap=0 AND cantidad_vendedores=0)
    THROW 51000, 'Un cliente inexistente debe quedar sin vendedor.', 1;

TRUNCATE TABLE #Actual;
EXEC sys.sp_executesql @Query, N'@Cliente NVARCHAR(50)', @Cliente=N'SIN_MAESTRO';
IF NOT EXISTS (SELECT 1 FROM #Actual WHERE cantidad_asignaciones_sap=1 AND cantidad_vendedores=0)
    THROW 51000, 'SlpCode sin maestro no debe usar los datos del remitente.', 1;

TRUNCATE TABLE #Actual;
EXEC sys.sp_executesql @Query, N'@Cliente NVARCHAR(50)', @Cliente=N'SIN_CORREO';
IF NOT EXISTS (SELECT 1 FROM #Actual WHERE cantidad_vendedores=1 AND correo_vendedor IS NULL)
    THROW 51000, 'Un correo vacio debe quedar visible como faltante.', 1;

TRUNCATE TABLE #Actual;
EXEC sys.sp_executesql @Query, N'@Cliente NVARCHAR(50)', @Cliente=N'VACIO';
IF NOT EXISTS (SELECT 1 FROM #Actual WHERE cantidad_vendedores=0)
    THROW 51000, 'Una asignacion vacia no debe generar un responsable.', 1;

DROP TABLE #Actual;
DROP TABLE #Vendedores;
DROP TABLE #Clientes;
PRINT 'OK: vendedor por cliente, duplicados, ambiguedad y datos faltantes.';
