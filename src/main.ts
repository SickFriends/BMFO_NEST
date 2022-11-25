import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  console.log(path.join(__dirname, 'uploads'));
  app.useStaticAssets(path.join(__dirname, 'uploads'), {
    prefix: '/media',
  });
  app.setGlobalPrefix('api');
  app.setBaseViewsDir(join(__dirname, '..', 'src', 'views'));
  app.setViewEngine('ejs');
  app.use(cookieParser());

  app.enableCors({});
  await app.listen(8000);
}

bootstrap();
