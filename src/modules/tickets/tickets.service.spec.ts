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

  it('tolera saltos de linea insertados por el cliente de correo', async () => {
    const { service, database } = setup([{ TokenEstado: 'VALIDO' }]);
    const cleanToken = 'abcDEF_123-xyz';

    await service.getApprovalTicket(`abcDEF_\r\n 123-xyz`);

    expect(database.executeProcedure).toHaveBeenCalledWith(
      'PACO_TICKET_GET_APROBACION',
      {
        Hash: createHash('sha256').update(cleanToken).digest('hex'),
      },
    );
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

  it('fuerza la ruta publica de cierre aunque la configuracion apunte al login', () => {
    configValues.TICKETS_SELLER_RESPONSE_URL = 'http://localhost:4200/login';
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
      'http://localhost:4200/ticket/responder?token=token-prueba',
    );
    expect(html).not.toContain('/login?token=');
    delete configValues.TICKETS_SELLER_RESPONSE_URL;
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
