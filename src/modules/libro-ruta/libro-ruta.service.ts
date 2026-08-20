import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { SmtpMailerService } from '../mail/smtp-mailer.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

type RutaRow = {
  Dia: string;
  Orden: number;
  CodigoCliente: string;
  NombreCliente: string;
  Direccion: string;
  Origen: string;
};

@Injectable()
export class LibroRutaService implements OnModuleInit {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly mailer: SmtpMailerService,
    private readonly notifications: NotificacionesService,
  ) {}

  async onModuleInit() {
    await this.ensureTable();
  }

  private sourceDatabase() {
    const value =
      this.config.get<string>('PACO_ROUTE_DATABASE') || 'PACO_S4HANA';
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
      throw new Error('PACO_ROUTE_DATABASE inválida');
    }
    return `[${value}]`;
  }

  private ensureTable() {
    return this.database.query(`
      IF OBJECT_ID('dbo.PACO_LIBRO_RUTA_APROBACION', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.PACO_LIBRO_RUTA_APROBACION (
          Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          PropuestaId INT NOT NULL,
          Correo NVARCHAR(256) NOT NULL,
          TokenHash CHAR(64) NOT NULL,
          FechaExpiracion DATETIME2 NOT NULL,
          FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_LR_APR_CREACION DEFAULT SYSDATETIME(),
          FechaRespuesta DATETIME2 NULL,
          Accion NVARCHAR(30) NULL,
          Comentario NVARCHAR(1000) NULL,
          CONSTRAINT UX_LR_APR_TOKEN UNIQUE (TokenHash)
        );
      END;
    `);
  }

  async invitar(
    body: { propuestaId: number; correo: string },
    integrationKey: string,
  ) {
    this.validarClaveInterna(integrationKey);
    await this.ensureTable();
    const propuestaId = Number(body.propuestaId);
    const correo = String(body.correo || '')
      .trim()
      .toLowerCase();
    if (!Number.isInteger(propuestaId) || propuestaId <= 0) {
      throw new NotFoundException('Propuesta inválida');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new ConflictException('Correo inválido');
    }
    const source = this.sourceDatabase();
    const proposal = await this.database.query<any>(
      `SELECT TOP(1) Id,RutaVendedor,RutaOficial,Semana,Estado
       FROM ${source}.dbo.PACO_LIBRO_RUTA_PROPUESTA WHERE Id=@propuestaId`,
      { propuestaId },
    );
    if (!proposal.length) throw new NotFoundException('Borrador no encontrado');

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hash(token);
    const expirationHours = Number(
      this.config.get('LIBRO_RUTA_TOKEN_EXPIRATION_HOURS') || 120,
    );
    await this.database.transaction(async (transaction) => {
      await this.database.query(
        `UPDATE dbo.PACO_LIBRO_RUTA_APROBACION SET FechaRespuesta=SYSDATETIME(),
         Accion='REEMPLAZADO' WHERE PropuestaId=@propuestaId AND FechaRespuesta IS NULL`,
        { propuestaId },
        transaction,
      );
      await this.database.query(
        `INSERT INTO dbo.PACO_LIBRO_RUTA_APROBACION
         (PropuestaId,Correo,TokenHash,FechaExpiracion)
         VALUES (@propuestaId,@correo,@tokenHash,DATEADD(HOUR,@hours,SYSDATETIME()))`,
        { propuestaId, correo, tokenHash, hours: expirationHours },
        transaction,
      );
    });

    const url = this.approvalUrl(token);
    await this.mailer.send({
      to: correo,
      subject: `Aprobación de libro de ruta ${proposal[0].RutaVendedor} - ${proposal[0].Semana}`,
      html: this.emailHtml(proposal[0], url),
    });
    return { enviado: true, propuestaId, correo };
  }

  async consultar(token: string) {
    const invitation = await this.invitacionValida(token);
    const source = this.sourceDatabase();
    const proposal = await this.database.query<any>(
      `SELECT TOP(1) Id,RutaVendedor,RutaOficial,Semana,Estado,Usuario,
       FechaCreacion,FechaActualizacion
       FROM ${source}.dbo.PACO_LIBRO_RUTA_PROPUESTA WHERE Id=@id`,
      { id: invitation.PropuestaId },
    );
    if (!proposal.length) throw new NotFoundException('Borrador no encontrado');
    const actual = await this.rutaActual(source, proposal[0]);
    const preliminar = await this.rutaPreliminar(source, proposal[0].Id);
    return {
      propuesta: proposal[0],
      correoAprobador: invitation.Correo,
      rutaActual: actual,
      rutaPreliminar: preliminar,
      comparacion: this.comparar(actual, preliminar),
    };
  }

  async responder(body: {
    token: string;
    accion: 'APROBAR' | 'RECHAZAR' | 'CAMBIOS';
    comentario?: string;
  }) {
    const action = String(body.accion || '').toUpperCase();
    if (!['APROBAR', 'RECHAZAR', 'CAMBIOS'].includes(action)) {
      throw new ConflictException('Acción inválida');
    }
    const invitation = await this.invitacionValida(body.token);
    const source = this.sourceDatabase();
    const status =
      action === 'APROBAR'
        ? 'APROBADO'
        : action === 'RECHAZAR'
        ? 'RECHAZADO'
        : 'CAMBIOS_SOLICITADOS';
    const comment = String(body.comentario || '')
      .trim()
      .substring(0, 1000);
    if (action !== 'APROBAR' && !comment) {
      throw new ConflictException(
        'Debe ingresar un comentario para rechazar o solicitar cambios',
      );
    }
    await this.database.transaction(async (transaction) => {
      const updated = await this.database.query<any>(
        `UPDATE dbo.PACO_LIBRO_RUTA_APROBACION SET FechaRespuesta=SYSDATETIME(),
         Accion=@action,Comentario=@comment OUTPUT INSERTED.Id
         WHERE Id=@id AND FechaRespuesta IS NULL AND FechaExpiracion>SYSDATETIME()`,
        { id: invitation.Id, action, comment },
        transaction,
      );
      if (!updated.length)
        throw new ConflictException('El enlace ya fue utilizado');
      await this.database.query(
        `UPDATE ${source}.dbo.PACO_LIBRO_RUTA_PROPUESTA SET Estado=@status,
         ComentarioAprobacion=@comment,FechaDecision=SYSDATETIME()
         WHERE Id=@proposalId`,
        { status, comment, proposalId: invitation.PropuestaId },
        transaction,
      );
    });
    const proposal = await this.database.query<any>(
      `SELECT TOP(1) RutaVendedor,Usuario,Semana FROM ${source}.dbo.PACO_LIBRO_RUTA_PROPUESTA WHERE Id=@id`,
      { id: invitation.PropuestaId },
    );
    const target = proposal[0]?.RutaVendedor || proposal[0]?.Usuario;
    await this.notifications.crearDesdeDocumento({
      destinatario: target,
      tipo: 'LIBRO_RUTA',
      titulo: `Libro de ruta ${status.toLowerCase().replace(/_/g, ' ')}`,
      mensaje: comment || `La propuesta de ${proposal[0]?.Semana || 'ruta'} fue ${status.toLowerCase()}.`,
      referencia: String(invitation.PropuestaId),
    });
    return { estado: status };
  }

  private async invitacionValida(token: string) {
    const value = String(token || '').replace(/\s+/g, '');
    if (value.length < 32) throw new NotFoundException('Enlace inexistente');
    const rows = await this.database.query<any>(
      `SELECT TOP(1) * FROM dbo.PACO_LIBRO_RUTA_APROBACION
       WHERE TokenHash=@hash`,
      { hash: this.hash(value) },
    );
    if (!rows.length) throw new NotFoundException('Enlace inexistente');
    if (rows[0].FechaRespuesta)
      throw new ConflictException('El enlace ya fue utilizado');
    if (new Date(rows[0].FechaExpiracion).getTime() <= Date.now()) {
      throw new ConflictException('El enlace ha expirado');
    }
    return rows[0];
  }

  private rutaActual(source: string, proposal: any): Promise<RutaRow[]> {
    return this.database.query<RutaRow>(
      `SELECT CASE L.Dias WHEN 1 THEN 'L' WHEN 2 THEN 'M' WHEN 3 THEN 'K'
       WHEN 4 THEN 'J' WHEN 5 THEN 'V' WHEN 6 THEN 'S' WHEN 7 THEN 'D' ELSE '?' END Dia,
       L.Orden,CodigoCliente=L.Cliente,NombreCliente=ISNULL(C.CardName,''),
       Direccion=ISNULL(C.Street,''),Origen='OFICIAL'
       FROM ${source}.dbo.APP_LR_S4HANA L
       LEFT JOIN ${source}.dbo.APP_CLIENTES_S4 C ON C.CardCode=L.Cliente
       WHERE L.Ruta=@ruta AND TRY_CONVERT(INT,
       REPLACE(REPLACE(UPPER(L.Semana),'SEMANA',''),'S',''))=@semana
       ORDER BY L.Dias,L.Orden`,
      { ruta: proposal.RutaOficial, semana: this.weekNumber(proposal.Semana) },
    );
  }

  private rutaPreliminar(source: string, id: number): Promise<RutaRow[]> {
    return this.database.query<RutaRow>(
      `SELECT Dia,Orden,CodigoCliente,NombreCliente=ISNULL(NombreCliente,''),
       Direccion=ISNULL(Direccion,''),Origen=ISNULL(Origen,'PROPUESTA')
       FROM ${source}.dbo.PACO_LIBRO_RUTA_PROPUESTA_DETALLE
       WHERE PropuestaId=@id ORDER BY CASE Dia WHEN 'L' THEN 1 WHEN 'M' THEN 2
       WHEN 'K' THEN 3 WHEN 'J' THEN 4 WHEN 'V' THEN 5 WHEN 'S' THEN 6 ELSE 7 END,Orden`,
      { id },
    );
  }

  private comparar(actual: RutaRow[], preliminar: RutaRow[]) {
    const key = (row: RutaRow) =>
      `${row.Dia}|${row.CodigoCliente}`.toUpperCase();
    const left = new Map(actual.map((row) => [key(row), row]));
    const right = new Map(preliminar.map((row) => [key(row), row]));
    return [...new Set([...left.keys(), ...right.keys()])].map((item) => {
      const current = left.get(item);
      const proposed = right.get(item);
      const resultado = !current
        ? 'AGREGADO'
        : !proposed
        ? 'RETIRADO'
        : Number(current.Orden) !== Number(proposed.Orden)
        ? 'CAMBIO_ORDEN'
        : 'SIN_CAMBIO';
      return {
        Dia: proposed?.Dia || current?.Dia,
        CodigoCliente: proposed?.CodigoCliente || current?.CodigoCliente,
        NombreCliente: proposed?.NombreCliente || current?.NombreCliente,
        OrdenActual: current?.Orden ?? null,
        OrdenPreliminar: proposed?.Orden ?? null,
        Resultado: resultado,
      };
    });
  }

  private validarClaveInterna(value: string) {
    const expected =
      this.config.get<string>('PACO_MOBILE_INTEGRATION_KEY') || '';
    const left = Buffer.from(value);
    const right = Buffer.from(expected);
    if (
      !expected ||
      left.length !== right.length ||
      !timingSafeEqual(left, right)
    ) {
      throw new ForbiddenException('Integración no autorizada');
    }
  }

  private approvalUrl(token: string) {
    const configured = (
      this.config.get<string>('LIBRO_RUTA_APPROVAL_URL') || ''
    ).trim();
    const base = configured || this.defaultApprovalUrl();
    return `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(
      token,
    )}`;
  }

  private defaultApprovalUrl() {
    const ticketsUrl = (
      this.config.get<string>('TICKETS_PUBLIC_FRONTEND_URL') || ''
    ).trim();
    try {
      return `${new URL(ticketsUrl).origin}/libro-ruta/aprobar`;
    } catch (_) {
      throw new Error('LIBRO_RUTA_APPROVAL_URL no está configurada');
    }
  }

  private emailHtml(proposal: any, url: string) {
    return `<div style="font-family:Arial,sans-serif;color:#14324a;line-height:1.5">
      <h2>Libro de ruta pendiente de aprobación</h2>
      <p>Se ha enviado una propuesta para la ruta <strong>${this.escape(
        proposal.RutaVendedor,
      )}</strong>,
      ${this.escape(proposal.Semana)}.</p>
      <p><a href="${url}" style="background:#006dff;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Revisar ruta actual y preliminar</a></p>
      <p>El enlace es personal, expira y solo puede utilizarse una vez.</p></div>`;
  }

  private escape(value: unknown) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }[char] || char),
    );
  }

  private hash(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private weekNumber(value: string) {
    return Number(String(value || '').match(/\d+/)?.[0] || 0);
  }
}
