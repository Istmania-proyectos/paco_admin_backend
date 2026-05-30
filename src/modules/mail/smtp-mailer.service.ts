import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as net from 'net';
import * as tls from 'tls';

type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
};

@Injectable()
export class SmtpMailerService {
  private readConfig() {
    const host = process.env.EMAIL_SMTP_HOST;
    const port = Number(process.env.EMAIL_SMTP_PORT ?? 587);
    const user = process.env.EMAIL_SMTP_USER;
    const password = process.env.EMAIL_SMTP_PASSWORD;
    const from = process.env.EMAIL_FROM ?? user;

    if (!host || !user || !password || !from) {
      throw new InternalServerErrorException(
        'Configuracion SMTP incompleta: EMAIL_SMTP_HOST, EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD y EMAIL_FROM son requeridos',
      );
    }

    return { host, port, user, password, from };
  }

  async send(message: MailMessage): Promise<void> {
    const config = this.readConfig();
    const socket = await this.connect(config.host, config.port);

    try {
      await this.expect(socket, [220]);
      await this.command(
        socket,
        `EHLO ${process.env.EMAIL_HELO_HOST ?? 'localhost'}`,
        [250],
      );
      await this.command(socket, 'STARTTLS', [220]);

      const secureSocket = tls.connect({
        socket,
        servername: config.host,
        rejectUnauthorized:
          process.env.EMAIL_TLS_REJECT_UNAUTHORIZED === 'true',
      });

      await new Promise<void>((resolve, reject) => {
        secureSocket.once('secureConnect', resolve);
        secureSocket.once('error', reject);
      });

      await this.command(
        secureSocket,
        `EHLO ${process.env.EMAIL_HELO_HOST ?? 'localhost'}`,
        [250],
      );
      await this.command(secureSocket, 'AUTH LOGIN', [334]);
      await this.command(
        secureSocket,
        Buffer.from(config.user).toString('base64'),
        [334],
      );
      await this.command(
        secureSocket,
        Buffer.from(config.password).toString('base64'),
        [235],
      );

      const recipients = Array.isArray(message.to) ? message.to : [message.to];
      await this.command(secureSocket, `MAIL FROM:<${config.from}>`, [250]);

      for (const recipient of recipients) {
        await this.command(secureSocket, `RCPT TO:<${recipient}>`, [250, 251]);
      }

      await this.command(secureSocket, 'DATA', [354]);
      await this.command(
        secureSocket,
        `${this.buildMimeMessage(config.from, recipients, message)}\r\n.`,
        [250],
      );
      await this.command(secureSocket, 'QUIT', [221]);
      secureSocket.end();
    } catch (error) {
      socket.destroy();
      throw new InternalServerErrorException(
        `No se pudo enviar correo: ${error.message}`,
      );
    }
  }

  private connect(host: string, port: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const socket = net.connect({ host, port }, () => resolve(socket));
      socket.setTimeout(Number(process.env.EMAIL_SMTP_TIMEOUT_MS ?? 10000));
      socket.once('timeout', () => reject(new Error('Timeout SMTP')));
      socket.once('error', reject);
    });
  }

  private command(
    socket: net.Socket | tls.TLSSocket,
    value: string,
    expectedCodes: number[],
  ): Promise<string> {
    socket.write(`${value}\r\n`);
    return this.expect(socket, expectedCodes);
  }

  private expect(
    socket: net.Socket | tls.TLSSocket,
    expectedCodes: number[],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let response = '';

      const onData = (chunk: Buffer) => {
        response += chunk.toString('utf8');
        const lines = response.trimEnd().split(/\r?\n/);
        const lastLine = lines[lines.length - 1] ?? '';

        if (!/^\d{3} /.test(lastLine)) {
          return;
        }

        socket.off('data', onData);
        socket.off('error', onError);

        const code = Number(lastLine.slice(0, 3));
        if (expectedCodes.includes(code)) {
          resolve(response);
          return;
        }

        reject(new Error(response.trim()));
      };

      const onError = (error: Error) => {
        socket.off('data', onData);
        reject(error);
      };

      socket.on('data', onData);
      socket.once('error', onError);
    });
  }

  private buildMimeMessage(
    from: string,
    recipients: string[],
    message: MailMessage,
  ): string {
    const encodedSubject = `=?UTF-8?B?${Buffer.from(message.subject).toString(
      'base64',
    )}?=`;

    return [
      `From: "Market Online" <${from}>`,
      `To: ${recipients.join(', ')}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      message.html,
    ].join('\r\n');
  }
}
