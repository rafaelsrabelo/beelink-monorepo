// Nest
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { Logger } from 'nestjs-pino';

// App
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { env } from './shared/config/env.js';
import { setupSwagger } from './shared/swagger/setup-swagger.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  await configureApp(app);

  if (env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  app.enableShutdownHooks();

  // 0.0.0.0, not Fastify's default localhost: inside a container, localhost is unreachable from outside.
  await app.listen(env.PORT, '0.0.0.0');
}

await bootstrap();
