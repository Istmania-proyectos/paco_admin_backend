import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { JwtPayload } from '../auth/jwt.strategy';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketActionDto } from './dto/ticket-action.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { SmtpMailerService } from '../mail/smtp-mailer.service';
import { ConfigService } from '@nestjs/config';
import { SellerTicketResponseDto } from './dto/seller-ticket-response.dto';

export interface TicketTransitionResult {
  IdTicket: string | number;
  NumeroTicket: string;
  Estado: string;
  FechaActualizacion?: Date;
}

interface TicketRecipient {
  IdTicket: string | number;
  UserId: string;
  Email: string;
  Nombre: string;
  Rol: string;
  NumeroTicket: string;
  Titulo: string;
  NombreCliente: string;
  Estado: string;
  EsVendedorExterno?: boolean | number;
}

interface NotificationLog {
  IdNotificacion: string | number;
}

interface SellerTokenLookup {
  TokenEstado: 'VALIDO' | 'USADO' | 'VENCIDO' | 'PROCESADO';
  NumeroTicket: string;
  CodigoCliente: string;
  NombreCliente: string;
  Titulo: string;
  Descripcion?: string;
  Estado: string;
  FechaCreacion: Date;
}

interface SellerResponseResult extends TicketTransitionResult {
  Resultado: 'OK' | 'NO_ENCONTRADO' | 'USADO' | 'VENCIDO' | 'PROCESADO';
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly mailer: SmtpMailerService,
    private readonly config: ConfigService,
  ) {}

  get(query: TicketQueryDto, user: JwtPayload) {
    return this.database.executeProcedure('PACO_GET_TICKET', {
      Option: query.opcion ?? '1',
      Param1: query.param1 ?? '',
      Param2: query.param2 ?? '1',
      Param3: query.param3 ?? '',
      Param4: query.param4 ?? '',
      Param5: query.param5 ?? user.id,
    });
  }

  async create(dto: CreateTicketDto, user: JwtPayload) {
    const result = await this.database.executeProcedure<TicketTransitionResult>(
      'PACO_INSERT_TICKET',
      {
        Option: '1',
        Param1: JSON.stringify(dto),
        Param2: user.id,
        Param3: user.sub ?? '',
        Param4: user.roles ?? '',
        Param5: '',
      },
    );
    if (result[0]) await this.notifySafely(result[0]);
    return result;
  }

  async transition(id: string, dto: TicketActionDto, user: JwtPayload) {
    const result = await this.database.executeProcedure<TicketTransitionResult>(
      'PACO_INSERT_TICKET',
      {
        Option: '2',
        Param1: id,
        Param2: JSON.stringify(dto),
        Param3: user.id,
        Param4: user.sub ?? '',
        Param5: user.roles ?? '',
      },
    );

    const transition = result[0];
    if (transition) await this.notifySafely(transition);
    return result;
  }

  async getSellerTicket(token: string) {
    const result = await this.database.executeProcedure<SellerTokenLookup>(
      'PACO_GET_TICKET',
      {
        Option: '7',
        Param1: this.hashToken(token),
        Param2: '',
        Param3: '',
        Param4: '',
        Param5: '',
      },
    );
    const ticket = result[0];
    if (!ticket) throw new NotFoundException('Token inexistente.');
    this.assertSellerTokenStatus(ticket.TokenEstado);
    const { TokenEstado: _tokenStatus, ...response } = ticket;
    return response;
  }

  async respondAsSeller(dto: SellerTicketResponseDto) {
    const result = await this.database.executeProcedure<SellerResponseResult>(
      'PACO_INSERT_TICKET',
      {
        Option: '6',
        Param1: this.hashToken(dto.token),
        Param2: dto.accion,
        Param3: dto.comentario,
        Param4: '',
        Param5: '',
      },
    );
    const response = result[0];
    if (!response || response.Resultado === 'NO_ENCONTRADO') {
      throw new NotFoundException('Token inexistente.');
    }
    this.assertSellerTokenStatus(response.Resultado);
    if (response.Estado === 'REABIERTO_URGENTE') {
      await this.notifySafely(response);
    }
    return {
      NumeroTicket: response.NumeroTicket,
      Estado: response.Estado,
    };
  }

  private async notifyNextRecipients(transition: TicketTransitionResult) {
    const recipients = await this.database.executeProcedure<TicketRecipient>(
      'PACO_GET_TICKET',
      {
        Option: '6',
        Param1: String(transition.IdTicket),
        Param2: '',
        Param3: '',
        Param4: '',
        Param5: '',
      },
    );

    for (const recipient of recipients) {
      await this.sendAndLog(recipient);
    }
  }

  private async notifySafely(transition: TicketTransitionResult) {
    try {
      await this.notifyNextRecipients(transition);
    } catch (error) {
      this.logger.error(
        `No se pudo preparar la notificación del ticket ${transition.NumeroTicket}: ${(error as Error).message}`,
      );
    }
  }

  private async sendAndLog(recipient: TicketRecipient) {
    const logs = await this.database.executeProcedure<NotificationLog>(
      'PACO_INSERT_TICKET',
      {
        Option: '3',
        Param1: String(recipient.IdTicket),
        Param2: recipient.Email,
        Param3: recipient.Estado,
        Param4: String(recipient.NumeroTicket),
        Param5: String(recipient.UserId),
      },
    );
    const logId = logs[0]?.IdNotificacion;
    if (!logId) return;

    try {
      const sellerToken = recipient.EsVendedorExterno
        ? await this.createSellerToken(recipient)
        : undefined;
      await this.mailer.send({
        to: recipient.Email,
        subject: `Ticket ${recipient.NumeroTicket}: requiere su atención`,
        html: sellerToken
          ? this.sellerEmailTemplate(recipient, sellerToken)
          : this.emailTemplate(recipient),
      });
      await this.finishNotification(logId, 'ENVIADO', '');
    } catch (error) {
      await this.finishNotification(
        logId,
        'ERROR',
        (error as Error).message.slice(0, 2000),
      );
    }
  }

  private async createSellerToken(recipient: TicketRecipient) {
    const token = randomBytes(32).toString('base64url');
    const hours = Number(
      this.config.get('TICKETS_SELLER_TOKEN_EXPIRATION_HOURS') ?? 72,
    );
    const expiration = new Date(Date.now() + hours * 60 * 60 * 1000);
    await this.database.executeProcedure('PACO_INSERT_TICKET', {
      Option: '5',
      Param1: String(recipient.IdTicket),
      Param2: this.hashToken(token),
      Param3: expiration.toISOString(),
      Param4: recipient.Email,
      Param5: recipient.UserId,
    });
    return token;
  }

  private finishNotification(
    id: string | number,
    status: 'ENVIADO' | 'ERROR',
    error: string,
  ) {
    return this.database.executeProcedure('PACO_INSERT_TICKET', {
      Option: '4',
      Param1: String(id),
      Param2: status,
      Param3: error,
      Param4: '',
      Param5: '',
    });
  }

  private emailTemplate(recipient: TicketRecipient) {
    const baseUrl = this.config.get<string>('TICKETS_FRONTEND_URL') ?? '';
    const url = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/${recipient.IdTicket}`
      : '';
    const link = url
      ? `<p><a href="${this.escape(url)}">Abrir ticket</a></p>`
      : '';

    return [
      `<p>Hola ${this.escape(recipient.Nombre || recipient.Email)},</p>`,
      '<p>Un ticket avanzó en el flujo y requiere su atención.</p>',
      `<p><strong>Ticket:</strong> ${this.escape(recipient.NumeroTicket)}<br>`,
      `<strong>Cliente:</strong> ${this.escape(recipient.NombreCliente)}<br>`,
      `<strong>Asunto:</strong> ${this.escape(recipient.Titulo)}<br>`,
      `<strong>Estado:</strong> ${this.escape(recipient.Estado)}</p>`,
      link,
      '<p>Este mensaje fue generado automáticamente por PACO Admin.</p>',
    ].join('');
  }

  private sellerEmailTemplate(recipient: TicketRecipient, token: string) {
    const baseUrl = this.config.get<string>('TICKETS_SELLER_RESPONSE_URL');
    if (!baseUrl) {
      throw new Error('TICKETS_SELLER_RESPONSE_URL no está configurado.');
    }
    const link = baseUrl
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : '';
    return [
      `<p>Hola ${this.escape(recipient.Nombre || 'Vendedor')},</p>`,
      '<p>El plan de acción fue ejecutado. Confirme si la solución fue satisfactoria o si el ticket debe reabrirse.</p>',
      `<p><strong>Ticket:</strong> ${this.escape(recipient.NumeroTicket)}<br>`,
      `<strong>Cliente:</strong> ${this.escape(recipient.NombreCliente)}<br>`,
      `<strong>Asunto:</strong> ${this.escape(recipient.Titulo)}</p>`,
      link
        ? `<p><a href="${this.escape(link)}">Responder ticket</a></p>`
        : '<p>No se configuró la URL pública de respuesta.</p>',
      '<p>El enlace es personal, de un solo uso y tiene vencimiento.</p>',
    ].join('');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private assertSellerTokenStatus(status: string) {
    if (status === 'VENCIDO') throw new GoneException('Token vencido.');
    if (status === 'USADO' || status === 'PROCESADO') {
      throw new ConflictException('El token ya fue utilizado o el ticket fue procesado.');
    }
  }

  private escape(value: unknown) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
