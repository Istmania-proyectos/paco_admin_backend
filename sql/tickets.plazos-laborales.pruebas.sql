/* Ejecutar despues de los scripts indicados en docs/tickets-plazos-laborales.md.
   Datos de prueba siempre revertidos. Fechas literales en UTC (Honduras UTC-6). */
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO
IF dbo.PACO_TICKET_SEGUNDOS_LABORALES('20261113T23:00:00','20261116T14:00:00','08:00','17:00','08:00','12:00',-360)<>14400
  THROW 51000,'Entre viernes 17:00 y lunes 08:00 deben contar solo las 4 horas del sabado.',1;
IF dbo.PACO_TICKET_SEGUNDOS_LABORALES('20261115T06:00:00','20261116T06:00:00','08:00','17:00','08:00','12:00',-360)<>0
  THROW 51000,'El domingo no debe acumular tiempo.',1;
IF dbo.PACO_TICKET_SEGUNDOS_LABORALES('20261113T22:00:00','20261116T15:00:00','08:00','17:00','08:00','12:00',-360)<>21600
  THROW 51000,'Viernes 16:00 a lunes 09:00 debe sumar 6 horas.',1;
IF dbo.PACO_TICKET_SEGUNDOS_LABORALES('20261113T14:00:00','20261117T16:00:00','08:00','17:00','08:00','12:00',-360)<>86400
  THROW 51000,'El limite de Marca debe ser exactamente 24 horas laborables.',1;
IF dbo.PACO_TICKET_SEGUNDOS_LABORALES('20261113T14:00:00','20261119T22:00:00','08:00','17:00','08:00','12:00',-360)<>172800
  THROW 51000,'El limite de Mercadeo debe ser exactamente 48 horas laborables.',1;
IF dbo.PACO_TICKET_PUEDE_REABRIR('20270331','20270228T05:59:59.999')<>0
  OR dbo.PACO_TICKET_PUEDE_REABRIR('20270331','20270228T06:00:00')<>1
  OR dbo.PACO_TICKET_PUEDE_REABRIR('20270331','20270401T05:59:59.999')<>1
  OR dbo.PACO_TICKET_PUEDE_REABRIR('20270331','20270401T06:00:00')<>0
  OR dbo.PACO_TICKET_PUEDE_REABRIR(NULL,'20270301T14:00:00')<>0
  OR dbo.PACO_TICKET_PUEDE_REABRIR('20280331','20280229T06:00:00')<>1
  THROW 51000,'La reapertura debe respetar el mes calendario, sus extremos y la fecha de Honduras.',1;
