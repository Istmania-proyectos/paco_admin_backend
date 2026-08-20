import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NotificacionesService implements OnModuleInit {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureTable();
  }

  private sourceDatabase() {
    const value = this.config.get<string>('PACO_ROUTE_DATABASE') || 'PACO_S4HANA';
    if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error('PACO_ROUTE_DATABASE inválida');
    return `[${value}]`;
  }

  private async ensureTable() {
    const source = this.sourceDatabase();
    await this.database.query(`
      IF OBJECT_ID('${source}.dbo.PACO_NOTIFICACION_USUARIO', 'U') IS NULL
      BEGIN
        CREATE TABLE ${source}.dbo.PACO_NOTIFICACION_USUARIO (
          Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          Destinatario NVARCHAR(80) NOT NULL,
          Tipo NVARCHAR(50) NOT NULL,
          Titulo NVARCHAR(200) NOT NULL,
          Mensaje NVARCHAR(1000) NOT NULL,
          Referencia NVARCHAR(150) NULL,
          FechaCreacion DATETIME2 NOT NULL CONSTRAINT DF_PACO_NOTIF_FECHA DEFAULT SYSDATETIME(),
          FechaLectura DATETIME2 NULL
        );
        CREATE INDEX IX_PACO_NOTIF_DEST_FECHA
          ON ${source}.dbo.PACO_NOTIFICACION_USUARIO(Destinatario, FechaCreacion DESC);
      END;
    `);
  }

  async crearDesdeDocumento(input: {
    destinatario: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    referencia?: string;
  }) {
    const destinatario = String(input.destinatario || '').replace(/^RUTA:/i, '').trim();
    if (!destinatario) return;
    const source = this.sourceDatabase();
    await this.database.query(
      `INSERT INTO ${source}.dbo.PACO_NOTIFICACION_USUARIO
       (Destinatario,Tipo,Titulo,Mensaje,Referencia)
       VALUES (@destinatario,@tipo,@titulo,@mensaje,@referencia)`,
      { ...input, destinatario, referencia: input.referencia || null },
    );
  }
}
