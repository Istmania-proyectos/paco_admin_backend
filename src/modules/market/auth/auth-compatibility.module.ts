import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketAccount } from '../../database/market-entities/market-account.entity';
import { DatabaseModule } from '../../database/database.module';
import { JwtAuthModule } from '../../jwt-auth/jwt-auth.module';
import { AspNetPasswordService } from './aspnet-password.service';
import { AuthCompatibilityController } from './auth-compatibility.controller';
import { AuthCompatibilityService } from './auth-compatibility.service';

@Module({
  imports: [
    DatabaseModule,
    JwtAuthModule,
    TypeOrmModule.forFeature([MarketAccount]),
  ],
  controllers: [AuthCompatibilityController],
  providers: [AuthCompatibilityService, AspNetPasswordService],
})
export class AuthCompatibilityModule {}
