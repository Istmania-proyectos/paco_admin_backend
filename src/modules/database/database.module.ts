import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { legacyEntities } from './entities/legacy.entities';
import { DatabaseService } from './database.service';
import { S4HanaDatabaseService } from './s4hana-database.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get('DB_PORT') ?? 1433),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        requestTimeout: Number(config.get('DB_REQUEST_TIMEOUT_MS') ?? 15000),
        entities: legacyEntities,
        synchronize: false,
        options: {
          encrypt: config.get('DB_ENCRYPT') === 'true',
          trustServerCertificate:
            config.get('DB_TRUST_SERVER_CERTIFICATE') !== 'false',
          enableArithAbort: true,
        },
      }),
    }),
    TypeOrmModule.forFeature(legacyEntities),
  ],
  providers: [DatabaseService, S4HanaDatabaseService],
  exports: [DatabaseService, S4HanaDatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
