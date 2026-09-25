// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';

// App
import { AppModule } from '../../src/app.module.js';
import { configureApp, createFastifyAdapter } from '../../src/app.setup.js';

/**
 * Boots the real application — the same pipeline main.ts runs — ready for `app.inject()`. `adjust`
 * may stand a fake in for a provider that reaches a third party, as Google's door does.
 */
export async function createTestApp(adjust?: (builder: TestingModuleBuilder) => TestingModuleBuilder): Promise<NestFastifyApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await (adjust ? adjust(builder) : builder).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(createFastifyAdapter());

  await configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}
