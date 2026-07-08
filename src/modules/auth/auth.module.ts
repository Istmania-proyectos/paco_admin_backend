import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ApiUserGuard } from './api-user.guard';
import { AspNetPasswordService } from './aspnet-password.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IdentityService } from './identity.service';
import { JwtStrategy } from './jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const issuer = config.get<string>('JWT_ISSUER');
        const audience = config.get<string>('JWT_AUDIENCE');

        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: {
            ...(issuer ? { issuer } : {}),
            ...(audience ? { audience } : {}),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    IdentityService,
    AspNetPasswordService,
    JwtStrategy,
    ApiUserGuard,
  ],
  exports: [IdentityService, AspNetPasswordService, ApiUserGuard, JwtModule],
})
export class AuthModule {}
