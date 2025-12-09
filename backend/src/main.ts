import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const uploadsRoot = join(process.cwd(), 'uploads');
  fs.mkdirSync(join(uploadsRoot, 'trips'), { recursive: true });
  fs.mkdirSync(join(uploadsRoot, 'attachments'), { recursive: true });

  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads',
  });

  await app.listen(8000);
}
bootstrap();
