/* Ejecutar al final, despues de tickets-productos-flujo.sql.
   No borra planes ni historial existentes. Jornada Honduras: lunes a viernes 08:00-17:00, sabado 08:00-12:00.
   Todas las fechas del historial se almacenan en UTC. */
SET XACT_ABORT ON;
GO
IF OBJECT_ID(N'dbo.tbl_Ticket_Horario_Laboral',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.tbl_Ticket_Horario_Laboral (
    Id TINYINT NOT NULL CONSTRAINT PK_TicketHorario PRIMARY KEY CHECK (Id=1),
    HoraInicio TIME(0) NOT NULL,
    HoraFin TIME(0) NOT NULL,
    SabadoInicio TIME(0) NOT NULL,
    SabadoFin TIME(0) NOT NULL,
    DesfaseUtcMinutos SMALLINT NOT NULL DEFAULT (-360),
    CONSTRAINT CK_TicketHorario_Jornada CHECK (HoraInicio<HoraFin AND SabadoInicio<SabadoFin),
    CONSTRAINT CK_TicketHorario_Desfase CHECK (DesfaseUtcMinutos BETWEEN -840 AND 840)
  );
END;
IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Horario_Laboral WHERE Id=1)
  INSERT dbo.tbl_Ticket_Horario_Laboral(Id,HoraInicio,HoraFin,SabadoInicio,SabadoFin,DesfaseUtcMinutos)
  VALUES(1,'08:00','17:00','08:00','12:00',-360);
GO
/* Solo rechaza NUEVOS planes de reubicacion. Los historicos se conservan. */
CREATE OR ALTER TRIGGER dbo.TR_TicketPlan_SinReubicacion
ON dbo.tbl_Ticket_Plan_Accion AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (
    SELECT 1 FROM inserted I LEFT JOIN deleted D ON D.IdPlanAccion=I.IdPlanAccion
    WHERE I.TipoAccion='REUBICACION'
      AND (D.IdPlanAccion IS NULL OR D.TipoAccion<>I.TipoAccion)
  ) THROW 51000,'Reubicacion ya no es una opcion de plan de accion.',1;
END;
GO
/* Segundos laborables exactos; independiente de DATEFIRST y del idioma.
   Jornada continua; domingo no acumula tiempo. */
CREATE OR ALTER FUNCTION dbo.PACO_TICKET_SEGUNDOS_LABORALES (
  @Desde DATETIME2(3), @Hasta DATETIME2(3),
  @Inicio TIME(0), @Fin TIME(0), @SabadoInicio TIME(0), @SabadoFin TIME(0), @Desfase SMALLINT
) RETURNS BIGINT
AS
BEGIN
  IF @Desde IS NULL OR @Hasta IS NULL OR @Inicio IS NULL OR @Fin IS NULL
    OR @Desde>=@Hasta OR @Inicio>=@Fin RETURN 0;
  DECLARE @LocalDesde DATETIME2(3)=DATEADD(MINUTE,@Desfase,@Desde),
    @LocalHasta DATETIME2(3)=DATEADD(MINUTE,@Desfase,@Hasta),@Total BIGINT=0;
  DECLARE @Dia DATE=CONVERT(DATE,@LocalDesde),@Ultimo DATE=CONVERT(DATE,@LocalHasta);
  WHILE @Dia<=@Ultimo
  BEGIN
    DECLARE @Semana INT=((DATEDIFF(DAY,CONVERT(DATE,'19000101',112),@Dia)%7)+7)%7;
    IF @Semana<6
    BEGIN
      DECLARE @Apertura TIME(0)=CASE WHEN @Semana=5 THEN @SabadoInicio ELSE @Inicio END,
        @Cierre TIME(0)=CASE WHEN @Semana=5 THEN @SabadoFin ELSE @Fin END;
      DECLARE @A DATETIME2(3)=DATEADD(SECOND,DATEDIFF(SECOND,CAST('00:00' AS TIME),@Apertura),CAST(@Dia AS DATETIME2(3))),
        @B DATETIME2(3)=DATEADD(SECOND,DATEDIFF(SECOND,CAST('00:00' AS TIME),@Cierre),CAST(@Dia AS DATETIME2(3)));
      IF @A<@LocalDesde SET @A=@LocalDesde;
      IF @B>@LocalHasta SET @B=@LocalHasta;
      IF @A<@B SET @Total=@Total+DATEDIFF_BIG(MILLISECOND,@A,@B);
    END;
    SET @Dia=DATEADD(DAY,1,@Dia);
  END;
  /* Redondea hacia arriba para detectar incluso fracciones despues del limite. */
  RETURN (@Total+999)/1000;
