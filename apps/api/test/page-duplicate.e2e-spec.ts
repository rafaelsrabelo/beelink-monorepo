// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Section, StoreComponent } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const shopBody = {
  name: 'Padaria do Bairro',
  slug: 'padaria-do-bairro',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

const SLIDE = { id: 'capa', imageUrl: 'https://cdn.example/capa.png', target: 'NONE' };

/**
 * A band and a block duplicated, through the real pipe, the real lock and the real database: the
 * copy lands right after the original, hidden, with the rows after it renumbered and items of its own.
 */
describe('page — duplicate a band or a block', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let first: Section;
  let last: Section;

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

    first = await band({ name: 'Coleções', width: 'FULL', component: { kind: 'BANNER', span: 'THIRD', items: [SLIDE] } });
    last = await band({ component: { kind: 'HEADING', title: 'Novidades' } });
  });

  function call(method: 'GET' | 'POST', url: string, payload?: unknown, session: AuthSession = owner) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${session.accessToken}` },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });
  }

  async function band(body: object): Promise<Section> {
    const response = await call('POST', '/api/stores/padaria-do-bairro/sections', body);
    if (response.statusCode !== 201) throw new Error(`POST sections answered ${response.statusCode}: ${response.payload}`);
    return response.json<Section>();
  }

  async function page(): Promise<Section[]> {
    return (await call('GET', '/api/stores/padaria-do-bairro/sections')).json<Section[]>();
  }

  it('copies a band and its blocks right after it, hidden and unnamed', async () => {
    const response = await call('POST', `/api/stores/padaria-do-bairro/sections/${first.id}/duplicate`);

    expect(response.statusCode, response.payload).toBe(201);
    const copy = response.json<Section>();
    expect(copy).toMatchObject({ name: null, width: 'FULL', isActive: false });
    expect(copy.components).toHaveLength(1);
    expect(copy.components[0]).toMatchObject({ kind: 'BANNER', span: 'THIRD', isActive: true });
    expect(copy.components[0]!.id).not.toBe(first.components[0]!.id);
    expect((copy.components[0]!.items[0] as { id: string }).id).not.toBe(SLIDE.id);

    const ids = (await page()).map((section) => section.id);
    expect(ids.slice(-3)).toEqual([first.id, copy.id, last.id]);
  });

  it('copies a block right after it in its band, hidden', async () => {
    const original = first.components[0]!;

    const response = await call('POST', `/api/stores/padaria-do-bairro/components/${original.id}/duplicate`);

    expect(response.statusCode, response.payload).toBe(201);
    const copy = response.json<StoreComponent>();
    expect(copy).toMatchObject({ sectionId: first.id, kind: 'BANNER', span: 'THIRD', position: 1, isActive: false });
    const band = (await page()).find((section) => section.id === first.id)!;
    expect(band.components.map((component) => component.id)).toEqual([original.id, copy.id]);
  });

  it('refuses the strip, which is one per shop, at either level', async () => {
    const strip = await band({ component: { kind: 'ANNOUNCEMENT', title: 'Frete grátis' } });

    for (const response of [
      await call('POST', `/api/stores/padaria-do-bairro/sections/${strip.id}/duplicate`),
      await call('POST', `/api/stores/padaria-do-bairro/components/${strip.components[0]!.id}/duplicate`),
    ]) {
      expect(response.statusCode, response.payload).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('COMPONENT_KIND_SINGLETON');
    }
  });

  it('answers another shop’s band and block as ones this shop does not have', async () => {
    const stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', { ...shopBody, name: 'Outra', slug: 'outra-loja' }, stranger);

    const band = await call('POST', `/api/stores/outra-loja/sections/${first.id}/duplicate`, undefined, stranger);
    const block = await call('POST', `/api/stores/outra-loja/components/${first.components[0]!.id}/duplicate`, undefined, stranger);

    expect(band.statusCode, band.payload).toBe(404);
    expect(band.json<ApiErrorBody>().errorCode).toBe('SECTION_NOT_FOUND');
    expect(block.statusCode, block.payload).toBe(404);
    expect(block.json<ApiErrorBody>().errorCode).toBe('COMPONENT_NOT_FOUND');
  });

  it('asks for a session', async () => {
    const response = await app.inject({ method: 'POST', url: `/api/stores/padaria-do-bairro/sections/${first.id}/duplicate` });

    expect(response.statusCode).toBe(401);
  });
});
