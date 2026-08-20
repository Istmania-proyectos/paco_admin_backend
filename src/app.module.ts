import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DatabaseModule } from './modules/database/database.module';
import { PacoModule } from './modules/paco/paco.module';
import { PunteoModule } from './modules/punteo/punteo.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { TicketsVencimientoModule } from './modules/tickets-vencimiento/tickets-vencimiento.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { LibroRutaModule } from './modules/libro-ruta/libro-ruta.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    NotificacionesModule,
    AuthModule,
    AccountsModule,
    PacoModule,
    DashboardModule,
    PunteoModule,
    TicketsModule,
    TicketsVencimientoModule,
    MasterDataModule,
    LibroRutaModule,
  ],
})
export class AppModule {}
