import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DatabaseModule } from './modules/database/database.module';
import { PacoModule } from './modules/paco/paco.module';
import { PunteoModule } from './modules/punteo/punteo.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    AccountsModule,
    PacoModule,
    DashboardModule,
    PunteoModule,
    TicketsModule,
  ],
})
export class AppModule {}
