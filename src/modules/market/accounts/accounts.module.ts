import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../../database/database.module';
import { MarketAccount } from '../../database/market-entities/market-account.entity';
import { JwtAuthModule } from '../../jwt-auth/jwt-auth.module';
import { MailModule } from '../../mail/mail.module';
import { AspNetPasswordService } from '../auth/aspnet-password.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [
    DatabaseModule,
    JwtAuthModule,
    MailModule,
    TypeOrmModule.forFeature([MarketAccount]),
  ],
  controllers: [AccountsController],
  providers: [AccountsService, AspNetPasswordService],
})
export class AccountsModule {}
