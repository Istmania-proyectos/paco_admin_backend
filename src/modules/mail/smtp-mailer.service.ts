import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import * as tls from 'tls';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class SmtpMailerService {
  constructor(private readonly config: ConfigService) {}

  async send(message: MailMessage): Promise<void> {
    const host = this.config.get<string>('EMAIL_SMTP_HOST');
    const user = this.config.get<string>('EMAIL_SMTP_USER');
    const password = this.config.get<string>('EMAIL_SMTP_PASSWORD');
    const from = this.config.get<string>('EMAIL_FROM') ?? user;
    const port = Number(this.config.get('EMAIL_SMTP_PORT') ?? 587);

    if (!host || !user || !password || !from) {
      throw new InternalServerErrorException(
        'Configuración SMTP incompleta: EMAIL_SMTP_HOST, EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD y EMAIL_FROM son requeridos',
      );
    }

    const socket = await this.connect(host, port);
    try {
      await this.expect(socket, [220]);
      await this.command(socket, 'EHLO paco-admin', [250]);
      await this.command(socket, 'STARTTLS', [220]);

      const secure = tls.connect({
        socket,
        servername: host,
        rejectUnauthorized:
          this.config.get('EMAIL_TLS_REJECT_UNAUTHORIZED') === 'true',
      });
      await new Promise<void>((resolve, reject) => {
        secure.once('secureConnect', resolve);
        secure.once('error', reject);
      });

      await this.command(secure, 'EHLO paco-admin', [250]);
      await this.command(secure, 'AUTH LOGIN', [334]);
      await this.command(secure, Buffer.from(user).toString('base64'), [334]);
      await this.command(secure, Buffer.from(password).toString('base64'), [
        235,
      ]);
      await this.command(secure, `MAIL FROM:<${from}>`, [250]);
      await this.command(secure, `RCPT TO:<${message.to}>`, [250, 251]);
      await this.command(secure, 'DATA', [354]);
      await this.command(secure, `${this.mime(from, message)}\r\n.`, [250]);
      await this.command(secure, 'QUIT', [221]);
      secure.end();
    } catch (error) {
      socket.destroy();
      throw new InternalServerErrorException(
        `No se pudo enviar correo: ${(error as Error).message}`,
      );
    }
  }

  private connect(host: string, port: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const socket = net.connect({ host, port }, () => resolve(socket));
      socket.setTimeout(
        Number(this.config.get('EMAIL_SMTP_TIMEOUT_MS') ?? 10000),
      );
      socket.once('timeout', () => reject(new Error('Timeout SMTP')));
      socket.once('error', reject);
    });
  }

  private command(
    socket: net.Socket | tls.TLSSocket,
    value: string,
    expected: number[],
  ) {
    socket.write(`${value}\r\n`);
    return this.expect(socket, expected);
  }

  private expect(
    socket: net.Socket | tls.TLSSocket,
    expected: number[],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let response = '';
      const onData = (chunk: Buffer) => {
        response += chunk.toString('utf8');
        const last = response.trimEnd().split(/\r?\n/).at(-1) ?? '';
        if (!/^\d{3} /.test(last)) return;

        socket.off('data', onData);
        socket.off('error', onError);
        const code = Number(last.slice(0, 3));
        code && expected.includes(code)
          ? resolve(response)
          : reject(new Error(response.trim()));
      };
      const onError = (error: Error) => {
        socket.off('data', onData);
        reject(error);
      };
      socket.on('data', onData);
      socket.once('error', onError);
    });
  }

  private mime(from: string, message: MailMessage): string {
    const subject = Buffer.from(message.subject).toString('base64');
    return [
      `From: "Paco Admin" <${from}>`,
      `To: ${message.to}`,
      `Subject: =?UTF-8?B?${subject}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      message.html,
    ].join('\r\n');
  }
}
