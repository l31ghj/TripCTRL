import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  const corsOriginsEnv = process.env.CORS_ORIGIN;
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const uploadsDir = join(process.cwd(), 'uploads', 'trips');
  fs.mkdirSync(uploadsDir, { recursive: true });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(8000);
}
bootstrap();
