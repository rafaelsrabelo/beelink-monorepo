// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PublicStore, Section, StoreComponent } from '@harness-monorepo/contracts';

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
 * A component's width and a banner's display, through the real pipe and the real database.
 *
 * What the unit specs cannot show: that a bad value is stopped by the global pipe with the code the
 * contract names — not by Prisma as a 500 — and that the column round-trips through Postgres.
 */
describe('page — span and display', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let banner: StoreComponent;

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

    const section = await call('POST', '/api/stores/padaria-do-bairro/sections', {
      component: { kind: 'BANNER', span: 'THIRD', items: [SLIDE] },
    });
    if (section.statusCode !== 201) throw new Error(`POST sections answered ${section.statusCode}: ${section.payload}`);
    banner = section.json<Section>().components[0]!;
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, payload?: object) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      ...(payload ? { payload } : {}),
    });
  }

  it('creates a banner with the span it was sent, and a display of its own', () => {
    expect(banner).toMatchObject({ span: 'THIRD', display: 'CAROUSEL' });
    expect(banner).not.toHaveProperty('layout');
  });

  it('refuses a span that is not one of the four with its own code, not a 500', async () => {
    const response = await call('PATCH', `/api/stores/padaria-do-bairro/components/${banner.id}`, { span: 'QUARTER' });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().errorCode).toBe('COMPONENT_SPAN_INVALID');
  });

  it('refuses a null span with the same code, before the NOT NULL column can', async () => {
    const response = await call('PATCH', `/api/stores/padaria-do-bairro/components/${banner.id}`, { span: null });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().errorCode).toBe('COMPONENT_SPAN_INVALID');
  });

  it('refuses a display that is not one of the two with its own code', async () => {
    const response = await call('PATCH', `/api/stores/padaria-do-bairro/components/${banner.id}`, { display: 'SIDEWAYS' });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().errorCode).toBe('COMPONENT_DISPLAY_INVALID');
  });

  // `layout` left the wire once nothing sent or read it; a client still sending it is told so.
  it('refuses a write that still sends layout', async () => {
    const response = await call('PATCH', `/api/stores/padaria-do-bairro/components/${banner.id}`, { layout: 'HALVES' });

    expect(response.statusCode).toBe(400);
  });

  it('refuses a display on a kind that does not draw it', async () => {
    const response = await call('POST', '/api/stores/padaria-do-bairro/sections', {
      component: { kind: 'HEADING', title: 'Novidades', display: 'GRID' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().errorCode).toBe('COMPONENT_DISPLAY_INVALID');
  });

  it('stores what a patch sends and answers it back', async () => {
    const response = await call('PATCH', `/api/stores/padaria-do-bairro/components/${banner.id}`, {
      span: 'TWO_THIRDS',
      display: 'GRID',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<StoreComponent>()).toMatchObject({ span: 'TWO_THIRDS', display: 'GRID' });
  });

  it('hands span and display to a visitor on every component', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/stores/padaria-do-bairro/public' });
    const components = response.json<PublicStore>().sections.flatMap((section) => section.components);

    expect(components.length).toBeGreaterThan(1);
    for (const component of components) {
      expect(component).toHaveProperty('span');
      expect(component).toHaveProperty('display');
    }
    expect(components.find((component) => component.kind === 'BANNER')).toMatchObject({ span: 'THIRD', display: 'CAROUSEL' });
    expect(components.find((component) => component.kind === 'PRODUCTS')).toMatchObject({ span: 'FULL', display: 'RAIL' });
  });

  // Opens as the rail the shopkeeper asked for, can go back to the grid it always was, never a carousel.
  it('opens a categories block as a rail, lets it be a grid, and never a carousel', async () => {
    const created = await call('POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'CATEGORIES' } });
    const categories = created.json<Section>().components[0]!;
    expect(categories).toMatchObject({ display: 'RAIL' });

    const grid = await call('PATCH', `/api/stores/padaria-do-bairro/components/${categories.id}`, { display: 'GRID' });
    expect(grid.json<StoreComponent>()).toMatchObject({ display: 'GRID' });

    const carousel = await call('PATCH', `/api/stores/padaria-do-bairro/components/${categories.id}`, { display: 'CAROUSEL' });
    expect(carousel.statusCode).toBe(400);
    expect(carousel.json<ApiErrorBody>().errorCode).toBe('COMPONENT_DISPLAY_INVALID');

    const visitor = (await app.inject({ method: 'GET', url: '/api/stores/padaria-do-bairro/public' })).json<PublicStore>();
    const served = visitor.sections.flatMap((section) => section.components).find((row) => row.id === categories.id);
    expect(served).toMatchObject({ display: 'GRID' });
  });

  // The panel's "+" between two bands, and between two blocks of one band.
  it('adds a band and a block where the "+" was pressed, and refuses a place that is not one', async () => {
    const before = (await call('GET', '/api/stores/padaria-do-bairro/sections')).json<Section[]>().map((row) => row.id);

    const band = (await call('POST', '/api/stores/padaria-do-bairro/sections', { position: 1, component: { kind: 'HEADING', title: 'Meio' } })).json<Section>();
    const after = (await call('GET', '/api/stores/padaria-do-bairro/sections')).json<Section[]>().map((row) => row.id);
    expect(after).toEqual([before[0], band.id, ...before.slice(1)]);

    const first = await call('POST', `/api/stores/padaria-do-bairro/sections/${band.id}/components`, { kind: 'TEXT', body: 'Antes', position: 0 });
    const inBand = (await call('GET', '/api/stores/padaria-do-bairro/sections')).json<Section[]>().find((row) => row.id === band.id)!;
    expect(inBand.components.map((component) => component.id)).toEqual([first.json<StoreComponent>().id, band.components[0]!.id]);

    for (const position of [-1, 1.5, 'dois']) {
      const refused = await call('POST', '/api/stores/padaria-do-bairro/sections', { position, component: { kind: 'HEADING', title: 'x' } });
      expect(refused.statusCode, String(position)).toBe(400);
      expect(refused.json<ApiErrorBody>().errorCode).toBe('POSITION_INVALID');

      const intoBand = await call('POST', `/api/stores/padaria-do-bairro/sections/${band.id}/components`, { kind: 'TEXT', body: 'x', position });
      expect(intoBand.statusCode, String(position)).toBe(400);
      expect(intoBand.json<ApiErrorBody>().errorCode).toBe('POSITION_INVALID');
    }
  });

  // An add renumbers the bands a publish is reordering: under one lock, neither ties nor deadlocks.
  it('keeps every band on its own number when an add races a reorder', async () => {
    for (let round = 0; round < 8; round += 1) {
      const ids = (await call('GET', '/api/stores/padaria-do-bairro/sections')).json<Section[]>().map((row) => row.id);
      const [reordered, added] = await Promise.all([
        call('PUT', '/api/stores/padaria-do-bairro/sections/reorder', { ids: [...ids.slice(1), ids[0]] }),
        call('POST', '/api/stores/padaria-do-bairro/sections', { position: 1, component: { kind: 'HEADING', title: `Rodada ${round}` } }),
      ]);

      expect([reordered.statusCode, added.statusCode].every((code) => code < 500), `round ${round}`).toBe(true);
      const positions = await app.get(PrismaService).storeSection.findMany({ select: { position: true } });
      expect(new Set(positions.map((row) => row.position)).size, `round ${round}`).toBe(positions.length);
    }
  });
});
