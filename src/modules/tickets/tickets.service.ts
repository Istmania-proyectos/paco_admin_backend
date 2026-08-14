import {
  BadRequestException,
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
import { TicketProductActionDto } from './dto/ticket-product-action.dto';
import { VendorTicketActionDto } from './dto/vendor-ticket-action.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { SmtpMailerService } from '../mail/smtp-mailer.service';
import { ConfigService } from '@nestjs/config';
import { SellerTicketResponseDto } from './dto/seller-ticket-response.dto';
import { ApprovalTicketResponseDto } from './dto/approval-ticket-response.dto';
import {
  CreateRelatedEmailDto,
  RelatedEmailQueryDto,
  UpdateRelatedEmailDto,
} from './dto/related-email.dto';

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
  IdTicket: string | number;
  NumeroTicket: string;
  CodigoCliente: string;
  NombreCliente: string;
  Titulo: string;
  Descripcion?: string;
  Estado: string;
  FechaCreacion: Date;
}

interface SellerResponseResult extends TicketTransitionResult {
  Resultado:
    | 'OK'
    | 'NO_ENCONTRADO'
    | 'USADO'
    | 'VENCIDO'
    | 'PROCESADO'
    | 'ESTADO_INVALIDO'
    | 'REAPERTURA_FUERA_DE_PLAZO';
}

interface ExecutionSuggestedEmails {
  correoVendedor?: string | null;
  correoSupervisor?: string | null;
}

