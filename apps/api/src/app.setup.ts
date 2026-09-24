// Nest
import { HttpException } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

// App
import { env } from './shared/config/env.js';
import { ApiExceptionFilter } from './shared/http/api-exception.filter.js';
import { ApiValidationPipe } from './shared/http/api-validation.pipe.js';
import { MAX_UPLOAD_BYTES } from './modules/uploads/uploads.constants.js';

/**
 * `trustProxy` decides whose x-forwarded-for the server believes. Every browser call arrives
 * through the web app's route handlers, so without it the rate limit would see one address for
 * every person; open to anyone, it would let a caller forge one.
 */
function trustProxy(): boolean | string {
  if (env.TRUST_PROXY === 'false') return false;
  if (env.TRUST_PROXY === 'true') return true;
  return env.TRUST_PROXY;
}

/** One adapter for main.ts and for the e2e tests, so they cannot drift apart. */
export function createFastifyAdapter(): FastifyAdapter {
  return new FastifyAdapter({ trustProxy: trustProxy() });
}

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

  // The uploads route is the only multipart one. The ceiling here is the plugin's own backstop —
  // it stops reading rather than buffering whatever arrives — and the controller is what turns a
  // truncated read into 413. One more byte than the limit, so a file exactly at it still passes.
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES + 1, files: 1, fields: 4 } });

  // Registered before Nest declares its routes, which is what lets a route opt in with @RouteConfig.
  // The builder returns an HttpException on purpose: the plugin throws whatever it gets, and only an
  // HttpException reaches ApiExceptionFilter as itself — anything else leaves as a 500.
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) =>
      new HttpException(
        { errorCode: 'RATE_LIMITED', message: `Too many requests. Try again in ${context.after}.` },
        context.statusCode,
      ),
  });

  app.setGlobalPrefix(env.API_PREFIX);
  app.useGlobalPipes(
    new ApiValidationPipe({
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