GO
BEGIN TRY
  BEGIN TRAN;
  DECLARE @Ticket BIGINT,@Producto1 BIGINT,@Producto2 BIGINT,@Producto3 BIGINT;
  DECLARE @Numero VARCHAR(30)=CONCAT('TEST-',LEFT(REPLACE(CONVERT(VARCHAR(36),NEWID()),'-',''),24));
  INSERT dbo.tbl_Ticket(NumeroTicket,CodigoCliente,NombreCliente,TipoTicket,Titulo,CreadoPor,FechaCreacion)
  VALUES(@Numero,'TEST',N'Cliente de prueba','PRODUCTO_PROXIMO_VENCER',N'Prueba plazos','PRUEBA','20260101T14:00:00');
  SET @Ticket=SCOPE_IDENTITY();
  INSERT dbo.tbl_Ticket_Producto(IdTicket,IdDetalleOrigenInicio,Ocurrencia,Estado,FechaVencimiento)
  VALUES(@Ticket,1,1,'PENDIENTE_PLAN','20270331');
  SET @Producto1=SCOPE_IDENTITY();
  INSERT dbo.tbl_Ticket_Producto(IdTicket,IdDetalleOrigenInicio,Ocurrencia,Estado,FechaVencimiento)
  VALUES(@Ticket,2,2,'PENDIENTE_PLAN','20270331');
  SET @Producto2=SCOPE_IDENTITY();
  INSERT dbo.tbl_Ticket_Producto(IdTicket,IdDetalleOrigenInicio,Ocurrencia,Estado,FechaVencimiento)
  VALUES(@Ticket,3,3,'PENDIENTE_PLAN','20270331');
  SET @Producto3=SCOPE_IDENTITY();

  /* Entrada a Marca desde rechazo: debe usar esta recepcion, no la creacion. */
  INSERT dbo.tbl_Ticket_Historial(IdTicket,IdTicketProducto,EstadoAnterior,EstadoNuevo,Accion,UsuarioId,Fecha)
  VALUES(@Ticket,@Producto1,'PENDIENTE_GERENCIA_GENERAL','PENDIENTE_PLAN','RECHAZAR','PRUEBA','20261113T14:00:00'),
    (@Ticket,@Producto2,'PENDIENTE_GERENCIA_GENERAL','PENDIENTE_PLAN','RECHAZAR','PRUEBA','20261113T14:00:00'),
    (@Ticket,@Producto3,'PENDIENTE_GERENCIA_GENERAL','PENDIENTE_PLAN','RECHAZAR','PRUEBA','20261113T14:00:00');
  INSERT dbo.tbl_Ticket_Historial(IdTicket,IdTicketProducto,EstadoAnterior,EstadoNuevo,Accion,Comentario,UsuarioId,Fecha)
  VALUES(@Ticket,@Producto1,'PENDIENTE_PLAN','PENDIENTE_MERCADEO','PROPONER_PLAN',N'En tiempo','PRUEBA','20261117T16:00:00'),
    (@Ticket,@Producto2,'PENDIENTE_PLAN','PENDIENTE_MERCADEO','PROPONER_PLAN',N'Plan enviado tarde','PRUEBA','20261117T16:00:00.001');
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial WHERE IdTicket=@Ticket AND IdTicketProducto=@Producto1
    AND Accion='PROPONER_PLAN' AND PlazoHoras=24 AND SegundosLaborales=86400 AND RespuestaTardia=0 AND ConllevaPenalizacion=0)
    THROW 51000,'Contestar exactamente en 24 horas no debe penalizar.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial WHERE IdTicket=@Ticket AND IdTicketProducto=@Producto2
    AND Accion='PROPONER_PLAN' AND RespuestaTardia=1 AND ConllevaPenalizacion=1
    AND Comentario LIKE N'Plan enviado tarde%Conlleva penalizacion.%')
    THROW 51000,'Contestar tarde debe conservar el comentario y guardar la penalizacion.',1;

  /* Responder otro producto y reenviar token no deben reiniciar Marca. */
  INSERT dbo.tbl_Ticket_Aprobacion_Token(IdTicket,Etapa,CorreoDestino,TokenHash,FechaExpiracion,FechaCreacion)
  VALUES(@Ticket,'JEFE_MARCA','prueba@example.test',HASHBYTES('SHA2_256',CONVERT(VARCHAR(30),@Ticket)),
    '20270101','20261117T16:00:00');
  INSERT dbo.tbl_Ticket_Historial(IdTicket,IdTicketProducto,EstadoAnterior,EstadoNuevo,Accion,UsuarioId,Fecha)
  VALUES(@Ticket,@Producto3,'PENDIENTE_PLAN','PENDIENTE_MERCADEO','PROPONER_PLAN','PRUEBA','20261117T17:00:00');
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial WHERE IdTicket=@Ticket AND IdTicketProducto=@Producto3
    AND Accion='PROPONER_PLAN' AND FechaRecepcionEtapa='20261113T14:00:00' AND RespuestaTardia=1)
    THROW 51000,'Responder otro producto o reenviar un enlace no debe reiniciar el plazo.',1;

  /* Mercadeo tiene 48 horas propias, contadas desde recibir el plan. */
  INSERT dbo.tbl_Ticket_Historial(IdTicket,IdTicketProducto,EstadoAnterior,EstadoNuevo,Accion,UsuarioId,Fecha)
  VALUES(@Ticket,@Producto1,'PENDIENTE_MERCADEO','PLAN_APROBADO','APROBAR','PRUEBA','20261124T15:00:00'),
    (@Ticket,@Producto2,'PENDIENTE_MERCADEO','PENDIENTE_PLAN','RECHAZAR','PRUEBA','20261124T16:00:00');
  /* Martes 17/11 10:00 a martes 24/11 09:00 = 48 h: 7+9+9+9+4+9+1. */
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial WHERE IdTicket=@Ticket AND IdTicketProducto=@Producto1
    AND Accion='APROBAR' AND PlazoHoras=48 AND SegundosLaborales=172800 AND RespuestaTardia=0)
    THROW 51000,'Mercadeo debe usar 48 horas desde su propia recepcion.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial WHERE IdTicket=@Ticket AND IdTicketProducto=@Producto2
    AND Accion='RECHAZAR' AND PlazoHoras=48 AND RespuestaTardia=1)
    THROW 51000,'El rechazo tardio de Mercadeo tambien conlleva penalizacion.',1;

  /* Gerencia General y ejecucion quedan fuera de los plazos. */
  INSERT dbo.tbl_Ticket_Historial(IdTicket,IdTicketProducto,EstadoAnterior,EstadoNuevo,Accion,UsuarioId,Fecha)
  VALUES(@Ticket,@Producto1,'PENDIENTE_GERENCIA_GENERAL','PLAN_APROBADO','APROBAR','PRUEBA','20261201T14:00:00'),
    (@Ticket,@Producto1,'PLAN_APROBADO','PENDIENTE_CIERRE','INICIAR_EJECUCION','PRUEBA','20261202T14:00:00');
  IF EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial WHERE IdTicket=@Ticket
    AND EstadoAnterior IN('PENDIENTE_GERENCIA_GENERAL','PLAN_APROBADO') AND PlazoHoras IS NOT NULL)
    THROW 51000,'Los plazos no se deben aplicar a otras etapas.',1;

  /* Ejercita el procedimiento real: responder tarde no debe bloquear el plan
     ni la aprobacion, y ambas respuestas deben guardar penalizacion. */
  DECLARE @Producto4 BIGINT,@Json NVARCHAR(MAX),@Hash VARCHAR(64),@Expira DATETIME2(3)=DATEADD(DAY,1,SYSUTCDATETIME());
  INSERT dbo.tbl_Ticket_Producto(IdTicket,IdDetalleOrigenInicio,Ocurrencia,Estado,FechaVencimiento)
  VALUES(@Ticket,4,4,'PENDIENTE_PLAN',DATEADD(DAY,15,CONVERT(DATE,DATEADD(HOUR,-6,SYSUTCDATETIME()))));
  SET @Producto4=SCOPE_IDENTITY();
  SET @Hash=CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',CONCAT(@Numero,'MARCA')),2);
  EXEC dbo.PACO_TICKET_EMITIR_TOKEN_APROBACION @Ticket,'JEFE_MARCA','prueba@example.test',@Hash,@Expira;
  SET @Json=CONCAT(N'{"productos":[{"idTicketProducto":',@Producto4,
    N',"decision":"PROPONER_PLAN","tipoAccion":"DESCUENTO","descripcionPlan":"Plan tardio de prueba","comentario":"Plan enviado"}]}');
  EXEC dbo.PACO_TICKET_PRODUCTOS_RESPONDER_APROBACION @Hash,@Json;
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto WHERE IdTicketProducto=@Producto4 AND Estado='PENDIENTE_MERCADEO')
    OR NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial WHERE IdTicketProducto=@Producto4 AND Accion='PROPONER_PLAN'
      AND RespuestaTardia=1 AND ConllevaPenalizacion=1)
    THROW 51000,'El procedimiento debe aceptar el plan tardio y registrar la penalizacion.',1;
  UPDATE dbo.tbl_Ticket_Historial SET Fecha=DATEADD(DAY,-21,SYSUTCDATETIME())
  WHERE IdTicketProducto=@Producto4 AND Accion='PROPONER_PLAN';
  SET @Hash=CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',CONCAT(@Numero,'MERCADEO')),2);
  EXEC dbo.PACO_TICKET_EMITIR_TOKEN_APROBACION @Ticket,'MERCADEO','mercadeo@example.test',@Hash,@Expira;
  SET @Json=CONCAT(N'{"productos":[{"idTicketProducto":',@Producto4,N',"decision":"APROBAR","comentario":"Aprobado"}]}');
  EXEC dbo.PACO_TICKET_PRODUCTOS_RESPONDER_APROBACION @Hash,@Json;
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto WHERE IdTicketProducto=@Producto4 AND Estado='PLAN_APROBADO')
    OR NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Historial WHERE IdTicketProducto=@Producto4 AND Accion='APROBAR'
      AND PlazoHoras=48 AND RespuestaTardia=1 AND ConllevaPenalizacion=1)
    THROW 51000,'El procedimiento debe aceptar la aprobacion tardia y registrar la penalizacion.',1;

  /* La reapertura real depende de vencer en 15 dias, aunque el ticket sea viejo. */
  UPDATE dbo.tbl_Ticket_Producto SET Estado='PENDIENTE_CIERRE' WHERE IdTicketProducto=@Producto4;
  SET @Hash=CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',CONCAT(@Numero,'VENDEDOR')),2);
  EXEC dbo.PACO_TICKET_PRODUCTOS_EMITIR_TOKEN_VENDEDOR @Ticket,@Hash,@Expira,'prueba@example.test','TEST';
  SET @Json=CONCAT(N'{"productos":[{"idTicketProducto":',@Producto4,N',"accion":"REABRIR","comentario":"Queda inventario"}]}');
  EXEC dbo.PACO_TICKET_PRODUCTOS_RESPONDER_VENDEDOR @Hash,@Json;
  IF NOT EXISTS(SELECT 1 FROM dbo.tbl_Ticket_Producto WHERE IdTicketProducto=@Producto4 AND Estado='REABIERTO_URGENTE')
    THROW 51000,'Debe reabrir por vencimiento aunque hayan pasado mas de 30 dias desde crear el ticket.',1;

  ROLLBACK;
  PRINT 'OK: jornada, sabado, domingo, limites, historial, penalizacion y ventana por vencimiento.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
END CATCH;
GO
