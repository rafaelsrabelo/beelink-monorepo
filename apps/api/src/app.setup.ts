// Nest
import { ValidationPipe } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

// App
import { env } from './shared/config/env.js';
import { ApiExceptionFilter } from './shared/http/api-exception.filter.js';

/**
 * Everything a request passes through before it reaches a controller, in one place — so the e2e
 * tests boot the same pipeline `main.ts` does, not a lookalike.
 */
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  await app.register(helmet, {
    // Swagger UI ships inline scripts and styles; the default policy blanks the docs page.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        scriptSrc: ["'self'", "https: 'unsafe-inline'"],
      },
    },
  });
  await app.register(cors, { origin: env.CORS_ORIGINS });

  app.setGlobalPrefix(env.API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // No `enableImplicitConversion`: it coerces after `@Transform` runs, so `Boolean('false')`
      // quietly becomes `true`. A number or a date says so with `@Type`.
      transformOptions: { exposeUnsetFields: false },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}
