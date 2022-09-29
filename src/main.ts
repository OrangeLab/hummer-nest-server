import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser'
import config from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 跨域配置
  app.enableCors({
    "origin": 'http://localhost:8000', // TODO: 环境配置化
    "credentials": true,
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204,
    "allowedHeaders": 'Content-Type,Content-Length, Authorization, Accept,X-Requested-With'
  });
  // cookie解析中间件
  app.use(cookieParser());
  await app.listen(config.port);
}

bootstrap();
