// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PublicStore, Section, StoreComponent } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';
import { publishPage } from './support/publish.js';

const shopBody = {
  name: 'Padaria do Bairro',
  slug: 'padaria-do-bairro',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

/**
 * Where a component shows, through the real pipe and database: written, read by the owner and by a
 * visitor alike — the shop window hides by screen size, so the public read is not filtered by device —
 * and carried by a copy. The strip shows everywhere.
 */
describe('page — a component shown only on a computer or only on a phone', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let band: Section;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    owner = await signUpAndSignIn(app, newEmail('dona'));

    const created = await call('POST', '/api/stores', shopBody);
    if (created.statusCode !== 201) throw new Error(`POST stores answered ${created.statusCode}: ${created.payload}`);

    const response = await call('POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'HEADING', title: 'Só no computador', visibleOn: 'DESKTOP' } });
    if (response.statusCode !== 201) throw new Error(`POST sections answered ${response.statusCode}: ${response.payload}`);
    band = response.json<Section>();
  });

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, payload?: unknown) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });
  }

  it('writes it, and serves it to the owner and to a visitor', async () => {
    expect(band.components[0]?.visibleOn).toBe('DESKTOP');

    const patched = await call('PATCH', `/api/stores/padaria-do-bairro/components/${band.components[0]!.id}`, { visibleOn: 'PHONE' });
    expect(patched.statusCode, patched.payload).toBe(200);
    expect(patched.json<StoreComponent>().visibleOn).toBe('PHONE');

    await publishPage(app, owner.accessToken, 'padaria-do-bairro');
    const visitor = (await app.inject({ method: 'GET', url: '/api/stores/padaria-do-bairro/public' })).json<PublicStore>();
    const drawn = visitor.sections.flatMap((section) => section.components).find((component) => component.id === band.components[0]!.id);
    expect(drawn?.visibleOn).toBe('PHONE');
  });

  it('shows everywhere unless told otherwise', async () => {
    const response = await call('POST', `/api/stores/padaria-do-bairro/sections/${band.id}/components`, { kind: 'TEXT', body: 'Em todo lugar' });

    expect(response.json<StoreComponent>().visibleOn).toBe('ALL');
  });

  it('keeps where the original shows on its copy', async () => {
    const copy = await call('POST', `/api/stores/padaria-do-bairro/components/${band.components[0]!.id}/duplicate`);

    expect(copy.statusCode, copy.payload).toBe(201);
    expect(copy.json<StoreComponent>().visibleOn).toBe('DESKTOP');
  });

  it('refuses the strip anywhere but everywhere', async () => {
    const response = await call('POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'ANNOUNCEMENT', title: 'Frete grátis', visibleOn: 'PHONE' } });

    expect(response.statusCode, response.payload).toBe(400);
    expect(response.json<ApiErrorBody>().errorCode).toBe('COMPONENT_VISIBILITY_INVALID');
  });
});
