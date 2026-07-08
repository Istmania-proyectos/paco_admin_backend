import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { AspNetPasswordService } from './aspnet-password.service';
import { CredentialsDto } from './dto/credentials.dto';
import { IdentityService } from './identity.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly identity: IdentityService,
    private readonly passwords: AspNetPasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(credentials: CredentialsDto) {
    const user = await this.identity.findByUserName(credentials.UserName, true);

    if (
      !user ||
      !this.passwords.verify(user.PasswordHash, credentials.Password)
    ) {
      throw new BadRequestException({
        login_failure: ['Correo o contraseña invalido'],
      });
    }
    if (!user.EmailConfirmed) {
      throw new BadRequestException({
        email_confirm: ['Correo registrado no esta confirmado'],
      });
    }

    const roles = await this.identity.getRoles(user.Id);
    const expiresIn = Number(this.config.get('JWT_EXPIRES_IN_SECONDS') ?? 7200);
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.UserName,
        jti: randomUUID(),
        id: user.Id,
        rol: 'api_access',
        roles: JSON.stringify(roles),
      },
      { expiresIn },
    );

    return {
      id: user.Id,
      access_token: accessToken,
      expires_in: expiresIn,
      roles: JSON.stringify(roles),
    };
  }
}
