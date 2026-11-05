import {
  serializeTicketAction,
  ticketActionLabel,
} from './ticket-action.utils';

describe('Categoría Devolución/NC', () => {
  it('normaliza planes individuales y por producto sin alterar comentarios', () => {
    const action = {
      tipoAccion: 'NOTA_CREDITO',
      comentario: 'NOTA_CREDITO',
      productos: [{ tipoAccion: 'NOTA_CREDITO' }, { tipoAccion: 'CAMBIO' }],
    };
    expect(JSON.parse(serializeTicketAction(action))).toEqual({
      tipoAccion: 'DEVOLUCION',
      comentario: 'NOTA_CREDITO',
      productos: [{ tipoAccion: 'DEVOLUCION' }, { tipoAccion: 'CAMBIO' }],
    });
    expect(action.tipoAccion).toBe('NOTA_CREDITO');
  });

  it.each(['DEVOLUCION', 'NOTA_CREDITO'])(
    'muestra la misma categoría para %s en correos e históricos',
    (value) =>
      expect(ticketActionLabel(value)).toBe('Devolución/NC (nota crédito)'),
  );
});
