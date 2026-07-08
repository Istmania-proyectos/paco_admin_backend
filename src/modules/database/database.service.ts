import {
  Injectable,
  InternalServerErrorException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

export type ProcedureParams = Record<string, unknown>;

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private poolPromise?: Promise<sql.ConnectionPool>;

  constructor(private readonly config: ConfigService) {}

  private getPool(): Promise<sql.ConnectionPool> {
    if (!this.poolPromise) {
      const server = this.config.get<string>('DB_HOST');
      const database = this.config.get<string>('DB_NAME');
      const user = this.config.get<string>('DB_USER');
      const password = this.config.get<string>('DB_PASSWORD');

      if (!server || !database || !user || !password) {
        throw new InternalServerErrorException(
          'Configuración SQL Server incompleta: DB_HOST, DB_NAME, DB_USER y DB_PASSWORD son requeridos',
        );
      }

      this.poolPromise = new sql.ConnectionPool({
        server,
        database,
        user,
        password,
        port: Number(this.config.get('DB_PORT') ?? 1433),
        options: {
          encrypt: this.config.get('DB_ENCRYPT') === 'true',
          trustServerCertificate:
            this.config.get('DB_TRUST_SERVER_CERTIFICATE') !== 'false',
          enableArithAbort: true,
        },
        pool: {
          min: 0,
          max: Number(this.config.get('DB_POOL_MAX') ?? 10),
          idleTimeoutMillis: 30000,
        },
      })
        .connect()
        .catch((error) => {
          this.poolPromise = undefined;
          throw error;
        });
    }

    return this.poolPromise;
  }

  async query<T>(
    statement: string,
    params: ProcedureParams = {},
    transaction?: sql.Transaction,
  ): Promise<T[]> {
    const request = transaction
      ? new sql.Request(transaction)
      : (await this.getPool()).request();

    for (const [name, value] of Object.entries(params)) {
      request.input(name, value as never);
    }

    const result = await request.query(statement);
    return result.recordset as T[];
  }

  async executeProcedure<T>(
    procedure: string,
    params: ProcedureParams,
  ): Promise<T[]> {
    const request = (await this.getPool()).request();

    for (const [name, value] of Object.entries(params)) {
      request.input(name, sql.VarChar(sql.MAX), value ?? '');
    }

    const result = await request.execute<T>(procedure);
    return result.recordset ?? [];
  }

  async transaction<T>(
    work: (transaction: sql.Transaction) => Promise<T>,
  ): Promise<T> {
    const transaction = new sql.Transaction(await this.getPool());
    await transaction.begin();

    try {
      const result = await work(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async onApplicationShutdown() {
    if (this.poolPromise) {
      const pool = await this.poolPromise.catch(() => undefined);
      await pool?.close();
    }
  }
}
