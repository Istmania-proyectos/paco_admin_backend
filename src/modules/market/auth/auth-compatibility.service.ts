import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketAccount } from '../../database/market-entities/market-account.entity';
import { AspNetPasswordService } from './aspnet-password.service';

type Credentials = {
  UserName?: string;
  Password?: string;
};

@Injectable()
export class AuthCompatibilityService {
  constructor(
    @InjectRepository(MarketAccount)
    private readonly accountRepo: Repository<MarketAccount>,
    private readonly passwordService: AspNetPasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async post(credentials: Credentials) {
    const account = await this.accountRepo
      .createQueryBuilder('user')
      .addSelect('user.PasswordHash')
      .where(
        '(user.UserName = :username OR user.Email = :email OR user.NormalizedUserName = :normalized OR user.NormalizedEmail = :normalized)',
        {
          username: credentials.UserName,
          email: credentials.UserName,
          normalized: credentials.UserName?.toUpperCase(),
        },
      )
      .getOne();

    if (
      !account ||
      !this.passwordService.verifyPassword(
        account.PasswordHash,
        credentials.Password,
      )
    ) {
      throw new HttpException('Correo o contraseña invalido', 400);
    }

    if (!account.EmailConfirmed) {
      throw new HttpException('Correo registrado no esta confirmado', 400);
    }

    const roles = await this.accountRepo.manager.query(
      `SELECT r.[Name]
       FROM [dbo].[AspNetUserRoles] ur
       INNER JOIN [dbo].[AspNetRoles] r ON r.[Id] = ur.[RoleId]
       WHERE ur.[UserId] = @0`,
      [account.Id],
    );

    const roleNames = roles.map((role) => role.Name);
    const token = this.jwtService.sign({
      username: account.UserName,
      email: account.Email,
      userId: account.Id,
      sub: account.UserName,
      id: account.Id,
      roles: JSON.stringify(roleNames),
    });

    return JSON.stringify(
      {
        id: account.Id,
        access_token: token,
        expires_in: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 7200),
        roles: JSON.stringify(roleNames),
      },
      null,
      2,
    );
  }

  loginDelivery(credentials: Credentials) {
    return this.post(credentials);
  }

  externalLogin() {
    return '';
  }

  getUserClaims(user: any) {
    return user ?? {};
  }
}
