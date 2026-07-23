import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
  OnModuleInit,
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
import { ApprovalTicketResponseDto } from './dto/approval-ticket-response.dto';

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

interface TicketDelivery {
  to: string;
  intendedTo: string;
  isDemo: boolean;
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
export class TicketsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TicketsService.name);
  private automationTimer?: NodeJS.Timeout;
  private automationRunning = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly mailer: SmtpMailerService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.config.get('TICKETS_AUTOMATION_ENABLED') !== 'true') return;

    const configuredMinutes = Number(
      this.config.get('TICKETS_AUTOMATION_INTERVAL_MINUTES') ?? 60,
    );
    const intervalMinutes = Math.max(
      5,
      Number.isFinite(configuredMinutes) ? configuredMinutes : 60,
    );
    this.automationTimer = setInterval(
      () => void this.runScheduledAutomation(),
      intervalMinutes * 60_000,
    );
    this.automationTimer.unref();
    this.logger.log(
      `Automatización de tickets habilitada cada ${intervalMinutes} minutos.`,
    );
  }

  onApplicationShutdown() {
    if (this.automationTimer) clearInterval(this.automationTimer);
  }

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

  getCheckinResponses(formulario: number) {
    return this.database.executeProcedure('PACO_GET_TICKET_CHECKIN', {
      Formulario: String(
        Number.isInteger(formulario) && formulario > 0 ? formulario : 14,
      ),
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
    if (
      result[0] &&
      (dto.correoJefeMarca || dto.correoMercadeo || dto.correoGerenciaGeneral)
    ) {
      await this.database.executeProcedure('PACO_TICKET_CONFIGURAR_CORREOS', {
        IdTicket: String(result[0].IdTicket),
        Jefe: dto.correoJefeMarca ?? '',
        Mercadeo: dto.correoMercadeo ?? '',
        Gerencia: dto.correoGerenciaGeneral ?? '',
      });
    }
    if (result[0]) await this.notifySafely(result[0]);
    return result;
  }

  async runCheckinAutomation(
    execute: boolean,
    formulario = 14,
    filters?: { respuesta?: number; dependencia?: string },
    executionOptions?: { limitTickets?: number; demoEmail?: string },
  ) {
    const demoEmail = executionOptions?.demoEmail?.trim() ?? '';
    const rows = await this.database.executeProcedure<any>(
      'PACO_TICKET_AUTOMATIZAR_CHECKIN',
      {
        Formulario: String(formulario),
        Ejecutar: execute ? '1' : '0',
        CorreoMercadeo:
          this.config.get<string>('TICKETS_MARKETING_MANAGER_EMAIL') || '',
        CorreoGerencia:
          this.config.get<string>('TICKETS_GENERAL_MANAGER_EMAIL') || '',
        UsuarioSistema:
          this.config.get<string>('TICKETS_AUTOMATION_USER_ID') ??
          'AUTOMATIZACION_CHECKIN',
        LimiteTickets: String(executionOptions?.limitTickets ?? 0),
        CorreoDemo: demoEmail,
      },
    );
    const filteredRows = rows.filter((row) => {
      const dependencyMatches =
        !filters?.dependencia ||
        String(row.DependenciaRespuesta) === String(filters.dependencia);
      const responseMatches =
        !filters?.respuesta ||
        String(row.Respuestas ?? '')
          .split(',')
          .map((value) => value.trim())
          .includes(String(filters.respuesta));
      return dependencyMatches && responseMatches;
    });

    if (execute) {
      for (const row of filteredRows) {
        if (row.IdTicket && Number(row.RequiereNotificacion) === 1) {
          await this.notifySafely(row);
        }
      }
    }

    return {
      modo: execute ? 'EJECUCION' : 'SIMULACION',
      creaTickets: execute,
      enviaCorreos: execute,
      filtros: filters ?? {},
      grupos: filteredRows,
    };
  }

  async getDemoStatus() {
    const rows = await this.database.query<{
      TicketsDemo: number;
      CorreoDemo: string | null;
    }>(`
      SELECT
        COUNT(*) TicketsDemo,
        MAX(CorreoDemo) CorreoDemo
      FROM dbo.tbl_Ticket
      WHERE EsDemo = 1
    `);
    return {
      activo: Number(rows[0]?.TicketsDemo ?? 0) > 0,
      ticketsDemo: Number(rows[0]?.TicketsDemo ?? 0),
      correoDemo:
        rows[0]?.CorreoDemo ??
        this.config.get<string>('TICKETS_DEMO_EMAIL') ??
        '',
      limiteTickets: 2,
    };
  }

  async startDemo(code: string, user: JwtPayload) {
    const demoEmail = this.assertDemoAccess(code, user);

    const current = await this.getDemoStatus();
    if (current.ticketsDemo > 0) {
      throw new ConflictException(
        'Ya existen tickets de demostración activos. Resuélvalos o límpielos antes de iniciar otra demo.',
      );
    }

    const result = await this.runCheckinAutomation(true, 14, undefined, {
      limitTickets: 2,
      demoEmail,
    });
    const created = result.grupos.filter(
      (row: any) =>
        row.IdTicket &&
        ['CREADO', 'ACTUALIZADO'].includes(String(row.EstadoResultado)),
    );
    if (!created.length) {
      throw new ConflictException(
        'No se encontraron grupos válidos disponibles para crear la demostración.',
      );
    }
    return {
      modo: 'DEMO',
      correoDemo: demoEmail,
      limiteSolicitado: 2,
      ticketsCreados: created.length,
      tickets: created.map((row: any) => ({
        IdTicket: row.IdTicket,
        NumeroTicket: row.NumeroTicket,
        DependenciaRespuesta: row.DependenciaRespuesta,
        Respuestas: row.Respuestas,
        RolInicial: 'JEFE_MARCA',
      })),
    };
  }

  async clearDemo(code: string, user: JwtPayload) {
    const demoEmail = this.assertDemoAccess(code, user);
    const rows = await this.database.executeProcedure<{
      TicketsEliminados: number;
      IdRespaldo?: string;
    }>('PACO_TICKET_DEMO_LIMPIAR', { CorreoDemo: demoEmail });
    return {
      eliminados: Number(rows[0]?.TicketsEliminados ?? 0),
      idRespaldo: rows[0]?.IdRespaldo ?? null,
    };
  }

  private assertDemoAccess(code: string, user: JwtPayload) {
    const demoEmail =
      this.config.get<string>('TICKETS_DEMO_EMAIL') ??
      'yovanni.amador@istmania.hn';
    if (code.trim().toUpperCase() !== 'TEST') {
      throw new ConflictException(
        'Escriba TEST para confirmar esta operación.',
      );
    }
    if (
      String(user.sub ?? '')
        .trim()
        .toLowerCase() !== demoEmail.toLowerCase()
    ) {
      throw new ConflictException(
        `El modo demostración está reservado para ${demoEmail}.`,
      );
    }
    return demoEmail;
  }

  async runMonthlyRenewals(execute: boolean, days = 30) {
    const rows = await this.database.executeProcedure<any>(
      'PACO_TICKET_RENOVAR_MENSUAL',
      {
        Ejecutar: execute ? '1' : '0',
        Dias: String(days),
        UsuarioSistema:
          this.config.get<string>('TICKETS_AUTOMATION_USER_ID') ??
          'AUTOMATIZACION_CHECKIN',
      },
    );

    if (execute) {
      for (const row of rows) {
        if (row.IdTicket && Number(row.RequiereNotificacion) === 1) {
          await this.notifySafely(row);
        }
      }
    }

    return {
      modo: execute ? 'EJECUCION' : 'SIMULACION',
      creaTickets: execute,
      enviaCorreos: execute,
      diasSinResolver: days,
      renovaciones: rows,
    };
  }

  private async runScheduledAutomation() {
    if (this.automationRunning) {
      this.logger.warn(
        'Se omitió un ciclo de automatización porque el anterior sigue activo.',
      );
      return;
    }

    this.automationRunning = true;
    const execute = this.config.get('TICKETS_AUTOMATION_DRY_RUN') === 'false';
    try {
      const formulario = Number(
        this.config.get('TICKETS_AUTOMATION_FORM_ID') ?? 14,
      );
      const renewalDays = Number(
        this.config.get('TICKETS_AUTOMATION_RENEWAL_DAYS') ?? 30,
      );
      const imported = await this.runCheckinAutomation(execute, formulario);
      const renewed = await this.runMonthlyRenewals(execute, renewalDays);
      this.logger.log(
        `Ciclo ${execute ? 'real' : 'simulado'}: ${
          imported.grupos.length
        } grupos CheckIn y ${renewed.renovaciones.length} renovaciones.`,
      );
    } catch (error) {
      this.logger.error(
        `Falló el ciclo de automatización: ${(error as Error).message}`,
      );
    } finally {
      this.automationRunning = false;
    }
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

  async resendNotification(id: string) {
    const rows = await this.database.executeProcedure<TicketTransitionResult>(
      'PACO_GET_TICKET',
      {
        Option: '2',
        Param1: id,
        Param2: '',
        Param3: '',
        Param4: '',
        Param5: '',
      },
    );
    const ticket = rows[0];
    if (!ticket) throw new NotFoundException('Ticket inexistente.');
    await this.notifySafely(ticket);
    return { reenviado: true, numeroTicket: ticket.NumeroTicket };
  }

  async getApprovalTicket(token: string) {
    const rows = await this.database.executeProcedure<any>(
      'PACO_TICKET_GET_APROBACION',
      { Hash: this.hashToken(token) },
    );
    const item = rows[0];
    if (!item) throw new NotFoundException('Enlace inexistente.');
    this.assertSellerTokenStatus(item.TokenEstado);
    return item;
  }
  async respondApproval(dto: ApprovalTicketResponseDto) {
    const { token, ...body } = dto;
    const rows = await this.database.executeProcedure<any>(
      'PACO_TICKET_RESPONDER_APROBACION',
      { Hash: this.hashToken(token), Json: JSON.stringify(body) },
    );
    const result = rows[0];
    if (result) await this.notifySafely(result);
    return { estado: result?.Estado };
  }

  private async notifyNextRecipients(transition: TicketTransitionResult) {
    const manual = await this.database.executeProcedure<any>(
      'PACO_TICKET_DESTINO_CORREO',
      { IdTicket: String(transition.IdTicket) },
    );
    if (manual[0]?.CorreoDestino && manual[0]?.Etapa) {
      await this.sendApprovalEmail(manual[0]);
      return;
    }
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

    if (!recipients.length && transition.Estado === 'PENDIENTE_CIERRE') {
      const tickets = await this.database.executeProcedure<any>(
        'PACO_GET_TICKET',
        {
          Option: '2',
          Param1: String(transition.IdTicket),
          Param2: '',
          Param3: '',
          Param4: '',
          Param5: '',
        },
      );
      const ticket = tickets[0];
      const fallbackEmail =
        ticket?.CorreoVendedor ||
        (Number(ticket?.EsDemo ?? 0) === 1 ? ticket?.CorreoDemo : '');
      if (!fallbackEmail) {
        throw new Error(
          `El ticket ${transition.NumeroTicket} está pendiente de cierre pero no tiene correo de vendedor.`,
        );
      }
      recipients.push({
        IdTicket: ticket.IdTicket,
        UserId: ticket.CodigoVendedor || `VENDEDOR-TICKET-${ticket.IdTicket}`,
        Email: fallbackEmail,
        Nombre: ticket.NombreVendedor || 'Vendedor',
        Rol: 'VENDEDOR_EXTERNO',
        NumeroTicket: ticket.NumeroTicket,
        Titulo: ticket.Titulo,
        NombreCliente: ticket.NombreCliente,
        Estado: ticket.Estado,
        EsVendedorExterno: true,
      });
    }

    for (const recipient of recipients) {
      await this.sendAndLog(recipient);
    }
  }

  private async sendApprovalEmail(target: any) {
    const delivery = await this.resolveDelivery(
      target.IdTicket,
      target.CorreoDestino,
    );
    const token = randomBytes(32).toString('base64url');
    const expiration = new Date(
      Date.now() +
        Number(
          this.config.get('TICKETS_APPROVAL_TOKEN_EXPIRATION_HOURS') ?? 120,
        ) *
          3600000,
    );
    await this.database.executeProcedure(
      'PACO_TICKET_EMITIR_TOKEN_APROBACION',
      {
        IdTicket: String(target.IdTicket),
        Etapa: target.Etapa,
        Correo: delivery.to,
        Hash: this.hashToken(token),
        Expira: expiration.toISOString(),
      },
    );
    const base = this.config.get<string>('TICKETS_APPROVAL_RESPONSE_URL');
    if (!base)
      throw new Error('TICKETS_APPROVAL_RESPONSE_URL no esta configurado.');
    const link = `${base}${
      base.includes('?') ? '&' : '?'
    }token=${encodeURIComponent(token)}`;
    const action =
      target.Etapa === 'JEFE_MARCA'
        ? 'definir el plan de acción'
        : target.Etapa === 'EJECUCION'
        ? target.Estado === 'PLAN_APROBADO'
          ? 'iniciar la ejecución del plan'
          : 'solicitar el cierre al vendedor'
        : 'aprobar o rechazar el plan';
    const role = this.roleLabel(target.Etapa);
    const answers = await this.flowSummary(target.IdTicket);
    await this.mailer.send({
      to: delivery.to,
      subject: `${delivery.isDemo ? '[DEMO] ' : ''}Ticket ${
        target.NumeroTicket
      }: acción requerida - ${role}`,
      html: `${this.demoBanner(delivery, role)}<p>Hola ${this.escape(
        role,
      )},</p><p>Su rol en este ticket es: <strong>${this.escape(
        role,
      )}</strong>.</p><p>El ticket <strong>${this.escape(
        target.NumeroTicket,
      )}</strong> requiere ${action}.</p>${answers}<p><a href="${this.escape(
        link,
      )}">Abrir ticket y responder</a></p><p>Este enlace es personal, de un solo uso y tiene vencimiento.</p>`,
    });
  }

  private async notifySafely(transition: TicketTransitionResult) {
    try {
      await this.notifyNextRecipients(transition);
    } catch (error) {
      this.logger.error(
        `No se pudo preparar la notificación del ticket ${
          transition.NumeroTicket
        }: ${(error as Error).message}`,
      );
    }
  }

  private async sendAndLog(recipient: TicketRecipient) {
    const delivery = await this.resolveDelivery(
      recipient.IdTicket,
      recipient.Email,
    );
    const deliveredRecipient: TicketRecipient = {
      ...recipient,
      Email: delivery.to,
    };
    const logs = await this.database.executeProcedure<NotificationLog>(
      'PACO_INSERT_TICKET',
      {
        Option: '3',
        Param1: String(recipient.IdTicket),
        Param2: delivery.to,
        Param3: recipient.Estado,
        Param4: String(recipient.NumeroTicket),
        Param5: String(recipient.UserId),
      },
    );
    const logId = logs[0]?.IdNotificacion;
    if (!logId) return;

    try {
      const sellerToken = deliveredRecipient.EsVendedorExterno
        ? await this.createSellerToken(deliveredRecipient)
        : undefined;
      const answers = await this.flowSummary(recipient.IdTicket);
      await this.mailer.send({
        to: delivery.to,
        subject: `${delivery.isDemo ? '[DEMO] ' : ''}Ticket ${
          recipient.NumeroTicket
        }: acción requerida - ${this.roleLabel(
          recipient.EsVendedorExterno ? 'VENDEDOR' : recipient.Rol,
        )}`,
        html: sellerToken
          ? this.sellerEmailTemplate(
              deliveredRecipient,
              sellerToken,
              this.demoBanner(delivery, 'VENDEDOR') + answers,
            )
          : this.emailTemplate(
              deliveredRecipient,
              this.demoBanner(delivery, recipient.Rol) + answers,
            ),
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

  private emailTemplate(recipient: TicketRecipient, answers: string) {
    const baseUrl = this.config.get<string>('TICKETS_FRONTEND_URL') ?? '';
    const url = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/${recipient.IdTicket}`
      : '';
    const link = url
      ? `<p><a href="${this.escape(url)}">Abrir ticket</a></p>`
      : '';

    return [
      `<p>Hola ${this.escape(recipient.Nombre || recipient.Email)},</p>`,
      `<p>Su rol en este ticket es: <strong>${this.escape(
        this.roleLabel(recipient.Rol),
      )}</strong>.</p>`,
      '<p>Un ticket avanzó en el flujo y requiere su atención.</p>',
      `<p><strong>Ticket:</strong> ${this.escape(recipient.NumeroTicket)}<br>`,
      `<strong>Cliente:</strong> ${this.escape(recipient.NombreCliente)}<br>`,
      `<strong>Asunto:</strong> ${this.escape(recipient.Titulo)}<br>`,
      `<strong>Estado:</strong> ${this.escape(recipient.Estado)}</p>`,
      answers,
      link,
      '<p>Este mensaje fue generado automáticamente por PACO Admin.</p>',
    ].join('');
  }

  private sellerEmailTemplate(
    recipient: TicketRecipient,
    token: string,
    answers: string,
  ) {
    const configuredUrl = this.config.get<string>(
      'TICKETS_SELLER_RESPONSE_URL',
    );
    if (!configuredUrl) {
      throw new Error('TICKETS_SELLER_RESPONSE_URL no está configurado.');
    }
    const publicUrl = new URL(configuredUrl);
    publicUrl.pathname = '/ticket/responder';
    publicUrl.search = '';
    publicUrl.hash = '';
    const baseUrl = publicUrl.toString().replace(/\/$/, '');
    const link = baseUrl
      ? `${baseUrl}${
          baseUrl.includes('?') ? '&' : '?'
        }token=${encodeURIComponent(token)}`
      : '';
    return [
      `<p>Hola ${this.escape(recipient.Nombre || 'Vendedor')},</p>`,
      '<p>Su rol en este ticket es: <strong>Vendedor / Reportante</strong>.</p>',
      '<p>El plan de acción fue ejecutado. Confirme si la solución fue satisfactoria o si el ticket debe reabrirse.</p>',
      `<p><strong>Ticket:</strong> ${this.escape(recipient.NumeroTicket)}<br>`,
      `<strong>Cliente:</strong> ${this.escape(recipient.NombreCliente)}<br>`,
      `<strong>Asunto:</strong> ${this.escape(recipient.Titulo)}</p>`,
      answers,
      link
        ? `<p><a href="${this.escape(link)}">Responder ticket</a></p>`
        : '<p>No se configuró la URL pública de respuesta.</p>',
      '<p>El enlace es personal, de un solo uso y tiene vencimiento.</p>',
    ].join('');
  }

  private hashToken(token: string) {
    const normalizedToken = token.replace(/\s+/g, '');
    return createHash('sha256').update(normalizedToken, 'utf8').digest('hex');
  }

  private assertSellerTokenStatus(status: string) {
    if (status === 'VENCIDO') throw new GoneException('Token vencido.');
    if (status === 'USADO' || status === 'PROCESADO') {
      throw new ConflictException(
        'El token ya fue utilizado o el ticket fue procesado.',
      );
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

  private roleLabel(role?: string) {
    const labels: Record<string, string> = {
      JEFE_MARCA: 'Jefe de Marca',
      TICKET_JEFE_MARCA: 'Jefe de Marca',
      MERCADEO: 'Gerente de Mercadeo',
      TICKET_MERCADEO: 'Gerente de Mercadeo',
      GERENCIA_GENERAL: 'Gerencia General',
      TICKET_GERENCIA_GENERAL: 'Gerencia General',
      EJECUCION: 'Responsable de ejecución',
      TICKET_SUPERVISOR: 'Supervisor de Ventas',
      RESPONSABLE: 'Responsable de ejecución',
      VENDEDOR: 'Vendedor / Reportante',
      VENDEDOR_EXTERNO: 'Vendedor / Reportante',
    };
    return labels[role ?? ''] ?? role ?? 'Participante del flujo';
  }

  private async resolveDelivery(
    idTicket: string | number,
    intendedTo: string,
  ): Promise<TicketDelivery> {
    const rows = await this.database.query<{
      EsDemo: boolean | number;
      CorreoDemo: string | null;
    }>(
      `SELECT EsDemo, CorreoDemo
       FROM dbo.tbl_Ticket
       WHERE IdTicket = @IdTicket`,
      { IdTicket: idTicket },
    );
    const isDemo = Number(rows[0]?.EsDemo ?? 0) === 1;
    if (!isDemo) {
      return { to: intendedTo, intendedTo, isDemo: false };
    }
    const demoEmail = rows[0]?.CorreoDemo?.trim();
    if (!demoEmail) {
      throw new Error(
        `El ticket demo ${idTicket} no tiene un correo de demostración.`,
      );
    }
    return { to: demoEmail, intendedTo, isDemo: true };
  }

  private demoBanner(delivery: TicketDelivery, role: string) {
    if (!delivery.isDemo) return '';
    return `<div style="background:#fff4cc;border:2px solid #e0a800;border-radius:10px;padding:14px;margin-bottom:18px;color:#5f4600"><strong>MODO DEMOSTRACIÓN</strong><br>Usted representa el rol <strong>${this.escape(
      this.roleLabel(role),
    )}</strong> durante esta prueba.<br>Destinatario que habría recibido el flujo real: <strong>${this.escape(
      delivery.intendedTo || 'No configurado',
    )}</strong>.<br>Ningún correo fue enviado a ese destinatario.</div>`;
  }

  private async flowSummary(idTicket: string | number) {
    const params = {
      Param1: String(idTicket),
      Param2: '',
      Param3: '',
      Param4: '',
      Param5: '',
    };
    const [headers, plans, history, answers] = await Promise.all([
      this.database.executeProcedure<any>('PACO_GET_TICKET', {
        Option: '2',
        ...params,
      }),
      this.database.executeProcedure<any>('PACO_GET_TICKET', {
        Option: '4',
        ...params,
      }),
      this.database.executeProcedure<any>('PACO_GET_TICKET', {
        Option: '5',
        ...params,
      }),
      this.answersSummary(idTicket),
    ]);
    const ticket = headers[0] ?? {};
    const plan = plans[0];
    const header = `<div style="border:1px solid #dce4e8;border-radius:12px;padding:16px;margin:18px 0;background:#fbfcfd"><h2 style="margin:0 0 12px;color:#12395b">Resumen completo del ticket</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="5"><tr><td><small style="color:#536471">Ticket</small><br><strong>${this.escape(
      ticket.NumeroTicket,
    )}</strong></td><td><small style="color:#536471">Estado actual</small><br><strong>${this.escape(
      ticket.Estado,
    )}</strong></td></tr><tr><td><small style="color:#536471">Cliente</small><br><strong>${this.escape(
      ticket.NombreCliente,
    )}</strong></td><td><small style="color:#536471">Vendedor</small><br><strong>${this.escape(
      ticket.NombreVendedor || ticket.CorreoVendedor,
    )}</strong></td></tr><tr><td colspan="2"><small style="color:#536471">Asunto</small><br><strong>${this.escape(
      ticket.Titulo,
    )}</strong></td></tr><tr><td colspan="2"><small style="color:#536471">Descripción</small><br>${this.escape(
      ticket.Descripcion || 'Sin descripción',
    )}</td></tr></table></div>`;
    const planHtml = plan
      ? `<div style="border:2px solid #6f42c1;border-radius:12px;padding:16px;margin:18px 0;background:#faf7ff"><h3 style="margin:0 0 10px;color:#51258a">Plan de acción vigente</h3><p><strong>Tipo:</strong> ${this.escape(
          plan.TipoAccion,
        )}<br><strong>Estado:</strong> ${this.escape(
          plan.Estado,
        )}<br><strong>Plan:</strong> ${this.escape(
          plan.Descripcion,
        )}<br><strong>Fecha compromiso:</strong> ${this.escape(
          plan.FechaCompromiso || 'No indicada',
        )}<br><strong>Responsable de ejecución:</strong> ${this.escape(
          plan.ResponsableNombre || plan.Responsable || 'No indicado',
        )}<br><strong>Definido por:</strong> ${this.escape(
          plan.DefinidoPorNombre || plan.DefinidoPor || 'No indicado',
        )}</p></div>`
      : `<div style="border:1px dashed #aab7c2;border-radius:12px;padding:14px;margin:18px 0;color:#536471"><strong>Plan de acción:</strong> aún no ha sido definido.</div>`;
    const historyItems = history
      .slice(0, 10)
      .map(
        (item: any) =>
          `<li style="margin-bottom:8px"><strong>${this.escape(
            item.Accion,
          )}</strong> · ${this.escape(
            item.EstadoNuevo,
          )}<br><small>${this.escape(item.Fecha)} · ${this.escape(
            item.NombreUsuario || item.RolUsuario || 'Sistema',
          )}</small><br>${this.escape(
            item.Comentario || 'Sin comentario',
          )}</li>`,
      )
      .join('');
    const historyHtml = `<div style="border:1px solid #dce4e8;border-radius:12px;padding:16px;margin:18px 0"><h3 style="margin:0 0 10px;color:#12395b">Historial y comentarios</h3>${
      historyItems
        ? `<ol style="margin:0;padding-left:22px">${historyItems}</ol>`
        : '<p>Sin movimientos registrados.</p>'
    }</div>`;
    return header + planHtml + answers + historyHtml;
  }

  private async answersSummary(idTicket: string | number) {
    const details = await this.database.executeProcedure<{
      Pregunta?: string;
      Valor?: string;
    }>('PACO_GET_TICKET', {
      Option: '3',
      Param1: String(idTicket),
      Param2: '',
      Param3: '',
      Param4: '',
      Param5: '',
    });
    if (!details.length) return '';
    const cards = details.map(
      (item) =>
        `<td style="width:50%;padding:6px;vertical-align:top"><div style="background:#f5f7f8;border-radius:8px;padding:12px"><div style="font-size:12px;color:#536471">${this.escape(
          item.Pregunta || 'Respuesta',
        )}</div><div style="font-weight:700;color:#111827;margin-top:4px">${this.escape(
          item.Valor || '',
        )}</div></div></td>`,
    );
    const rows: string[] = [];
    for (let index = 0; index < cards.length; index += 2)
      rows.push(`<tr>${cards[index]}${cards[index + 1] ?? '<td></td>'}</tr>`);
    return `<div style="border:1px solid #dce4e8;border-radius:12px;padding:16px;margin:18px 0"><h3 style="margin:0 0 4px;color:#12395b">Respuestas del ticket</h3><p style="margin:0 0 10px;color:#536471;font-size:13px">Información registrada desde el sistema de origen.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.join(
      '',
    )}</table></div>`;
  }
}
