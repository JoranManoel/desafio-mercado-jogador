import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendOrigin = process.env.FRONTEND_ORIGIN;

  if (!frontendOrigin) {
    throw new Error('A variável FRONTEND_ORIGIN precisa estar configurada.');
  }

  app.enableCors({
    origin: frontendOrigin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  });

  // Prefixo exigido pelo enunciado
  app.setGlobalPrefix('api/v1');

  // Validação global das requisições
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Permite executar corretamente os hooks de encerramento
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();