END;
GO
IF COL_LENGTH('dbo.tbl_Ticket_Historial','RespuestaTardia') IS NULL
  ALTER TABLE dbo.tbl_Ticket_Historial ADD RespuestaTardia BIT NULL,
    ConllevaPenalizacion BIT NULL,PlazoHoras INT NULL,
    SegundosLaborales BIGINT NULL,FechaRecepcionEtapa DATETIME2(3) NULL;
GO
/* La marca se guarda en la MISMA transaccion de la respuesta, por correo y
   bandeja. Solo las etapas de definir plan y decidir en Mercadeo tienen plazo.
   No crea un nuevo evento ni impide responder despues del limite.
   La recepcion es la asignacion a la etapa, disponible desde la bandeja;
   reenviar un enlace o responder otro producto no reinicia el reloj. */
CREATE OR ALTER TRIGGER dbo.TR_TicketHistorial_PlazoLaboral
ON dbo.tbl_Ticket_Historial AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Inicio TIME(0),@Fin TIME(0),@SabadoInicio TIME(0),@SabadoFin TIME(0),@Desfase SMALLINT;
  SELECT @Inicio=HoraInicio,@Fin=HoraFin,@SabadoInicio=SabadoInicio,@SabadoFin=SabadoFin,@Desfase=DesfaseUtcMinutos
  FROM dbo.tbl_Ticket_Horario_Laboral WHERE Id=1;
  /* Sin jornada confirmada no se generan penalizaciones arbitrarias. */
  IF @Inicio IS NULL RETURN;
  ;WITH Respuestas AS (
    SELECT I.*,CASE WHEN I.EstadoAnterior IN('PENDIENTE_PLAN','REABIERTO_URGENTE')
      AND I.Accion IN('PROPONER_PLAN','PROPONER_PLAN_SIN_MERCADEO','RECHAZAR_CERRAR_POLITICA') THEN 24
      WHEN I.EstadoAnterior='PENDIENTE_MERCADEO'
      AND I.Accion IN('APROBAR','RECHAZAR','APROBAR_MERCADEO','RECHAZAR_MERCADEO','RECHAZAR_CERRAR_POLITICA') THEN 48 END Horas
    FROM inserted I WHERE I.EstadoAnterior<>I.EstadoNuevo
  ), Medicion AS (
    SELECT R.IdHistorial,R.Horas,COALESCE(E.Fecha,T.FechaCreacion) Recibido,
      dbo.PACO_TICKET_SEGUNDOS_LABORALES(COALESCE(E.Fecha,T.FechaCreacion),R.Fecha,@Inicio,@Fin,@SabadoInicio,@SabadoFin,@Desfase) Segundos
    FROM Respuestas R JOIN dbo.tbl_Ticket T ON T.IdTicket=R.IdTicket
    OUTER APPLY (
      SELECT TOP(1) H.Fecha FROM dbo.tbl_Ticket_Historial H
      WHERE H.IdTicket=R.IdTicket AND H.IdHistorial<R.IdHistorial
        AND H.EstadoNuevo=R.EstadoAnterior
        AND (H.EstadoAnterior IS NULL OR H.EstadoAnterior<>H.EstadoNuevo)
        AND (H.IdTicketProducto=R.IdTicketProducto OR H.IdTicketProducto IS NULL)
      ORDER BY H.Fecha DESC,H.IdHistorial DESC
    ) E WHERE R.Horas IS NOT NULL
  )
  UPDATE H SET PlazoHoras=M.Horas,SegundosLaborales=M.Segundos,
    FechaRecepcionEtapa=M.Recibido,
    RespuestaTardia=IIF(M.Segundos>CAST(M.Horas AS BIGINT)*3600,1,0),
    ConllevaPenalizacion=IIF(M.Segundos>CAST(M.Horas AS BIGINT)*3600,1,0),
    Comentario=CASE WHEN M.Segundos>CAST(M.Horas AS BIGINT)*3600
      THEN CONCAT(H.Comentario,CASE WHEN NULLIF(H.Comentario,N'') IS NULL THEN N'' ELSE CHAR(13)+CHAR(10) END,
        N'Respuesta tardia: excedio el plazo de ',M.Horas,N' horas laborables. Conlleva penalizacion.')
      ELSE H.Comentario END
  FROM dbo.tbl_Ticket_Historial H JOIN Medicion M ON M.IdHistorial=H.IdHistorial;
END;
GO
