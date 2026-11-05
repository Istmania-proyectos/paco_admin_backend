import { NotFoundException } from '@nestjs/common';
import { S4HanaDatabaseService } from '../database/s4hana-database.service';
import { PagosS4hanaService } from './pagos-s4hana.service';

describe('PagosS4hanaService', () => {
  let query: jest.Mock;
  let service: PagosS4hanaService;

  beforeEach(() => {
    query = jest.fn();
    service = new PagosS4hanaService({
      query,
    } as unknown as S4HanaDatabaseService);
  });

  it('excluye los pagos de PACO_WEB', async () => {
    query.mockResolvedValue([]);
    await service.listarPagos();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE version <> @versionExcluida'),
      { versionExcluida: 'PACO_WEB' },
    );
  });

  it('lista las facturas de pago', async () => {
    query.mockResolvedValue([]);
    await service.listarFacturas();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM dbo.entityFacturasPagoes'),
    );
  });

  it('habilita un pedido para reingreso por ID', async () => {
    query.mockResolvedValue([{ affected: 1 }]);
    await expect(service.reingresarPedido({ id: 12 })).resolves.toEqual({
      message: 'Pedido habilitado para reingreso',
      id: 12,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE ID = @id'),
      { id: 12 },
    );
  });

  it('habilita un pago para reingreso por numero de recibo', async () => {
    query.mockResolvedValue([{ affected: 1 }]);
    await service.reingresarPago({ numRecibo: ' REC-10 ' });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE numRecibo = @numRecibo'),
      { numRecibo: 'REC-10' },
    );
  });

  it('quita solamente la factura del pago indicado', async () => {
    query.mockResolvedValue([{ affected: 1 }]);
    await service.quitarFactura({ pagoId: 5, id: 8 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE PagoID_ID = @pagoId AND ID = @id'),
      { pagoId: 5, id: 8 },
    );
  });

  it('informa cuando la fila a modificar no existe', async () => {
    query.mockResolvedValue([{ affected: 0 }]);
    await expect(service.reingresarPedido({ id: 999 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
