// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// App
import { createTestApp } from './support/create-test-app.js';

describe('GET /api/health', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers ok through the real request pipeline', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
