import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? 3000);

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  });

  if (process.env.SWAGGER_ENABLED !== 'false') {
    setupSwagger(app);
  }

  await app.listen(port);
}

void bootstrap();
