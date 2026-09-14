// Nest
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

// App
import { env } from '../config/env.js';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Harness API')
    .setDescription(
      'Accounts and sessions. Every error answers `{ statusCode, errorCode, message }`; clients switch on `errorCode`.',
    )
    .setVersion('1.0')
    // The name must match @ApiBearerAuth() on the protected controllers.
    .addBearerAuth()
    .build();

  SwaggerModule.setup(`${env.API_PREFIX}/docs`, app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });
}
