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
 * A block moved into another band, through the real pipe, the real lock and the real database.
 *
 * What the unit specs cannot show: that the band left empty is really gone — its delete cascades,
 * so a delete run before the block had left would have taken the block with it — and that both
 * bands come back renumbered from 0.
 */
describe('page — a block moves into another band', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let upper: Section;
  let lower: Section;

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

    // Two banners stacked, each alone in its band: the case "Pôr ao lado" exists for.
    upper = await band({ kind: 'BANNER', span: 'HALF', items: [SLIDE] });
    lower = await band({ kind: 'BANNER', items: [SLIDE] });
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown, session: AuthSession = owner) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${session.accessToken}` },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });
  }

  async function band(component: object): Promise<Section> {
    const response = await call('POST', '/api/stores/padaria-do-bairro/sections', { component });
    if (response.statusCode !== 201) throw new Error(`POST sections answered ${response.statusCode}: ${response.payload}`);
    return response.json<Section>();
  }

  function move(componentId: string, body: unknown) {
    return call('PUT', `/api/stores/padaria-do-bairro/components/${componentId}/section`, body);
  }

  it('puts a banner beside another in one band, and deletes the band it left', async () => {
    const moved = lower.components[0]!;

    const response = await move(moved.id, { sectionId: upper.id, position: 1, span: 'HALF' });

    expect(response.statusCode, response.payload).toBe(200);
    const page = response.json<Section[]>();
    const joined = page.find((section) => section.id === upper.id)!;
    expect(joined.components.map((component) => [component.id, component.position, component.span])).toEqual([
      [upper.components[0]!.id, 0, 'HALF'],
      [moved.id, 1, 'HALF'],
    ]);
    expect(joined.components[1]).toMatchObject({ sectionId: upper.id, items: [SLIDE] });
    expect(page.some((section) => section.id === lower.id)).toBe(false);
    expect(await app.get(PrismaService).storeSection.count({ where: { id: lower.id } })).toBe(0);
  });

  it('closes up the band it left when others stay, and lands last without a place', async () => {
    const pair = await band({ kind: 'HEADING', title: 'Novidades' });
    const text = (
      await call('POST', `/api/stores/padaria-do-bairro/sections/${pair.id}/components`, { kind: 'TEXT', body: 'Fica', position: 0 })
    ).json<StoreComponent>();

    const response = await move(text.id, { sectionId: upper.id });

    expect(response.statusCode, response.payload).toBe(200);
    const page = response.json<Section[]>();
    expect(page.find((section) => section.id === upper.id)!.components.map((component) => [component.id, component.position])).toEqual([
      [upper.components[0]!.id, 0],
      [text.id, 1],
    ]);
    expect(page.find((section) => section.id === pair.id)!.components.map((component) => [component.id, component.position])).toEqual([
      [pair.components[0]!.id, 0],
    ]);
  });

  it('refuses to move the strip above the header, and to move anything into its band', async () => {
    const strip = await band({ kind: 'ANNOUNCEMENT', title: 'Frete grátis' });

    for (const response of [
      await move(strip.components[0]!.id, { sectionId: upper.id }),
      await move(lower.components[0]!.id, { sectionId: strip.id }),
    ]) {
      expect(response.statusCode, response.payload).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('COMPONENT_NOT_MOVABLE');
    }

    const page = (await call('GET', '/api/stores/padaria-do-bairro/sections')).json<Section[]>();
    expect(page.find((section) => section.id === lower.id)!.components).toHaveLength(1);
  });

  it('answers another shop’s band as one this shop does not have', async () => {
    const neighbour = await signUpAndSignIn(app, newEmail('vizinha'));
    await call('POST', '/api/stores', { ...shopBody, name: 'Vizinha', slug: 'vizinha' }, neighbour);
    const theirs = (await call('GET', '/api/stores/vizinha/sections', undefined, neighbour)).json<Section[]>()[0]!;

    const response = await move(lower.components[0]!.id, { sectionId: theirs.id });

    expect(response.statusCode, response.payload).toBe(404);
    expect(response.json<ApiErrorBody>().errorCode).toBe('SECTION_NOT_FOUND');
  });

  it('refuses a place or a span that is not one with the codes the contract names', async () => {
    const id = lower.components[0]!.id;

    for (const [body, errorCode] of [
      [{ sectionId: upper.id, position: -1 }, 'POSITION_INVALID'],
      [{ sectionId: upper.id, position: 1.5 }, 'POSITION_INVALID'],
      [{ sectionId: upper.id, span: 'QUARTER' }, 'COMPONENT_SPAN_INVALID'],
      [{ sectionId: upper.id, span: null }, 'COMPONENT_SPAN_INVALID'],
    ] as const) {
      const response = await move(id, body);

      expect(response.statusCode, JSON.stringify(body)).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode, JSON.stringify(body)).toBe(errorCode);
    }
  });
});
