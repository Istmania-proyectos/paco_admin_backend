import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../../database/database.module';
import { MarketClientePos } from '../entities/cliente-pos.entity';
import { MarketPagoExtra } from '../entities/pago-extra.entity';
import { MarketPagoItem } from '../entities/pago-item.entity';
import { MarketPagoOnline } from '../entities/pago-online.entity';
import { MarketPedidoCupon } from '../entities/pedido-cupon.entity';
import { MarketPedidoDetalle } from '../entities/pedido-detalle.entity';
import { MarketPedido } from '../entities/pedido.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      MarketPedido,
      MarketPedidoDetalle,
      MarketPedidoCupon,
      MarketClientePos,
      MarketPagoOnline,
      MarketPagoItem,
      MarketPagoExtra,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
