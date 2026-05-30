import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req, _res, next) => {
    req.url = req.url.replace(/\/{2,}/g, '/');
    next();
  });

  // Increase payload limit to allow large images (base64)
  app.use(json({ limit: '20mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: '20mb',
    }),
  );

  //* Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Market Backend API')
    .setDescription('Market Online API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(new ValidationPipe({ stopAtFirstError: true }));
  //Start the server

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  await app.listen(3045);
}
bootstrap();
