import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';

@Injectable()
export class S4HanaDatabaseService extends DatabaseService {
  constructor(config: ConfigService) {
    super(config);
  }

  protected getDatabaseName(): string {
    return this.config.get<string>('PACO_S4HANA_DB_NAME') || 'PACO_S4HANA';
  }
}
