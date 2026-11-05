import { TicketsVencimientoService } from './tickets-vencimiento.service';

describe('TicketsVencimientoService reapertura', () => {
  it('exige motivo antes de enviar la solicitud al procedimiento', () => {
    const db = { executeProcedure: jest.fn() };
    const service = new TicketsVencimientoService(db as any);
    for (const comentario of [undefined, '', '   ']) {
      expect(() =>
        service.vendor(
          '1',
          {
            accion: 'REABRIR',
            comentario,
          },
          { id: 'vendedor' } as any,
        ),
      ).toThrow('Debe indicar el motivo');
    }
    expect(db.executeProcedure).not.toHaveBeenCalled();
  });

  it('conserva el motivo enviado al procedimiento', () => {
    const db = { executeProcedure: jest.fn() };
    const service = new TicketsVencimientoService(db as any);
    service.vendor(
      '1',
      {
        accion: 'REABRIR',
        comentario: 'La solución requiere revisión',
      },
      { id: 'vendedor' } as any,
    );
    expect(db.executeProcedure).toHaveBeenCalledWith(
      'PACO_TICKET_VENCIMIENTO_RESPUESTA_VENDEDOR',
      expect.objectContaining({ Comentario: 'La solución requiere revisión' }),
    );
  });
});
