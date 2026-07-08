import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/modules/database/database.service';

describe('PACO Admin routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET ||= 'test-secret-with-at-least-32-characters';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({
        executeProcedure: jest.fn().mockResolvedValue([]),
        query: jest.fn().mockResolvedValue([]),
        transaction: jest.fn(),
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('protege los endpoints PACO', () =>
    request(app.getHttpServer()).get('/api/Paco/GetPACO').expect(401));

  it('expone Punteo sin autenticación', () =>
    request(app.getHttpServer()).get('/api/Punteo').expect(200, []));
});
