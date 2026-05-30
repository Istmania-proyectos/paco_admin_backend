import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { MarketAccount } from '../../database/market-entities/market-account.entity';
import { SmtpMailerService } from '../../mail/smtp-mailer.service';
import { MarketService } from '../../database/market/market.service';
import { AspNetPasswordService } from '../auth/aspnet-password.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly marketService: MarketService,
    @InjectRepository(MarketAccount)
    private readonly accountRepo: Repository<MarketAccount>,
    private readonly passwordService: AspNetPasswordService,
    private readonly mailerService: SmtpMailerService,
    private readonly jwtService: JwtService,
  ) {}

  private response(success: boolean, msg: string) {
    return { success, msg, error: '' };
  }

  async post(model: { Email?: string; Password?: string }) {
    const account = this.accountRepo.create({
      Id: randomUUID(),
      Email: model.Email,
      NormalizedEmail: model.Email?.toUpperCase(),
      UserName: model.Email,
      NormalizedUserName: model.Email?.toUpperCase(),
      EmailConfirmed: false,
      PasswordHash: this.passwordService.hashPassword(model.Password),
      SecurityStamp: randomUUID(),
      ConcurrencyStamp: randomUUID(),
      PhoneNumberConfirmed: false,
      TwoFactorEnabled: false,
      LockoutEnabled: true,
      AccessFailedCount: 0,
      CreationDate: new Date(),
    });

    const savedAccount = await this.accountRepo.save(account);

    await this.sendConfirmationEmail(model.Email);

    delete savedAccount.PasswordHash;
    return savedAccount;
  }

  getDireccion() {
    return this.marketService.getAccounts({ option: 1 });
  }

  getDireccionUser(idUser: string) {
    return this.marketService.getAccounts({
      option: 2,
      param1: idUser,
    });
  }

  async generateConfirmEmail(model: { Email?: string }) {
    await this.sendConfirmationEmail(model.Email);
    return this.response(true, 'Confirmacion de correo exitoso');
  }

  async confirmEmail(model: { Email?: string; Token?: string }) {
    try {
      const payload = this.jwtService.verify(model.Token, {
        secret: process.env.JWT_SECRET,
      }) as { email?: string; purpose?: string };

      if (
        payload?.purpose !== 'email-confirmation' ||
        payload?.email !== model.Email
      ) {
        return this.response(false, 'Token no valido');
      }
    } catch {
      return this.response(false, 'Token no valido');
    }

    await this.accountRepo.update(
      { Email: model.Email },
      {
        EmailConfirmed: true,
        SecurityStamp: randomUUID(),
      },
    );

    return this.response(true, 'Confirmacion de correo exitoso');
  }

  async resetPassword(model: {
    Email?: string;
    Token?: string;
    Password?: string;
  }) {
    let payload: { email?: string; purpose?: string };

    try {
      payload = this.jwtService.verify(model.Token, {
        secret: process.env.JWT_SECRET,
      }) as { email?: string; purpose?: string };
    } catch {
      return this.response(false, 'Token no valido');
    }

    if (
      payload?.purpose !== 'password-reset' ||
      payload?.email !== model.Email
    ) {
      return this.response(false, 'Token no valido');
    }

    await this.resetPasswordByEmail(model.Email, model.Password);
    return this.response(true, 'Cambio exitoso');
  }

  async forgotPassword(model: { Email?: string }) {
    const exists = await this.existsByEmail(model.Email);
    if (!exists) {
      return this.response(false, 'Correo no valido');
    }

    await this.sendRestorePasswordEmail(model.Email, false);
    return this.response(true, 'Correo Valido');
  }

  async forgotPasswordAdmin(model: { Email?: string }) {
    const exists = await this.existsByEmail(model.Email);
    if (!exists) {
      return this.response(false, 'Correo no valido');
    }

    await this.sendRestorePasswordEmail(model.Email, true);
    return this.response(true, 'Correo Valido');
  }

  private async existsByEmail(email: string) {
    const total = await this.accountRepo.count({ where: { Email: email } });
    return total > 0;
  }

  private async resetPasswordByEmail(email: string, password: string) {
    const account = await this.accountRepo.findOne({ where: { Email: email } });

    if (!account) {
      return;
    }

    account.PasswordHash = this.passwordService.hashPassword(password);
    account.SecurityStamp = randomUUID();

    await this.accountRepo.save(account);
  }

  async sendRestorePasswordEmail(email: string, admin: boolean) {
    const token = this.jwtService.sign(
      { email, purpose: 'password-reset' },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN ?? '2h',
      },
    );

    const callback = this.buildFrontendUrl('restorePassword', { token, email });
    const html = this.buildRestorePasswordTemplate(callback);

    await this.mailerService.send({
      to: admin ? process.env.EMAIL_ADMIN_TO ?? 'online@istmania.hn' : email,
      subject: admin
        ? 'Restaurando Contraseña Admin'
        : 'Restaurando Contraseña',
      html,
    });
  }

  private async sendConfirmationEmail(email: string) {
    const token = this.jwtService.sign(
      { email, purpose: 'email-confirmation' },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.EMAIL_CONFIRM_TOKEN_EXPIRES_IN ?? '7d',
      },
    );

    const callback = this.buildFrontendUrl('confirmEmail', { token, email });

    await this.mailerService.send({
      to: email,
      subject: 'Validando Correo',
      html: this.buildConfirmEmailTemplate(callback),
    });
  }

  private buildFrontendUrl(path: string, params: Record<string, string>) {
    const baseUrl =
      process.env.MARKET_FRONTEND_URL ??
      process.env.ISTMA_FRONTEND_URL ??
      'https://market.istmania.hn';
    const url = new URL(path, `${baseUrl.replace(/\/$/, '')}/`);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  private buildConfirmEmailTemplate(callback: string) {
    return `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2>Validacion de correo</h2>
        <p>Para activar tu cuenta, abre el siguiente enlace:</p>
        <p><a href="${callback}">Confirmar correo</a></p>
      </div>
    `;
  }

  private buildRestorePasswordTemplate(callback: string) {
    return `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2>Restauracion de contraseña</h2>
        <p>Para cambiar tu contraseña, abre el siguiente enlace:</p>
        <p><a href="${callback}">Restaurar contraseña</a></p>
      </div>
    `;
  }
}
