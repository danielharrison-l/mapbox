import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const swaggerPath = process.env.SWAGGER_PATH ?? 'docs';

  const config = new DocumentBuilder()
    .setTitle('Mapbox Vision API')
    .setDescription('Documentacao tecnica da API da POC geoespacial.')
    .setVersion('0.1.0')
    .addTag('health', 'Health checks e operacao da API')
    .addTag('deliverables', 'Entregaveis georreferenciados futuros')
    .addTag('geo', 'Operacoes geoespaciais e PostGIS futuras')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
