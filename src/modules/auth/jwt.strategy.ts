import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  id: string;
  rol: string;
  roles: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const issuer = config.get<string>('JWT_ISSUER');
    const audience = config.get<string>('JWT_AUDIENCE');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
