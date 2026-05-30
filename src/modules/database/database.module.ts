import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as sql from 'mssql';
import { MarketService } from './market/market.service';
import { MarketAccount } from './market-entities/market-account.entity';
import { MarketClientePos } from '../market/entities/cliente-pos.entity';
import { MarketCliente } from '../market/entities/cliente.entity';
import { MarketDireccion } from '../market/entities/direccion.entity';
import { MarketPagoExtra } from '../market/entities/pago-extra.entity';
import { MarketPagoItem } from '../market/entities/pago-item.entity';
import { MarketPagoOnline } from '../market/entities/pago-online.entity';
import { MarketPedidoCupon } from '../market/entities/pedido-cupon.entity';
import { MarketPedidoDetalle } from '../market/entities/pedido-detalle.entity';
import { MarketPedido } from '../market/entities/pedido.entity';
import { MarketValoracionPedido } from '../market/entities/valoracion-pedido.entity';
import { MarketValoracionProducto } from '../market/entities/valoracion-producto.entity';
import { MarketValoracionReceta } from '../market/entities/valoracion-receta.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [
        MarketAccount,
        MarketPedido,
        MarketPedidoDetalle,
        MarketPedidoCupon,
        MarketClientePos,
        MarketCliente,
        MarketDireccion,
        MarketPagoOnline,
        MarketPagoItem,
        MarketPagoExtra,
        MarketValoracionProducto,
        MarketValoracionReceta,
        MarketValoracionPedido,
      ],
      synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
      options: {
        encrypt: process.env.DB_ENCRYPT == 'true',
        trustServerCertificate:
          process.env.DB_TRUST_SERVER_CERTIFICATE == 'true',
        enableArithAbort: true,
      },
    }),
  ],
  providers: [
    {
      provide: 'SQL_SERVER',
      useFactory: async () => {
        const pool = await new sql.ConnectionPool({
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          server: process.env.DB_HOST,
          database: process.env.DB_NAME,
          options: {
            encrypt: process.env.DB_ENCRYPT == 'true',
            trustServerCertificate:
              process.env.DB_TRUST_SERVER_CERTIFICATE == 'true',
            enableArithAbort: true,
          },
        }).connect();

        return pool;
      },
    },
    MarketService,
  ],
  exports: ['SQL_SERVER', MarketService],
})
export class DatabaseModule {}
