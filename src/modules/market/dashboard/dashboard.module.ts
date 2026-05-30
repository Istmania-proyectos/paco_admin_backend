import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../../database/database.module';
import { JwtAuthModule } from '../../jwt-auth/jwt-auth.module';
import { MailModule } from '../../mail/mail.module';
import { MarketCliente } from '../entities/cliente.entity';
import { MarketDireccion } from '../entities/direccion.entity';
import { MarketValoracionPedido } from '../entities/valoracion-pedido.entity';
import { MarketValoracionProducto } from '../entities/valoracion-producto.entity';
import { MarketValoracionReceta } from '../entities/valoracion-receta.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    DatabaseModule,
    JwtAuthModule,
    MailModule,
    TypeOrmModule.forFeature([
      MarketCliente,
      MarketDireccion,
      MarketValoracionProducto,
      MarketValoracionReceta,
      MarketValoracionPedido,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