@Injectable()
export class TicketsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TicketsService.name);
  private automationTimer?: NodeJS.Timeout;
  private reminderTimer?: NodeJS.Timeout;
  private automationRunning = false;
  private remindersRunning = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly mailer: SmtpMailerService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.config.get('TICKETS_AUTOMATION_ENABLED') === 'true') {
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
        `Automatización CheckIn habilitada; ejecución cada ${intervalMinutes} minutos en modo ${
          this.config.get('TICKETS_AUTOMATION_DRY_RUN') === 'false'
            ? 'REAL'
            : 'SIMULACIÓN'
        }.`,
      );
    } else {
      this.logger.warn(
        'Automatización CheckIn deshabilitada (TICKETS_AUTOMATION_ENABLED no es true).',
      );
    }

    if (this.config.get('TICKETS_REMINDERS_ENABLED') === 'true') {
      const configuredMinutes = Number(
        this.config.get('TICKETS_REMINDERS_CHECK_INTERVAL_MINUTES') ?? 15,
      );
      const intervalMinutes = Math.max(
        5,
        Number.isFinite(configuredMinutes) ? configuredMinutes : 15,
      );
      this.reminderTimer = setInterval(
        () => void this.runScheduledReminders(),
        intervalMinutes * 60_000,
      );
      this.reminderTimer.unref();
      this.logger.log(
        `Recordatorios de tickets habilitados; revisión cada ${intervalMinutes} minutos.`,
      );
    }
  }

  onApplicationShutdown() {
    if (this.automationTimer) clearInterval(this.automationTimer);
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  get(query: TicketQueryDto, user: JwtPayload) {
    return this.database.executeProcedure('PACO_GET_TICKET', {
      Option: query.opcion ?? '1',
      Param1: query.param1 ?? '',
      Param2: query.param2 ?? '1',
      Param3: query.param3 ?? '',
      Param4: query.param4 ?? '',
      Param5: query.param5 ?? user.id,
      Cliente: query.cliente?.trim() ?? '',
      Vendedor: query.vendedor?.trim() ?? '',
      FechaDesde: query.fechaDesde ?? '',
      FechaHasta: query.fechaHasta ?? '',
    });
  }

  export(
    estado?: string,
    buscar?: string,
    cliente?: string,
    vendedor?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    return this.database.executeProcedure('PACO_TICKET_PRODUCTOS_EXPORTAR', {
      Estado: estado ?? '',
      Buscar: buscar?.trim() ?? '',
      Cliente: cliente?.trim() ?? '',
      Vendedor: vendedor?.trim() ?? '',
      FechaDesde: fechaDesde || null,
      FechaHasta: fechaHasta || null,
    });
  }

  getCheckinResponses(formulario: number) {
    return this.database.executeProcedure('PACO_GET_TICKET_CHECKIN', {
      Formulario: String(
        Number.isInteger(formulario) && formulario > 0 ? formulario : 14,
      ),
    });
  }

  getRelatedEmails(query: RelatedEmailQueryDto) {
    return this.database.executeProcedure('PACO_CORREOS_RELACIONADOS_LISTAR', {
      App: query.app ?? 'PACO',
      CorreoPrincipal: query.correoprincipal ?? '',
    });
  }

  createRelatedEmail(dto: CreateRelatedEmailDto) {
    return this.database.executeProcedure('PACO_CORREO_RELACIONADO_GUARDAR', {
      Id: '',
      CorreoPrincipal: dto.correoprincipal,
      CorreoRelacionado: dto.correorelacionado,
      FechaInicio: dto.fechainicio ?? '',
      FechaFinal: dto.fechafinal ?? '',
      App: dto.app ?? 'PACO',
      EsPrincipalSuplente: dto.esSuplentePrincipal ? '1' : '0',
    });
  }

  updateRelatedEmail(id: number, dto: UpdateRelatedEmailDto) {
    return this.database.executeProcedure('PACO_CORREO_RELACIONADO_GUARDAR', {
      Id: String(id),
      CorreoPrincipal: dto.correoprincipal,
      CorreoRelacionado: dto.correorelacionado,
      FechaInicio: dto.fechainicio ?? '',
      FechaFinal: dto.fechafinal ?? '',
      App: dto.app ?? 'PACO',
      EsPrincipalSuplente: dto.esSuplentePrincipal ? '1' : '0',
    });
  }

  deleteRelatedEmail(id: number) {
    return this.database.executeProcedure('PACO_CORREO_RELACIONADO_ELIMINAR', {
      Id: String(id),
    });
  }

  updateUserVacations(id: string, vacations: boolean) {
    return this.database.executeProcedure('PACO_USUARIO_VACACIONES_GUARDAR', {
      UsuarioId: id,
      Vacaciones: vacations ? '1' : '0',
    });
  }

  updateUserVacationsByEmail(email: string, vacations: boolean) {
    return this.database.executeProcedure(
      'PACO_USUARIO_VACACIONES_GUARDAR_POR_CORREO',
      { Correo: email, Vacaciones: vacations ? '1' : '0' },
    );
  }

  getPublicLinkConfiguration() {
    return {
      aprobacion: this.publicTicketResponseUrl(
        'ticket/aprobar',
        'TICKETS_APPROVAL_RESPONSE_URL',
      ),
      cierreVendedor: this.publicTicketResponseUrl(
        'ticket/responder',
        'TICKETS_SELLER_RESPONSE_URL',
      ),
    };
  }

  getProducts(id: string) {
    return this.database.executeProcedure('PACO_TICKET_PRODUCTOS_GET', {
      IdTicket: id,
      Etapa: '',
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
    const startedAt = Date.now();
    const demoEmail = executionOptions?.demoEmail?.trim() ?? '';
    const mode = demoEmail ? 'DEMO' : execute ? 'EJECUCIÓN' : 'SIMULACIÓN';
    this.logger.log(
      `Iniciando automatización CheckIn: formulario=${formulario}, modo=${mode}, límite=${
        executionOptions?.limitTickets ?? 0
      }.`,
    );

    let rows: any[];
    try {
      rows = await this.database.executeProcedure<any>(
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
    } catch (error) {
      this.logger.error(
        `Falló PACO_TICKET_AUTOMATIZAR_CHECKIN para formulario=${formulario}, modo=${mode}, duración=${
          Date.now() - startedAt
        }ms: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
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
      const notifiedTickets = new Set<string>();
      for (const row of filteredRows) {
        const ticketId = String(row.IdTicket ?? '');
        if (
          ticketId &&
          Number(row.RequiereNotificacion) === 1 &&
          !notifiedTickets.has(ticketId)
        ) {
          notifiedTickets.add(ticketId);
          await this.notifySafely(row);
        }
      }
    }

    const resultCounts = filteredRows.reduce<Record<string, number>>(
      (counts, row) => {
        const status = String(row.EstadoResultado ?? 'SIN_ESTADO');
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      },
      {},
    );
    this.logger.log(
      `Finalizó automatización CheckIn: formulario=${formulario}, modo=${mode}, grupos=${
        filteredRows.length
      }, resultados=${JSON.stringify(resultCounts)}, duración=${
        Date.now() - startedAt
      }ms.`,
    );

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

  async startDemo(code: string, user: JwtPayload, limitTickets = 1) {
    const demoEmail = this.assertDemoAccess(code, user);

    const current = await this.getDemoStatus();
    const ticketsDemoReiniciados = current.ticketsDemo
      ? await this.clearAllDemoTickets()
      : 0;
    current.ticketsDemo = Math.max(
      0,
      current.ticketsDemo - ticketsDemoReiniciados,
    );
    if (current.ticketsDemo > 0) {
      throw new ConflictException(
        'Ya existen tickets de demostración activos. Resuélvalos o límpielos antes de iniciar otra demo.',
      );
    }

    const result = await this.runCheckinAutomation(true, 14, undefined, {
      limitTickets,
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
      limiteSolicitado: limitTickets,
      ticketsDemoReiniciados,
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

  /** Reinicia demos anteriores y conserva el respaldo generado por SQL. */
  private async clearAllDemoTickets(): Promise<number> {
    const targets = await this.database.query<{ CorreoDemo: string }>(`
      SELECT DISTINCT CorreoDemo
      FROM dbo.tbl_Ticket
      WHERE EsDemo = 1
        AND NULLIF(LTRIM(RTRIM(CorreoDemo)), '') IS NOT NULL
    `);
    let deleted = 0;
    for (const target of targets) {
      const rows = await this.database.executeProcedure<{
        TicketsEliminados: number;
      }>('PACO_TICKET_DEMO_LIMPIAR', { CorreoDemo: target.CorreoDemo });
      deleted += Number(rows[0]?.TicketsEliminados ?? 0);
    }
    return deleted;
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
      'oscar.vasquez@istmania.hn';
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

  private async runScheduledReminders() {
    if (this.remindersRunning) return;

    this.remindersRunning = true;
    try {
      const configuredHours = Number(
        this.config.get('TICKETS_REMINDERS_INTERVAL_HOURS') ?? 4,
      );
      const hours = Math.max(
        1,
        Number.isFinite(configuredHours) ? configuredHours : 4,
      );
      const targets = await this.database.executeProcedure<any>(
        'PACO_TICKET_OBTENER_RECORDATORIOS',
        { Horas: String(hours) },
      );

      for (const target of targets) {
        if (target.Tipo === 'APROBACION') {
          await this.sendApprovalEmail(target);
          continue;
        }
        if (target.Tipo === 'VENDEDOR') {
          await this.sendAndLog({
            ...target,
            EsVendedorExterno: true,
            Rol: 'VENDEDOR',
            Nombre: target.NombreVendedor ?? target.Email,
            UserId: target.UserId ?? 'VENDEDOR_EXTERNO',
          });
        }
      }

      if (targets.length)
        this.logger.log(
          `Se enviaron ${targets.length} recordatorio(s) de ticket.`,
        );
    } catch (error) {
      this.logger.error(
        `Falló el ciclo de recordatorios: ${(error as Error).message}`,
      );
    } finally {
      this.remindersRunning = false;
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
    if (transition) {
      if (dto.accion === 'INICIAR_EJECUCION') {
        await this.sendExecutionCopies(transition, dto.correosCc);
      }
      await this.notifySafely(transition);
    }
    return result;
  }

  async transitionProducts(
    id: string,
    dto: TicketProductActionDto,
    user: JwtPayload,
  ) {
    const action = {
      PROPONER_PLAN: {
        stage: 'JEFE_MARCA',
        decision: 'PROPONER_PLAN',
        role: 'TICKET_JEFE_MARCA',
      },
      APROBAR_MERCADEO: {
        stage: 'MERCADEO',
        decision: 'APROBAR',
        role: 'TICKET_MERCADEO',
      },
      RECHAZAR_MERCADEO: {
        stage: 'MERCADEO',
        decision: 'RECHAZAR',
        role: 'TICKET_MERCADEO',
      },
      APROBAR_GERENCIA: {
        stage: 'GERENCIA_GENERAL',
        decision: 'APROBAR',
        role: 'TICKET_GERENCIA_GENERAL',
      },
      RECHAZAR_GERENCIA: {
        stage: 'GERENCIA_GENERAL',
        decision: 'RECHAZAR',
        role: 'TICKET_GERENCIA_GENERAL',
      },
      INICIAR_EJECUCION: {
        stage: 'EJECUCION',
        decision: 'INICIAR_EJECUCION',
        role: 'TICKET_SUPERVISOR',
      },
    }[dto.accion];
    if (!action)
      throw new BadRequestException('Acción por producto no válida.');

    const roles = this.parseRoles(user.roles);
    if (
      !roles.includes('SUPERUSUARIO') &&
      !roles.includes(action.role) &&
      !(action.stage === 'EJECUCION' && roles.includes('TICKET_JEFE_MARCA'))
    ) {
      throw new ConflictException(
        'No tiene permiso para ejecutar esta acción.',
      );
    }

    const token = randomBytes(32).toString('base64url');
    const email = String(user.sub ?? user.id).trim();
    await this.database.executeProcedure(
      'PACO_TICKET_EMITIR_TOKEN_APROBACION',
      {
        IdTicket: id,
        Etapa: action.stage,
        Correo: email,
        HashHex: this.hashToken(token),
        Expira: new Date(Date.now() + 5 * 60_000).toISOString(),
      },
    );
    const rows = await this.database.executeProcedure<TicketTransitionResult>(
      'PACO_TICKET_PRODUCTOS_RESPONDER_APROBACION',
      {
        HashHex: this.hashToken(token),
        Json: JSON.stringify({
          productos: dto.productos.map((product) => ({
            ...product,
            decision: action.decision,
          })),
        }),
      },
    );
    const result = rows[0];
    if (!result) throw new NotFoundException('Ticket inexistente.');
    await this.notifySafely(result, [action.stage]);
    return result;
  }

  async getSellerTicket(token: string) {
    const hash = this.hashToken(token);
    const result = await this.database.executeProcedure<SellerTokenLookup>(
      'PACO_TICKET_PRODUCTOS_GET_VENDEDOR',
      { HashHex: hash },
    );
    const ticket = result[0];
    if (!ticket) throw new NotFoundException('Token inexistente.');
    this.assertSellerTokenStatus(ticket.TokenEstado);
    const { TokenEstado: _tokenStatus, ...response } = ticket;
    const productos = await this.database.executeProcedure<any>(
      'PACO_TICKET_PRODUCTOS_GET',
      { IdTicket: String(ticket.IdTicket), Etapa: 'VENDEDOR' },
    );
    return { ...response, Productos: productos };
  }

  async respondAsSeller(dto: SellerTicketResponseDto) {
    if (dto.productos?.length) {
      const result = await this.database.executeProcedure<SellerResponseResult>(
        'PACO_TICKET_PRODUCTOS_RESPONDER_VENDEDOR',
        {
          HashHex: this.hashToken(dto.token),
          Json: JSON.stringify({ productos: dto.productos }),
        },
      );
      const response = result[0];
      if (!response) throw new NotFoundException('Token inexistente.');
      this.assertReopenWindow(response.Resultado);
      await this.notifySafely(response, ['VENDEDOR']);
      return {
        NumeroTicket: response.NumeroTicket,
        Estado: response.Estado,
      };
    }
    const result = await this.database.executeProcedure<SellerResponseResult>(
      'PACO_INSERT_TICKET',
      {
        Option: '6',
        Param1: this.hashToken(dto.token),
        Param2: dto.accion ?? '',
        Param3: dto.comentario ?? '',
        Param4: '',
        Param5: '',
      },
    );
    const response = result[0];
    if (!response || response.Resultado === 'NO_ENCONTRADO') {
      throw new NotFoundException('Token inexistente.');
    }
    this.assertSellerTokenStatus(response.Resultado);
    this.assertReopenWindow(response.Resultado);
    if (response.Estado === 'REABIERTO_URGENTE') {
      await this.notifySafely(response);
    }
    return {
      NumeroTicket: response.NumeroTicket,
      Estado: response.Estado,
    };
  }

  async respondWithoutToken(id: string, dto: VendorTicketActionDto) {
    if (dto.IdTicket !== undefined && String(dto.IdTicket) !== id) {
      throw new ConflictException(
        'El IdTicket del cuerpo no coincide con el ticket de la ruta.',
      );
    }
    if (dto.accion === 'REABRIR' && !dto.respuestasNuevas?.length) {
      throw new BadRequestException(
        'Debe enviar al menos una respuesta nueva para reabrir el ticket.',
      );
    }
    const result = await this.database.executeProcedure<SellerResponseResult>(
      'PACO_INSERT_TICKET',
      {
        Option: '7',
        Param1: id,
        Param2: dto.accion,
        Param3:
          dto.accion === 'REABRIR' ? JSON.stringify(dto) : dto.comentario ?? '',
        Param4: '',
        Param5: '',
      },
    );
    const response = result[0];
    if (!response || response.Resultado === 'NO_ENCONTRADO') {
      throw new NotFoundException('Ticket inexistente.');
    }
    if (response.Resultado === 'ESTADO_INVALIDO') {
      throw new ConflictException(
        'El estado actual del ticket no permite esta acción.',
      );
    }
    this.assertReopenWindow(response.Resultado);
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
    const hash = this.hashToken(token);
    const rows = await this.database.executeProcedure<any>(
      'PACO_TICKET_GET_APROBACION',
      { HashHex: hash },
    );
    const item = rows[0];
    if (!item) throw new NotFoundException('Enlace inexistente.');
    this.assertSellerTokenStatus(item.TokenEstado);
    const [productos, correosCcSugeridos] = await Promise.all([
      this.database.executeProcedure<any>('PACO_TICKET_PRODUCTOS_GET', {
        IdTicket: String(item.IdTicket),
        Etapa: item.Etapa,
      }),
      item.Etapa === 'EJECUCION'
        ? this.getExecutionSuggestedEmails(item.IdTicket)
        : Promise.resolve([]),
    ]);
    return { ...item, Productos: productos, correosCcSugeridos };
  }

  /**
   * Correos que se muestran inicialmente al iniciar la ejecución. No se
   * persisten ni se fuerzan: el usuario puede eliminarlos antes de enviar.
   */
  private async getExecutionSuggestedEmails(
    ticketId: string | number,
  ): Promise<string[]> {
    const rows = await this.database.query<ExecutionSuggestedEmails>(
      `SELECT
         T.CorreoVendedor AS correoVendedor,
         SG.email_supervisor AS correoSupervisor
       FROM dbo.tbl_Ticket T
       LEFT JOIN dbo.tbl_Supervisor_Gerente SG
         ON SG.codigo_vendedor = T.CodigoVendedor
       WHERE T.IdTicket = @ticketId`,
      { ticketId },
    );
    const emails = rows[0];
    if (!emails) return [];

    return [emails.correoVendedor, emails.correoSupervisor].reduce<string[]>(
      (suggested, email) => {
        const normalized = email?.trim().toLowerCase();
        if (normalized && !suggested.includes(normalized)) {
          suggested.push(normalized);
        }
        return suggested;
      },
      [],
    );
  }
  async respondApproval(dto: ApprovalTicketResponseDto) {
    const { token, ...body } = dto;
    if (body.productos?.length) {
      const rows = await this.database.executeProcedure<any>(
        'PACO_TICKET_PRODUCTOS_RESPONDER_APROBACION',
        { HashHex: this.hashToken(token), Json: JSON.stringify(body) },
      );
      const result = rows[0];
      if (result) {
        const policyRejections = body.productos
          .filter((product) => product.decision === 'RECHAZAR_CERRAR_POLITICA')
          .map((product) => product.idTicketProducto);
        if (policyRejections.length) {
          await this.sendPolicyRejectionNoticeSafely(
            result,
            policyRejections,
            result.EtapaRespuesta,
          );
        }
        if (
          body.productos.some(
            (product) => product.decision === 'INICIAR_EJECUCION',
          )
        ) {
          await this.sendExecutionCopies(result, body.correosCc);
        }
        await this.notifySafely(result, [result.EtapaRespuesta]);
      }
      return { estado: result?.Estado };
    }
    const rows = await this.database.executeProcedure<any>(
      'PACO_TICKET_RESPONDER_APROBACION',
      { HashHex: this.hashToken(token), Json: JSON.stringify(body) },
    );
    const result = rows[0];
    if (result) {
      if (body.decision === 'INICIAR_EJECUCION') {
        await this.sendExecutionCopies(result, body.correosCc);
      }
      await this.notifySafely(result, [result.EtapaRespuesta]);
    }
    return { estado: result?.Estado };
  }

  private async sendPolicyRejectionNoticeSafely(
    transition: TicketTransitionResult,
    productIds: number[],
    stage?: string,
  ) {
    try {
      const [headers, products] = await Promise.all([
        this.database.executeProcedure<any>('PACO_GET_TICKET', {
          Option: '2',
          Param1: String(transition.IdTicket),
          Param2: '',
          Param3: '',
          Param4: '',
          Param5: '',
        }),
        this.database.executeProcedure<any>('PACO_TICKET_PRODUCTOS_GET', {
          IdTicket: String(transition.IdTicket),
          Etapa: '',
        }),
      ]);
      const ticket = headers[0];
      const rejected = products.filter(
        (product) =>
          productIds.some(
            (id) => String(id) === String(product.IdTicketProducto),
          ) && product.Estado === 'RECHAZADO_POLITICA',
      );
      if (!ticket || !rejected.length) return;

      const intendedEmail = String(ticket.CorreoVendedor ?? '').trim();
      if (!intendedEmail && Number(ticket.EsDemo ?? 0) !== 1) {
        this.logger.warn(
          `No se notificó el rechazo por política del ticket ${ticket.NumeroTicket}: no tiene correo de vendedor.`,
        );
        return;
      }
      const delivery = await this.resolveDelivery(
        transition.IdTicket,
        intendedEmail,
      );
      const logs = await this.database.executeProcedure<NotificationLog>(
        'PACO_INSERT_TICKET',
        {
          Option: '3',
          Param1: String(transition.IdTicket),
          Param2: delivery.to,
          Param3: 'RECHAZADO_POLITICA',
          Param4: String(ticket.NumeroTicket),
          Param5:
            ticket.CodigoVendedor ?? `VENDEDOR-TICKET-${transition.IdTicket}`,
        },
      );
      const logId = logs[0]?.IdNotificacion;
      const cards = rejected
        .map(
          (product) =>
            `<div style="padding:14px;margin:10px 0;border-left:4px solid #b42318;background:#fff5f4"><strong>Producto ${
              product.Ocurrencia
            }: ${this.escape(product.CodigoArticulo)} · ${this.escape(
              product.Articulo,
            )}</strong><br><small>Marca: ${this.escape(
              product.Marca || 'No indicada',
            )} · Lote: ${this.escape(
              product.Lote || 'No indicado',
            )} · Cantidad: ${this.escape(
              product.Cantidad ?? 'No indicada',
            )}</small><p><strong>Vencimiento:</strong> ${this.escape(
              this.displayDate(product.FechaVencimiento),
            )}<br><strong>Fecha mínima aceptable:</strong> ${this.escape(
              this.displayDate(product.FechaMinimaPolitica),
            )}</p>${
              product.PlanAccion
                ? `<p><strong>Plan que estaba en evaluación:</strong> ${this.escape(
                    product.TipoAccion,
                  )} — ${this.escape(product.PlanAccion)}</p>`
                : ''
            }</div>`,
        )
        .join('');
      try {
        await this.mailer.send({
          to: delivery.to,
          subject: `${delivery.isDemo ? '[DEMO] ' : ''}Ticket ${
            ticket.NumeroTicket
          }: producto(s) rechazado(s) por política de vencimiento`,
          html: `${this.demoBanner(delivery, 'VENDEDOR')}<p>Hola ${this.escape(
            ticket.NombreVendedor || 'Vendedor',
          )},</p><p>Se rechazaron definitivamente ${
            rejected.length
          } producto(s) del ticket <strong>${this.escape(
            ticket.NumeroTicket,
          )}</strong>, cliente <strong>${this.escape(
            ticket.NombreCliente,
          )}</strong>, debido a que fueron reportados con menos de tres meses antes de su vencimiento.</p><p><strong>Decisión registrada por:</strong> ${this.escape(
            this.roleLabel(stage),
          )}</p>${cards}<p>Estos productos ya no continuarán en el flujo. Los demás productos del ticket, si existen, seguirán su proceso de forma independiente.</p><p>Este correo es informativo y no requiere ninguna acción.</p>`,
        });
        if (logId) await this.finishNotification(logId, 'ENVIADO', '');
      } catch (error) {
        if (logId) {
          await this.finishNotification(
            logId,
            'ERROR',
            (error as Error).message.slice(0, 2000),
          );
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(
        `No se pudo notificar al vendedor el rechazo por política del ticket ${
          transition.NumeroTicket
        }: ${(error as Error).message}`,
      );
    }
  }

  private async sendExecutionCopies(
    ticket: TicketTransitionResult,
    recipients?: string[],
  ) {
    const cc = [
      ...new Set(
        (recipients ?? [])
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (!cc.length) return;

    try {
      await this.mailer.send({
        to: cc[0],
        cc: cc.slice(1),
        subject: `Ticket ${ticket.NumeroTicket}: inicio de ejecución`,
        html: `<p>Se inició la ejecución del ticket <strong>${this.escape(
          ticket.NumeroTicket,
        )}</strong>.</p>${await this.flowSummary(ticket.IdTicket)}`,
      });
    } catch (error) {
      this.logger.error(
        `No se pudieron enviar las copias del inicio de ejecución del ticket ${
          ticket.NumeroTicket
        }: ${(error as Error).message}`,
      );
    }
  }

  private async notifyNextRecipients(
    transition: TicketTransitionResult,
    excludedStages: string[] = [],
  ) {
    const productDestinations = await this.database.executeProcedure<any>(
      'PACO_TICKET_PRODUCTOS_DESTINOS',
      { IdTicket: String(transition.IdTicket) },
    );
    const validProductDestinations = productDestinations.filter(
      (destination) =>
        destination?.Etapa &&
        destination?.CorreoDestino &&
        !excludedStages.includes(destination.Etapa),
    );
    if (validProductDestinations.length) {
      for (const destination of validProductDestinations) {
        if (destination.Etapa !== 'VENDEDOR') {
          await this.sendApprovalEmail(destination);
          continue;
        }
        await this.sendAndLog({
          IdTicket: destination.IdTicket,
          UserId:
            destination.CodigoVendedor ??
            `VENDEDOR-TICKET-${destination.IdTicket}`,
          Email: destination.CorreoDestino,
          Nombre: destination.NombreVendedor ?? 'Vendedor',
          Rol: 'VENDEDOR_EXTERNO',
          NumeroTicket: destination.NumeroTicket,
          Titulo: destination.Titulo,
          NombreCliente: destination.NombreCliente,
          Estado: destination.Estado,
          EsVendedorExterno: true,
        });
      }
      return;
    }
    const manual = await this.database.executeProcedure<any>(
      'PACO_TICKET_DESTINO_CORREO',
      { IdTicket: String(transition.IdTicket) },
    );
    if (manual[0]?.CorreoDestino && manual[0]?.Etapa) {
      await this.sendApprovalEmail(manual[0]);
      return;
    }
    let header: any;
    if (
      [
        'PENDIENTE_PLAN',
        'REABIERTO_URGENTE',
        'PENDIENTE_MERCADEO',
        'PENDIENTE_GERENCIA_GENERAL',
        'PLAN_APROBADO',
      ].includes(transition.Estado)
    ) {
      const headers = await this.database.executeProcedure<any>(
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
      header = headers[0];
      const fallbackApproval = this.approvalRecipient(header);
      if (fallbackApproval) {
        await this.sendApprovalEmail(fallbackApproval);
        return;
      }
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
    const validRecipients = recipients.filter((recipient) => recipient?.Email);

    if (!validRecipients.length && transition.Estado === 'PENDIENTE_CIERRE') {
      const ticket = recipients[0]?.IdTicket
        ? recipients[0]
        : (
            await this.database.executeProcedure<any>('PACO_GET_TICKET', {
              Option: '2',
              Param1: String(transition.IdTicket),
              Param2: '',
              Param3: '',
              Param4: '',
              Param5: '',
            })
          )[0];
      const fallbackEmail =
        ticket?.CorreoVendedor ||
        (Number(ticket?.EsDemo ?? 0) === 1 ? ticket?.CorreoDemo : '');
      if (!fallbackEmail) {
        throw new Error(
          `El ticket ${transition.NumeroTicket} está pendiente de cierre pero no tiene correo de vendedor.`,
        );
      }
      validRecipients.push({
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

    for (const recipient of validRecipients) {
      await this.sendAndLog(recipient);
    }
  }

  private approvalRecipient(ticket: any) {
    if (!ticket?.IdTicket) return undefined;
    const stage =
      ticket.Estado === 'PENDIENTE_PLAN' ||
      ticket.Estado === 'REABIERTO_URGENTE'
        ? 'JEFE_MARCA'
        : ticket.Estado === 'PENDIENTE_MERCADEO'
        ? 'MERCADEO'
        : ticket.Estado === 'PENDIENTE_GERENCIA_GENERAL'
        ? 'GERENCIA_GENERAL'
        : ticket.Estado === 'PLAN_APROBADO'
        ? 'EJECUCION'
        : undefined;
    const email =
      stage === 'JEFE_MARCA'
        ? ticket.CorreoJefeMarca
        : stage === 'MERCADEO'
        ? ticket.CorreoGerenteMercadeo ?? ticket.CorreoMercadeo
        : stage === 'GERENCIA_GENERAL'
        ? ticket.CorreoGerenciaGeneral
        : ticket.ResponsableEmail ?? ticket.CorreoJefeMarca;
    return email
      ? {
          ...ticket,
          CorreoDestino: email,
          Etapa: stage,
        }
      : undefined;
  }

  private async sendApprovalEmail(target: any) {
    target = await this.resolveRelatedRecipient(target);
    const delivery = await this.resolveDelivery(
      target.IdTicket,
      target.CorreoDestino ?? target.Email,
    );
    const logs = await this.database.executeProcedure<NotificationLog>(
      'PACO_INSERT_TICKET',
      {
        Option: '3',
        Param1: String(target.IdTicket),
        Param2: delivery.to,
        Param3: String(target.Estado ?? target.Etapa ?? ''),
        Param4: String(target.NumeroTicket ?? ''),
        Param5: String(
          target.UserId ??
            target.JefeMarcaUsuarioId ??
            target.CodigoVendedor ??
            target.Etapa ??
            '',
        ),
      },
    );
    const logId = logs[0]?.IdNotificacion;
    if (!logId) {
      throw new Error(
        `No se pudo crear la bitácora de notificación del ticket ${target.NumeroTicket}.`,
      );
    }

    try {
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
          HashHex: this.hashToken(token),
          Expira: expiration.toISOString(),
        },
      );
      const base = this.publicTicketResponseUrl(
        'ticket/aprobar',
        'TICKETS_APPROVAL_RESPONSE_URL',
      );
      const link = `${base}${
        base.includes('?') ? '&' : '?'
      }token=${encodeURIComponent(token)}`;
      const action =
        target.Etapa === 'JEFE_MARCA'
          ? 'definir el plan de acción'
          : target.Etapa === 'EJECUCION'
          ? 'iniciar la ejecución del plan'
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
      await this.finishNotification(logId, 'ENVIADO', '');
      this.logger.log(
        `Notificación ${logId} enviada para ticket ${target.NumeroTicket}, etapa=${target.Etapa}, destino=${delivery.to}.`,
      );
    } catch (error) {
      await this.finishNotification(
        logId,
        'ERROR',
        (error as Error).message.slice(0, 2000),
      );
      throw error;
    }
  }

  /** Reemplaza solo al Jefe de Marca durante sus vacaciones; las demÃ¡s etapas
   * mantienen su destinatario configurado. */
  private async resolveRelatedRecipient(target: any) {
    if (target?.Etapa !== 'JEFE_MARCA') return target;
    const original = String(target.CorreoDestino ?? target.Email ?? '').trim();
    if (!original) return target;
    const resolved = await this.database.executeProcedure<any>(
      'PACO_CORREO_RELACIONADO_RESOLVER',
      { CorreoPrincipal: original, App: 'PACO' },
    );
    const email = resolved[0]?.CorreoDestino?.trim();
    return email ? { ...target, CorreoDestino: email } : target;
  }

  private async notifySafely(
    transition: TicketTransitionResult,
    excludedStages: string[] = [],
  ) {
    try {
      await this.notifyNextRecipients(transition, excludedStages);
    } catch (error) {
      this.logger.error(
        `No se pudo preparar la notificación del ticket ${
          transition.NumeroTicket
        }: ${(error as Error).message}`,
      );
    }
  }

  private parseRoles(value: string | undefined): string[] {
    try {
      const parsed = JSON.parse(value ?? '[]');
      if (Array.isArray(parsed)) return parsed.map((role) => String(role));
    } catch {
      // Los tokens antiguos pueden contener una lista separada por comas.
    }
    return String(value ?? '')
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
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
    await this.database.executeProcedure(
      'PACO_TICKET_PRODUCTOS_EMITIR_TOKEN_VENDEDOR',
      {
        IdTicket: String(recipient.IdTicket),
        HashHex: this.hashToken(token),
        Expira: expiration.toISOString(),
        Correo: recipient.Email,
        Codigo: recipient.UserId,
      },
    );
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
    const baseUrl = this.publicTicketResponseUrl(
      'ticket/responder',
      'TICKETS_SELLER_RESPONSE_URL',
    );
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

  private publicTicketResponseUrl(route: string, legacyKey: string) {
    const publicFrontendUrl = this.config
      .get<string>('TICKETS_PUBLIC_FRONTEND_URL')
      ?.trim();
    if (publicFrontendUrl) {
      const url = new URL(publicFrontendUrl);
      url.search = '';
      url.hash = '';
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
      return new URL(route, url).toString();
    }

    const legacyUrl = this.config.get<string>(legacyKey)?.trim();
    if (!legacyUrl) {
      throw new Error(`Configure TICKETS_PUBLIC_FRONTEND_URL o ${legacyKey}.`);
    }
    const sanitizedUrl = legacyUrl.replace(/[?&]token=[^&#]*/i, '');
    const parsedUrl = new URL(sanitizedUrl);
    if (!`${parsedUrl.pathname}${parsedUrl.hash}`.includes(`/${route}`)) {
      throw new Error(`${legacyKey} debe apuntar a /${route}.`);
    }
    return sanitizedUrl;
  }

  private assertSellerTokenStatus(status: string) {
    if (status === 'VENCIDO') throw new GoneException('Token vencido.');
    if (status === 'USADO' || status === 'PROCESADO') {
      throw new ConflictException(
        'El token ya fue utilizado o el ticket fue procesado.',
      );
    }
  }

  private assertReopenWindow(status: string) {
    if (status === 'REAPERTURA_FUERA_DE_PLAZO') {
      throw new ConflictException(
        'No se puede reabrir un ticket despues de 30 dias desde su creacion.',
      );
    }
  }

  private displayDate(value: unknown) {
    if (!value) return 'No indicada';
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return `${String(date.getUTCDate()).padStart(2, '0')}/${String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')}/${date.getUTCFullYear()}`;
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
    const [headers, plans, history, answers, products] = await Promise.all([
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
      this.database.executeProcedure<any>('PACO_TICKET_PRODUCTOS_GET', {
        IdTicket: String(idTicket),
        Etapa: '',
      }),
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
      ? `<div style="border:2px solid #6f42c1;border-radius:12px;padding:16px;margin:18px 0;background:#faf7ff"><h3 style="margin:0 0 10px;color:#51258a">Plan de acción vigente</h3><p><strong>Motivo:</strong> ${this.escape(
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
    const productsHtml = products.length
      ? `<div style="border:1px solid #dce4e8;border-radius:12px;padding:16px;margin:18px 0"><h3 style="margin:0 0 10px;color:#12395b">Productos y planes de acción</h3>${products
          .map(
            (product: any) =>
              `<div style="padding:12px;margin:8px 0;border-left:4px solid #0b8f4d;background:#f5faf7"><strong>Producto ${
                product.Ocurrencia
              }: ${this.escape(product.CodigoArticulo)} · ${this.escape(
                product.Articulo,
              )}</strong><br><small>Estado: ${this.escape(
                product.Estado,
              )} · Lote: ${this.escape(
                product.Lote || 'No indicado',
              )} · Cantidad: ${this.escape(
                product.Cantidad ?? 'No indicada',
              )}</small>${
                product.PlanAccion
                  ? `<p><strong>${this.escape(
                      product.TipoAccion,
                    )}:</strong> ${this.escape(
                      product.PlanAccion,
                    )}<br><small>Responsable: ${this.escape(
                      product.Responsable || 'No indicado',
                    )} · Compromiso: ${this.escape(
                      product.FechaCompromiso || 'No indicada',
                    )}</small></p>`
                  : '<p>Plan aún no definido.</p>'
              }</div>`,
          )
          .join('')}</div>`
      : planHtml;
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
    return header + productsHtml + answers + historyHtml;
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
