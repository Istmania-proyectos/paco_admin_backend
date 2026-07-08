import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SmtpMailerService } from '../mail/smtp-mailer.service';

export interface PacoParams {
  Opcion?: string;
  Option?: string;
  opcion?: string;
  param1?: string;
  param2?: string;
  param3?: string;
  param4?: string;
  param5?: string;
}

@Injectable()
export class PacoService {
  constructor(
    private readonly database: DatabaseService,
    private readonly mailer: SmtpMailerService,
  ) {}

  get(params: PacoParams) {
    return this.execute('PACO_GET_PEDIDOS', params);
  }

  post(value: unknown) {
    return this.execute('PACO_INSERT_PEDIDOS', {
      Opcion: '2',
      param1: typeof value === 'string' ? value : JSON.stringify(value),
    });
  }

  async sendMail(params: PacoParams) {
    const messages = await this.execute<{
      correo: string;
      titulo: string;
      body: string;
    }>('PACO_CORREO', params);

    for (const message of messages) {
      await this.mailer.send({
        to: message.correo,
        subject: message.titulo,
        html: message.body,
      });
    }
    return 'Envio de correo exitoso';
  }

  private execute<T = Record<string, unknown>>(
    procedure: string,
    params: PacoParams,
  ) {
    const option = params.Opcion ?? params.Option ?? params.opcion ?? '';
    const page = params.param2 || (option === '1' || option === '3' ? '1' : '');

    return this.database.executeProcedure<T>(procedure, {
      Option: option,
      Param1: params.param1 ?? '',
      Param2: page,
      Param3: params.param3 ?? '',
      Param4: params.param4 ?? '',
      Param5: params.param5 ?? '',
    });
  }
}
