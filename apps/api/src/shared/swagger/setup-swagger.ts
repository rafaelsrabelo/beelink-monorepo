// Nest
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

// App
import { env } from '../config/env.js';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Harness API')
    .setDescription('The example API of harness-monorepo.')
    .setVersion('1.0')
    .build();

  SwaggerModule.setup(`${env.API_PREFIX}/docs`, app, SwaggerModule.createDocument(app, config));
}
