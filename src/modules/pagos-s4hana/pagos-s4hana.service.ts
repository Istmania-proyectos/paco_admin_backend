import { Injectable, NotFoundException } from '@nestjs/common';
import { S4HanaDatabaseService } from '../database/s4hana-database.service';
import {
  QuitarFacturaDto,
  ReingresarPagoDto,
  ReingresarPedidoDto,
} from './dto/pagos-s4hana.dto';

@Injectable()
export class PagosS4hanaService {
  constructor(private readonly database: S4HanaDatabaseService) {}

  listarPagos() {
    return this.database.query<EntityPagoRow>(
      `SELECT *
       FROM dbo.entityPagoes
       WHERE version <> @versionExcluida
       ORDER BY ID DESC`,
      { versionExcluida: 'PACO_WEB' },
    );
  }

  listarFacturas() {
    return this.database.query<EntityFacturaPagoRow>(
      `SELECT *
       FROM dbo.entityFacturasPagoes
       ORDER BY ID DESC`,
    );
  }

  async reingresarPedido(value: ReingresarPedidoDto) {
    const result = await this.database.query<{ affected: number }>(
      `UPDATE dbo.entityPagoes
       SET migrado = NULL
       WHERE ID = @id;
       SELECT @@ROWCOUNT AS affected;`,
      { id: value.id },
    );
    this.ensureUpdated(result[0]?.affected, 'Pedido no encontrado');
    return { message: 'Pedido habilitado para reingreso', id: value.id };
  }

  async reingresarPago(value: ReingresarPagoDto) {
    const numRecibo = value.numRecibo.trim();
    const result = await this.database.query<{ affected: number }>(
      `UPDATE dbo.entityPagoes
       SET migrado = NULL
       WHERE numRecibo = @numRecibo;
       SELECT @@ROWCOUNT AS affected;`,
      { numRecibo },
    );
    this.ensureUpdated(result[0]?.affected, 'Pago no encontrado');
    return { message: 'Pago habilitado para reingreso', numRecibo };
  }

  async quitarFactura(value: QuitarFacturaDto) {
    const result = await this.database.query<{ affected: number }>(
      `UPDATE dbo.entityFacturasPagoes
       SET factura = ''
       WHERE PagoID_ID = @pagoId AND ID = @id;
       SELECT @@ROWCOUNT AS affected;`,
      { pagoId: value.pagoId, id: value.id },
    );
    this.ensureUpdated(result[0]?.affected, 'Factura no encontrada');
    return {
      message: 'Factura retirada correctamente',
      pagoId: value.pagoId,
      id: value.id,
    };
  }

  private ensureUpdated(affected: number | undefined, message: string) {
    if (!affected) throw new NotFoundException(message);
  }
}

export interface EntityPagoRow {
  ID: number;
  version: string | null;
  numRecibo: string | null;
  migrado: string | null;
  [column: string]: unknown;
}

export interface EntityFacturaPagoRow {
  ID: number;
  factura: string | null;
  PagoID_ID: number | null;
  [column: string]: unknown;
}
