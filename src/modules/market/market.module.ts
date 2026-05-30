import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { ArticulosModule } from './articulos/articulos.module';
import { AuthCompatibilityModule } from './auth/auth-compatibility.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    AccountsModule,
    ArticulosModule,
    AuthCompatibilityModule,
    DashboardModule,
    OrdersModule,
  ],
})
export class MarketModule {}
