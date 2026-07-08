import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { networkInterfaces } from 'os';
import { AppModule } from './app.module';

function getNetworkUrls(port: number): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => `http://${net.address}:${port}`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  app.getHttpAdapter().getInstance().set('etag', false);

  app.use(json({ limit: process.env.REQUEST_BODY_LIMIT ?? '20mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: process.env.REQUEST_BODY_LIMIT ?? '20mb',
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Paco Admin')
    .setDescription('Backend PACO Admin migrado de ASP.NET Core a NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'swagger',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = Number(process.env.PORT ?? 3045);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);

  logger.log(`Servidor levantado en http://${host}:${port}`);
  if (host === '0.0.0.0') {
    getNetworkUrls(port).forEach((url) => logger.log(`Disponible en ${url}`));
  }
}

void bootstrap();
