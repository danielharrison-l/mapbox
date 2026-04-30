import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { apiEnv } from './config/env';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: apiEnv.webOrigins,
  });

  setupSwagger(app);

  await app.listen(apiEnv.apiPort);
  logger.log(`API listening on port ${apiEnv.apiPort}`);
  logger.log(`CORS enabled for: ${apiEnv.webOrigins.join(', ')}`);
}

void bootstrap();
