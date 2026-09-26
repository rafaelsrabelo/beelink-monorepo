// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Section } from '@harness-monorepo/contracts';

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

type Method = 'POST' | 'PUT' | 'PATCH';

/** An id the pipe takes, so a row that names it is refused for its other field and for nothing else. */
const WELL_FORMED_ID = '0199b000-0000-7000-8000-000000000001';

/**
 * Every write route of the page module, fed bodies it must refuse.
 *
 * One assertion, the one the ticket asks for: an invalid body is a 400 the client can act on, never
 * a 500 that reached the database. Each row was either a 500 when this was written or is the same
 * shape of mistake on a neighbouring field — a required object missing, a null on a NOT NULL
 * column, a value of the wrong type. A field that repeats the hole belongs in this table.
 */
describe('page — an invalid body is a 400, never a 500', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let sectionId: string;
  let componentId: string;

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

    const section = (await call('POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'HEADING', title: 'Oi' } })).json<Section>();
    sectionId = section.id;
    componentId = section.components[0]!.id;
  });

  function call(method: Method | 'GET' | 'DELETE', url: string, payload?: unknown) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });
  }

  it('refuses a band with no component, with a code of its own', async () => {
    for (const body of [{}, { name: 'Serviços' }, { component: null }, { component: 'BANNER' }]) {
      const response = await call('POST', '/api/stores/padaria-do-bairro/sections', body);

      expect(response.statusCode, JSON.stringify(body)).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode, JSON.stringify(body)).toBe('SECTION_COMPONENT_REQUIRED');
    }
  });

  const cases: { name: string; method: Method; url: () => string; body: unknown }[] = [
    { name: 'a band with a null width', method: 'POST', url: () => '/api/stores/padaria-do-bairro/sections', body: { width: null, component: { kind: 'HEADING' } } },
    { name: 'a band created hidden as null', method: 'POST', url: () => '/api/stores/padaria-do-bairro/sections', body: { isActive: null, component: { kind: 'HEADING' } } },
    { name: 'a component with no kind', method: 'POST', url: () => '/api/stores/padaria-do-bairro/sections', body: { component: {} } },
    { name: 'a component with a null span', method: 'POST', url: () => '/api/stores/padaria-do-bairro/sections', body: { component: { kind: 'HEADING', span: null } } },
    { name: 'a band patched to a null width', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}`, body: { width: null } },
    { name: 'a band patched to a null visibility', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}`, body: { isActive: null } },
    { name: 'a band named with a number', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}`, body: { name: 5 } },
    { name: 'a band coloured with a word', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}`, body: { background: 'red' } },
    { name: 'a component added with no kind', method: 'POST', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}/components`, body: {} },
    { name: 'a component added hidden as null', method: 'POST', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}/components`, body: { kind: 'HEADING', isActive: null } },
    { name: 'a component added with items that are not a list', method: 'POST', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}/components`, body: { kind: 'BANNER', items: 'x' } },
    { name: 'a component added with columns that are not a number', method: 'POST', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}/components`, body: { kind: 'CATEGORIES', columns: 'abc' } },
    { name: 'a component patched to a null visibility', method: 'PATCH', url: () => `/api/stores/padaria-do-bairro/components/${componentId}`, body: { isActive: null } },
    { name: 'a component patched to a null span', method: 'PATCH', url: () => `/api/stores/padaria-do-bairro/components/${componentId}`, body: { span: null } },
    { name: 'a component patched to a null kind', method: 'PATCH', url: () => `/api/stores/padaria-do-bairro/components/${componentId}`, body: { kind: null } },
    { name: 'a component patched with items that are not objects', method: 'PATCH', url: () => `/api/stores/padaria-do-bairro/components/${componentId}`, body: { items: [1, 2] } },
    { name: 'a component patched to a display that is a number', method: 'PATCH', url: () => `/api/stores/padaria-do-bairro/components/${componentId}`, body: { display: 5 } },
    { name: 'a component shown on no device at all', method: 'PATCH', url: () => `/api/stores/padaria-do-bairro/components/${componentId}`, body: { visibleOn: null } },
    { name: 'a component shown on a tablet', method: 'PATCH', url: () => `/api/stores/padaria-do-bairro/components/${componentId}`, body: { visibleOn: 'TABLET' } },
    { name: 'a FAQ question with no answer', method: 'POST', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}/components`, body: { kind: 'FAQ', items: [{ id: 'q', question: 'Prazo?', answer: '' }] } },
    { name: 'a FAQ with two questions under one id', method: 'POST', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}/components`, body: { kind: 'FAQ', items: [{ id: 'q', question: 'A?', answer: 'a' }, { id: 'q', question: 'B?', answer: 'b' }] } },
    { name: 'a band order with no ids', method: 'PUT', url: () => '/api/stores/padaria-do-bairro/sections/reorder', body: {} },
    { name: 'a band order of null', method: 'PUT', url: () => '/api/stores/padaria-do-bairro/sections/reorder', body: { ids: null } },
    { name: 'a heading whose title holds a NUL', method: 'POST', url: () => '/api/stores/padaria-do-bairro/sections', body: { component: { kind: 'HEADING', title: 'a\u0000b' } } },
    { name: 'a band whose name holds a NUL', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}`, body: { name: 'a\u0000' } },
    { name: 'a slide whose title is half a character', method: 'POST', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}/components`, body: { kind: 'BANNER', items: [{ id: 's', imageUrl: 'https://cdn.example/a.png', target: 'NONE', title: 'a\ud800' }] } },
    { name: 'a title of sixty-one hearts, 122 code points in a VARCHAR(120)', method: 'PATCH', url: () => `/api/stores/padaria-do-bairro/components/${componentId}`, body: { title: '❤️'.repeat(61) } },
    { name: 'a band name one variation selector over its sixty', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}`, body: { name: `${'a'.repeat(60)}\ufe0f` } },
    { name: 'a body nested forty levels deep', method: 'POST', url: () => '/api/stores/padaria-do-bairro/sections', body: { component: { kind: 'HEADING', items: Array.from({ length: 40 }).reduce<unknown>((inner) => [inner], []) } } },
    { name: 'a component order that is not ids', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/sections/${sectionId}/components/reorder`, body: { ids: [1, 2] } },
    { name: 'a move with no band', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/components/${componentId}/section`, body: { position: 0 } },
    { name: 'a move to a band that is not an id', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/components/${componentId}/section`, body: { sectionId: 5 } },
    { name: 'a move to a place that is not a whole number', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/components/${componentId}/section`, body: { sectionId: WELL_FORMED_ID, position: 'dois' } },
    { name: 'a move with a span that is not one of the four', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/components/${componentId}/section`, body: { sectionId: WELL_FORMED_ID, span: 'QUARTER' } },
    { name: 'a move with a null span', method: 'PUT', url: () => `/api/stores/padaria-do-bairro/components/${componentId}/section`, body: { sectionId: WELL_FORMED_ID, span: null } },
  ];

  /**
   * An id that is not a uuid cannot name a row, and Postgres answered one in a uuid column with a
   * 500. It is the same 404 as a band or a component this shop does not have.
   */
  it('answers an id that cannot exist as not found, at every route that takes one', async () => {
    const routes: [Method | 'DELETE', string, unknown?][] = [
      ['PUT', '/api/stores/padaria-do-bairro/sections/nao-e-um-id', { name: 'x' }],
      ['DELETE', '/api/stores/padaria-do-bairro/sections/nao-e-um-id'],
      ['POST', '/api/stores/padaria-do-bairro/sections/nao-e-um-id/components', { kind: 'HEADING' }],
      ['PATCH', '/api/stores/padaria-do-bairro/components/nao-e-um-id', { title: 'x' }],
      ['DELETE', '/api/stores/padaria-do-bairro/components/nao-e-um-id'],
      ['PUT', '/api/stores/padaria-do-bairro/components/nao-e-um-id/section', { sectionId }],
    ];

    for (const [method, url, body] of routes) {
      const response = await call(method, url, body);

      expect(response.statusCode, `${method} ${url}`).toBe(404);
      expect(['SECTION_NOT_FOUND', 'COMPONENT_NOT_FOUND']).toContain(response.json<ApiErrorBody>().errorCode);
    }
  });

  it.each(cases)('refuses $name with a 400', async ({ method, url, body }) => {
    const response = await call(method, url(), body);

    expect(response.statusCode, response.payload).toBe(400);
  });
});
