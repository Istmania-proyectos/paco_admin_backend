import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketService } from '../../database/market/market.service';
import { MarketClientePos } from '../entities/cliente-pos.entity';
import { MarketPagoOnline } from '../entities/pago-online.entity';
import { MarketPedido } from '../entities/pedido.entity';
import { MarketResponseDto } from '../dto/market-response.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly marketService: MarketService,
    @InjectRepository(MarketPedido)
    private readonly pedidoRepo: Repository<MarketPedido>,
    @InjectRepository(MarketClientePos)
    private readonly clientePosRepo: Repository<MarketClientePos>,
    @InjectRepository(MarketPagoOnline)
    private readonly pagoRepo: Repository<MarketPagoOnline>,
  ) {}

  private response<T>(msg: T): MarketResponseDto<T> {
    return {
      success: true,
      msg,
      error: '',
    };
  }

  private normalizeEmptyDates<T>(payload: T): T {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizeEmptyDates(item)) as T;
    }

    const normalized = { ...(payload as Record<string, any>) };
    for (const [key, value] of Object.entries(normalized)) {
      if (/fecha|date/i.test(key) && value === '') {
        normalized[key] = null;
        continue;
      }

      if (value && typeof value === 'object') {
        normalized[key] = this.normalizeEmptyDates(value);
      }
    }

    return normalized as T;
  }

  async createOrder(payload: Partial<MarketPedido>) {
    const pedido = this.pedidoRepo.create(this.normalizeEmptyDates(payload));
    const saved = await this.pedidoRepo.save(pedido);
    return this.response(saved.PedidoId);
  }

  async insertClientePos(payload: Partial<MarketClientePos>) {
    const cliente = this.clientePosRepo.create(payload);
    const saved = await this.clientePosRepo.save(cliente);
    return this.response(saved.Id);
  }

  async updateClientePos(payload: Partial<MarketClientePos>) {
    if (!payload.Id) {
      throw new BadRequestException('Id es requerido');
    }

    const cliente = await this.clientePosRepo.findOneBy({ Id: payload.Id });
    if (!cliente) {
      throw new NotFoundException('ClientePOS no encontrado');
    }

    await this.clientePosRepo.save({ ...cliente, ...payload });
    return this.response('ClientePOS Update');
  }

  async createOrderPay(payload: Partial<MarketPagoOnline>) {
    const pago = this.pagoRepo.create(payload);
    await this.pagoRepo.save(pago);
    return this.response('Order Create');
  }

  async verifyOrderPay(paymentHash: string) {
    const rows = await this.marketService.getPedidos({
      option: 15,
      param1: paymentHash,
    });

    return this.response(rows?.[0]?.ESVALIDO ?? '');
  }

  async cancelOrder(payload: Partial<MarketPedido>) {
    if (!payload.PedidoId) {
      throw new BadRequestException('PedidoId es requerido');
    }

    await this.marketService.getPedidos({
      option: 5,
      param1: String(payload.PedidoId),
    });

    return this.response('Order Cancel');
  }

  async getFileMetadata(pedidoId: string) {
    if (!pedidoId) {
      throw new BadRequestException('pedidoId es requerido');
    }

    const rows = await this.marketService.getPedidos({
      option: 300,
      param1: pedidoId,
    });

    const file = rows?.[0];
    if (!file?.Path || !file?.FileName) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return {
      path: file.Path,
      fileName: file.FileName,
    };
  }

  async registerUploadedFile(idOrder: string, path: string, extension: string) {
    await this.marketService.getPedidos({
      option: 24,
      param1: idOrder,
      param2: idOrder,
      param3: path,
      param4: extension,
    });

    return this.response('file Create');
  }
}
