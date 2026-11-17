import { createHash } from 'crypto';
import { TicketsService } from './tickets.service';

describe('TicketsService automation', () => {
  const configValues: Record<string, string> = {
    TICKETS_MARKETING_MANAGER_EMAIL: 'mercadeo@test.local',
    TICKETS_GENERAL_MANAGER_EMAIL: 'gerencia@test.local',
    TICKETS_AUTOMATION_USER_ID: 'AUTOMATIZACION_TEST',
  };

  function setup(rows: any[]) {
    const database = {
      executeProcedure: jest.fn().mockResolvedValue(rows),
      query: jest.fn().mockResolvedValue([]),
    };
    const mailer = { send: jest.fn() };
    const config = {
      get: jest.fn((key: string) => configValues[key]),
    };
    const service = new TicketsService(
      database as any,
      mailer as any,
      config as any,
    );
    return { service, database, mailer };
  }

  it('consulta recordatorios cada 8 horas y los dirige a los responsables pendientes del flujo', async () => {
    const approvals = ['JEFE_MARCA', 'MERCADEO', 'GERENCIA_GENERAL', 'EJECUCION'].map(
      (Etapa) => ({ Tipo: 'APROBACION', IdTicket: 12, Etapa }),
    );
    const seller = {
      Tipo: 'VENDEDOR',
      IdTicket: 12,
      Email: 'vendedor@example.test',
      NombreVendedor: 'Vendedor',
    };
    const { service, database } = setup([...approvals, seller]);
    const approvalEmail = jest.spyOn(service as any, 'sendApprovalEmail').mockResolvedValue(undefined);
    const sellerEmail = jest.spyOn(service as any, 'sendAndLog').mockResolvedValue(undefined);

    await (service as any).runScheduledReminders();

    expect(database.executeProcedure).toHaveBeenCalledWith(
      'PACO_TICKET_OBTENER_RECORDATORIOS',
      { Horas: '8' },
    );
    expect(approvalEmail).toHaveBeenCalledTimes(4);
    for (const target of approvals) expect(approvalEmail).toHaveBeenCalledWith(target);
    expect(sellerEmail).toHaveBeenCalledTimes(1);
    expect(sellerEmail).toHaveBeenCalledWith(expect.objectContaining({
      Email: seller.Email,
      Rol: 'VENDEDOR',
      EsVendedorExterno: true,
    }));
  });

  it.each([
    [
      'con token',
      (service: TicketsService) =>
        service.respondAsSeller({
          token: 'a'.repeat(40),
          accion: 'REABRIR',
          comentario: 'La solución no resolvió la solicitud',
        }),
    ],
    [
      'sin token',
      (service: TicketsService) =>
        service.respondWithoutToken('12', {
          accion: 'REABRIR',
          comentario: 'La solución no resolvió la solicitud',
          respuestasNuevas: [
            {
              IdTicketDetalle: 1,
              IdDetalleOrigen: 1,
              IdPreguntaOrigen: 49,
              Valor: '2',
            },
          ],
        }),
    ],
    [
      'por producto',
      (service: TicketsService) =>
        service.respondAsSeller({
          token: 'a'.repeat(40),
          productos: [
            {
              idTicketProducto: 1,
              accion: 'REABRIR',
              comentario: 'La solución no resolvió la solicitud',
            },
          ],
        }),
    ],
  ])('rechaza la reapertura fuera de plazo %s', async (_path, respond) => {
    const { service } = setup([{ Resultado: 'REAPERTURA_FUERA_DE_PLAZO' }]);

    await expect(respond(service)).rejects.toThrow(
      'Solo se puede reabrir durante el ultimo mes antes del vencimiento del producto, incluida la fecha de vencimiento.',
    );
  });

  it.each([undefined, '', '   ', '\t\n'])(
    'rechaza reaperturas sin motivo (%s) en todas las rutas',
    async (comentario) => {
      const { service, database } = setup([]);
      await expect(
        service.respondAsSeller({
          token: 'a'.repeat(40),
          accion: 'REABRIR',
          comentario,
        }),
      ).rejects.toThrow('Debe indicar el motivo');
      await expect(
        service.respondAsSeller({
          token: 'a'.repeat(40),
          comentario: 'Motivo general',
          productos: [
            { idTicketProducto: 1, accion: 'CERRAR' },
            { idTicketProducto: 2, accion: 'REABRIR', comentario },
          ],
        }),
      ).rejects.toThrow('Debe indicar el motivo');
      await expect(
        service.respondWithoutToken('12', {
          accion: 'REABRIR',
          comentario,
        }),
      ).rejects.toThrow('Debe indicar el motivo');
      expect(database.executeProcedure).not.toHaveBeenCalled();
    },
  );

  it('permite cerrar sin motivo y conserva el motivo al reabrir por producto', async () => {
    const { service, database } = setup([
      { NumeroTicket: 'TKT-12', Estado: 'CERRADO' },
    ]);
    jest.spyOn(service as any, 'notifySafely').mockResolvedValue(undefined);
    await service.respondAsSeller({ token: 'a'.repeat(40), accion: 'CERRAR' });
    await service.respondAsSeller({
      token: 'a'.repeat(40),
      productos: [
        {
          idTicketProducto: 1,
          accion: 'REABRIR',
          comentario: 'Producto aún dañado',
        },
      ],
    });
    expect(database.executeProcedure).toHaveBeenLastCalledWith(
      'PACO_TICKET_PRODUCTOS_RESPONDER_VENDEDOR',
      expect.objectContaining({
        Json: JSON.stringify({
          productos: [
            {
              idTicketProducto: 1,
              accion: 'REABRIR',
              comentario: 'Producto aún dañado',
            },
          ],
        }),
      }),
    );
  });

  it('simula la importacion sin notificar', async () => {
    const rows = [
      {
        EstadoResultado: 'LISTO_CREAR',
        CorreoJefeMarca: 'jefe@test.local',
      },
    ];
    const { service, database, mailer } = setup(rows);
    const notify = jest
      .spyOn(service as any, 'notifySafely')
      .mockResolvedValue(undefined);

    const result = await service.runCheckinAutomation(false, 14);

    expect(database.executeProcedure).toHaveBeenCalledWith(
      'PACO_TICKET_AUTOMATIZAR_CHECKIN',
      expect.objectContaining({ Formulario: '14', Ejecutar: '0' }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        modo: 'SIMULACION',
        creaTickets: false,
        enviaCorreos: false,
      }),
    );
    expect(notify).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('notifica unicamente filas creadas que lo solicitan', async () => {
    const rows = [
      {
        IdTicket: 10,
        NumeroTicket: 'TKT-0000000010',
        RequiereNotificacion: 1,
      },
      {
        IdTicket: null,
        EstadoResultado: 'SIN_JEFE_MARCA',
        RequiereNotificacion: 0,
      },
    ];
    const { service } = setup(rows);
    const notify = jest
      .spyOn(service as any, 'notifySafely')
      .mockResolvedValue(undefined);

    await service.runCheckinAutomation(true, 14);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(rows[0]);
  });

  it('simula renovaciones mensuales sin enviar correo', async () => {
    const rows = [
      {
        IdTicketAnterior: 5,
        EstadoResultado: 'LISTO_RENOVAR',
        RequiereNotificacion: 0,
      },
    ];
    const { service } = setup(rows);
    const notify = jest
      .spyOn(service as any, 'notifySafely')
      .mockResolvedValue(undefined);

    const result = await service.runMonthlyRenewals(false, 30);

    expect(result.diasSinResolver).toBe(30);
    expect(result.modo).toBe('SIMULACION');
    expect(notify).not.toHaveBeenCalled();
  });

  it('redirige un ticket demo sin usar el destinatario real', async () => {
    const { service, database } = setup([]);
    database.query.mockResolvedValue([
      {
        EsDemo: 1,
        CorreoDemo: 'yovanni.amador@istmania.hn',
      },
    ]);

    const delivery = await (service as any).resolveDelivery(
      1,
      'jefe.real@empresa.test',
    );

    expect(delivery).toEqual({
      to: 'yovanni.amador@istmania.hn',
      intendedTo: 'jefe.real@empresa.test',
      isDemo: true,
    });
  });

  it('conserva el destinatario de un ticket normal', async () => {
    const { service, database } = setup([]);
    database.query.mockResolvedValue([{ EsDemo: 0, CorreoDemo: null }]);

    const delivery = await (service as any).resolveDelivery(
      2,
      'jefe.real@empresa.test',
    );

    expect(delivery.to).toBe('jefe.real@empresa.test');
    expect(delivery.isDemo).toBe(false);
  });

  it('registra en bitácora los correos del flujo de aprobación', async () => {
    configValues.TICKETS_APPROVAL_RESPONSE_URL =
      'http://localhost/ticket/aprobar';
    const { service, database, mailer } = setup([]);
    database.query.mockResolvedValue([{ EsDemo: 0, CorreoDemo: null }]);
    database.executeProcedure.mockImplementation(
      (procedure: string, params: any) => {
        if (procedure === 'PACO_INSERT_TICKET' && params.Option === '3') {
          return Promise.resolve([{ IdNotificacion: 77 }]);
        }
        return Promise.resolve([]);
      },
    );
    jest
      .spyOn(service as any, 'flowSummary')
      .mockResolvedValue('<p>Resumen</p>');

    await (service as any).sendApprovalEmail({
      IdTicket: 1,
      NumeroTicket: 'TKT-0000000001',
      Estado: 'PENDIENTE_MERCADEO',
      Etapa: 'MERCADEO',
      CorreoDestino: 'mercadeo@test.local',
    });

    expect(database.executeProcedure).toHaveBeenCalledWith(
      'PACO_INSERT_TICKET',
      expect.objectContaining({
        Option: '3',
        Param1: '1',
        Param2: 'mercadeo@test.local',
        Param3: 'PENDIENTE_MERCADEO',
      }),
    );
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'mercadeo@test.local' }),
    );
    expect(database.executeProcedure).toHaveBeenCalledWith(
      'PACO_INSERT_TICKET',
      expect.objectContaining({
        Option: '4',
        Param1: '77',
        Param2: 'ENVIADO',
      }),
    );
    delete configValues.TICKETS_APPROVAL_RESPONSE_URL;
  });

  it('tolera saltos de linea insertados por el cliente de correo', async () => {
    const { service, database } = setup([{ TokenEstado: 'VALIDO' }]);
    const cleanToken = 'abcDEF_123-xyz';

    await service.getApprovalTicket(`abcDEF_\r\n 123-xyz`);

    expect(database.executeProcedure).toHaveBeenCalledWith(
      'PACO_TICKET_GET_APROBACION',
      {
        HashHex: createHash('sha256').update(cleanToken).digest('hex'),
      },
    );
  });

  it('sugiere al vendedor y su supervisor al iniciar la ejecución', async () => {
    const { service, database } = setup([]);
    database.executeProcedure.mockImplementation((procedure: string) => {
      if (procedure === 'PACO_TICKET_GET_APROBACION') {
        return Promise.resolve([
          { TokenEstado: 'VALIDO', IdTicket: 18, Etapa: 'EJECUCION' },
        ]);
      }
      return Promise.resolve([]);
    });
    database.query.mockResolvedValue([
      {
        correoVendedor: 'vendedor@istmania.hn',
        correoSupervisor: 'SUPERVISOR@istmania.hn',
      },
    ]);

    const ticket = await service.getApprovalTicket('abcDEF_123-xyz');

    expect(ticket.correosCcSugeridos).toEqual([
      'vendedor@istmania.hn',
      'supervisor@istmania.hn',
    ]);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('SG.codigo_vendedor = T.CodigoVendedor'),
      { ticketId: 18, productIds: null },
    );
  });

  it('sugiere contactos por tipo de plan y conserva vendedor, supervisor y jefe sin duplicados', async () => {
    const { service, database } = setup([]);
    database.query.mockResolvedValue([
      {
        codigoVendedor: 'T04',
        tipoAccion: 'CAMBIO',
        correoVendedor: 'vendedor@test.local',
        correoSupervisor: 'SUPERVISOR@test.local',
      },
      {
        codigoVendedor: 'T04',
        tipoAccion: 'PROMOCION',
        correoVendedor: 'vendedor@test.local',
        correoJefeMarca: 'jefe@test.local',
      },
    ]);
    const result = await service.getExecutionSuggestedEmails(18, [40, 41]);
    expect(result).toEqual([
      'vendedor@test.local',
      'supervisor@test.local',
      'jefe@test.local',
      'hector.contreras@istmania.hn',
      'reina.espinal@istmania.hn',
      'andrea.castro@istmania.hn',
      'robert.cabrera@istmania.hn',
      'jorge.varela@istmania.hn',
      'junior.osorto@istmania.hn',
      'lissy.flores@istmania.hn',
    ]);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining("P.Estado = 'PLAN_APROBADO'"),
      {
        ticketId: 18,
        productIds: '[40,41]',
      },
    );
  });

  it('envía los correos editados al iniciar ejecución por productos desde la bandeja', async () => {
    const { service, database } = setup([]);
    database.query.mockResolvedValue([{ CorreoDestino: 'jefe@test.local' }]);
    database.executeProcedure.mockResolvedValue([
      { IdTicket: 18, Estado: 'PENDIENTE_CIERRE' },
    ]);
    const copies = jest
      .spyOn(service as any, 'sendExecutionCopies')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'notifySafely').mockResolvedValue(undefined);
    await service.transitionProducts(
      '18',
      {
        accion: 'INICIAR_EJECUCION',
        productos: [{ idTicketProducto: 40 }],
        correosCc: ['seleccionado@test.local'],
      },
      { id: 'jefe', roles: 'TICKET_JEFE_MARCA' } as any,
    );
    expect(copies).toHaveBeenCalledWith(
      expect.objectContaining({ IdTicket: 18 }),
      ['seleccionado@test.local'],
    );
  });

  it.each(['JEFE_MARCA', 'MERCADEO', 'GERENCIA_GENERAL', 'EJECUCION'])(
    'expone el motivo original de solicitud en la etapa %s',
    async (Etapa) => {
      const { service, database } = setup([
        { TokenEstado: 'VALIDO', IdTicket: 18, Etapa },
      ]);
      database.query.mockResolvedValue([
        { Valor: '  Producto próximo a vencer  ' },
        { Valor: '' },
        { Valor: 'Producto próximo a vencer' },
      ]);
      const ticket = await service.getApprovalTicket('token-prueba');
      expect(ticket.MotivoSolicitud).toBe('Producto próximo a vencer');
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('IdPreguntaOrigen = 1391'),
        { ticketId: 18 },
      );
    },
  );

  it('incluye todos los motivos en el cierre del vendedor sin confundirlos con el plan', async () => {
    const { service, database } = setup([
      { TokenEstado: 'VALIDO', IdTicket: 18, Motivo: 'DEVOLUCION' },
    ]);
    database.query.mockResolvedValue([
      { Valor: 'Producto próximo a vencer' },
      { Valor: 'Empaque dañado' },
    ]);
    const ticket = await service.getSellerTicket('token-prueba');
    expect(ticket.MotivoSolicitud).toBe(
      'Producto próximo a vencer\nEmpaque dañado',
    );
    expect((ticket as any).Motivo).toBe('DEVOLUCION');
  });

  it('entrega el motivo de reapertura del producto junto al motivo original', async () => {
    const { service, database } = setup([]);
    database.executeProcedure.mockImplementation((procedure: string) =>
      Promise.resolve(
        procedure === 'PACO_TICKET_GET_APROBACION'
          ? [{ TokenEstado: 'VALIDO', IdTicket: 18, Etapa: 'JEFE_MARCA' }]
          : [{ IdTicketProducto: 40, Estado: 'REABIERTO_URGENTE' }],
      ),
    );
    database.query.mockImplementation((query: string) =>
      Promise.resolve(
        query.includes('WITH Reaperturas')
          ? [{ IdTicketProducto: 40, Comentario: 'La solución no se ejecutó' }]
          : [{ Valor: 'Producto próximo a vencer' }],
      ),
    );
    const ticket = await service.getApprovalTicket('token-prueba');
    expect(ticket.MotivoSolicitud).toBe('Producto próximo a vencer');
    expect(ticket.Productos[0].MotivoReapertura).toBe(
      'La solución no se ejecutó',
    );
  });

  it.each([undefined, '', '   '])(
    'exige comentario de aprobación en todas las rutas (%s)',
    async (comentario) => {
      const { service, database } = setup([]);
      await expect(
        service.respondApproval({
          token: 'prueba',
          decision: 'APROBAR',
          comentario,
        }),
      ).rejects.toThrow('Debe indicar un comentario');
      await expect(
        service.respondApproval({
          token: 'prueba',
          productos: [
            { idTicketProducto: 40, decision: 'APROBAR', comentario },
          ],
        } as any),
      ).rejects.toThrow('Debe indicar un comentario');
      await expect(
        service.transition(
          '18',
          { accion: 'APROBAR_MERCADEO', comentario },
          {} as any,
        ),
      ).rejects.toThrow('Debe indicar un comentario');
      await expect(
        service.transitionProducts(
          '18',
          {
            accion: 'APROBAR_GERENCIA',
            productos: [{ idTicketProducto: 40, comentario }],
          },
          {} as any,
        ),
      ).rejects.toThrow('Debe indicar un comentario');
      expect(database.executeProcedure).not.toHaveBeenCalled();
    },
  );

  it('tolera tickets anteriores que no tienen motivo de solicitud', async () => {
    const { service } = setup([
      { TokenEstado: 'VALIDO', IdTicket: 18, Etapa: 'JEFE_MARCA' },
    ]);
    const ticket = await service.getApprovalTicket('token-prueba');
    expect(ticket.MotivoSolicitud).toBe('');
  });

  it('notifica el cierre al correo demo si el vendedor no tiene correo', async () => {
    const { service, database } = setup([]);
    database.executeProcedure
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          IdTicket: 2,
          NumeroTicket: 'TKT-0000000002',
          Estado: 'PENDIENTE_CIERRE',
          CodigoVendedor: 'T08',
          NombreVendedor: 'Vendedor demo',
          CorreoVendedor: null,
          EsDemo: 1,
          CorreoDemo: 'yovanni.amador@istmania.hn',
          Titulo: 'Vencimiento',
          NombreCliente: 'Cliente demo',
        },
      ]);
    const send = jest
      .spyOn(service as any, 'sendAndLog')
      .mockResolvedValue(undefined);

    await (service as any).notifyNextRecipients({
      IdTicket: 2,
      NumeroTicket: 'TKT-0000000002',
      Estado: 'PENDIENTE_CIERRE',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        Email: 'yovanni.amador@istmania.hn',
        Rol: 'VENDEDOR_EXTERNO',
        EsVendedorExterno: true,
      }),
    );
  });

  it('informa al vendedor los productos rechazados por politica', async () => {
    const { service, database, mailer } = setup([]);
    database.executeProcedure
      .mockResolvedValueOnce([
        {
          IdTicket: 2,
          NumeroTicket: 'TKT-0000000002',
          NombreCliente: 'Cliente prueba',
          CodigoVendedor: 'T08',
          NombreVendedor: 'Vendedor prueba',
          CorreoVendedor: 'vendedor@test.local',
          EsDemo: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          IdTicketProducto: 40,
          Ocurrencia: 4,
          CodigoArticulo: 'ME015003006',
          Articulo: 'Producto prueba',
          Marca: 'Marca prueba',
          Lote: 'L-01',
          Cantidad: 12,
          FechaVencimiento: '2026-08-01',
          FechaMinimaPolitica: '2026-10-29',
          Estado: 'RECHAZADO_POLITICA',
          TipoAccion: 'REUBICACION',
          PlanAccion: 'Plan anterior',
        },
      ])
      .mockResolvedValueOnce([{ IdNotificacion: 99 }])
      .mockResolvedValueOnce([]);
    database.query.mockResolvedValue([{ EsDemo: 0, CorreoDemo: null }]);

    await (service as any).sendPolicyRejectionNoticeSafely(
      {
        IdTicket: 2,
        NumeroTicket: 'TKT-0000000002',
        Estado: 'EN_PROCESO_PARCIAL',
      },
      [40],
      'MERCADEO',
    );

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'vendedor@test.local',
        subject: expect.stringContaining('rechazado(s) por política'),
        html: expect.stringContaining('ME015003006'),
      }),
    );
  });

  it('conserva el subdirectorio y hash de la ruta publica de cierre', () => {
    configValues.TICKETS_SELLER_RESPONSE_URL =
      'http://10.10.10.9:8081/paco-admin-front/#/ticket/responder';
    const { service } = setup([]);

    const html = (service as any).sellerEmailTemplate(
      {
        IdTicket: 2,
        UserId: 'T08',
        Email: 'vendedor@test.local',
        Nombre: 'Vendedor',
        Rol: 'VENDEDOR_EXTERNO',
        NumeroTicket: 'TKT-0000000002',
        Titulo: 'Vencimiento',
        NombreCliente: 'Cliente',
        Estado: 'PENDIENTE_CIERRE',
      },
      'token-prueba',
      '',
    );

    expect(html).toContain(
      'http://10.10.10.9:8081/paco-admin-front/#/ticket/responder?token=token-prueba',
    );
    expect(html).not.toContain('/login?token=');
    delete configValues.TICKETS_SELLER_RESPONSE_URL;
  });

  it('construye ambos enlaces sin hash desde una unica URL publica del frontend', () => {
    configValues.TICKETS_PUBLIC_FRONTEND_URL =
      'http://10.10.10.9:8081/paco-admin-front/';
    const { service } = setup([]);

    expect(service.getPublicLinkConfiguration()).toEqual({
      aprobacion: 'http://10.10.10.9:8081/paco-admin-front/ticket/aprobar',
      cierreVendedor:
        'http://10.10.10.9:8081/paco-admin-front/ticket/responder',
    });
    delete configValues.TICKETS_PUBLIC_FRONTEND_URL;
  });

  it('incluye plan, responsable y comentarios en el resumen del flujo', async () => {
    const { service, database } = setup([]);
    database.executeProcedure.mockImplementation(
      (_procedure: string, params: { Option: string }) => {
        if (params.Option === '2')
          return Promise.resolve([
            {
              NumeroTicket: 'TKT-1',
              Estado: 'PENDIENTE_MERCADEO',
              NombreCliente: 'Cliente demo',
              NombreVendedor: 'Vendedor demo',
              Titulo: 'Vencimiento',
              Descripcion: 'Descripción completa',
            },
          ]);
        if (params.Option === '3')
          return Promise.resolve([{ Pregunta: 'Marca', Valor: 'QUARTZ' }]);
        if (params.Option === '4')
          return Promise.resolve([
            {
              TipoAccion: 'REUBICACION',
              Estado: 'PROPUESTO',
              Descripcion: 'Mover producto',
              FechaCompromiso: '2026-08-01',
              Responsable: 'Encargado demo',
              DefinidoPor: 'Jefe demo',
            },
          ]);
        if (params.Option === '5')
          return Promise.resolve([
            {
              Accion: 'PROPONER_PLAN',
              EstadoNuevo: 'PENDIENTE_MERCADEO',
              Fecha: '2026-07-23',
              NombreUsuario: 'Jefe demo',
              Comentario: 'Validar existencias',
            },
          ]);
        return Promise.resolve([]);
      },
    );

    const summary = await (service as any).flowSummary(1);

    expect(summary).toContain('Mover producto');
    expect(summary).toContain('Encargado demo');
    expect(summary).toContain('Validar existencias');
    expect(summary).toContain('QUARTZ');
  });
});
