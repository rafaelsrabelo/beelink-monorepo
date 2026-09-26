// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, Section } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { draftOf } from './support/publish.js';
import { resetDatabase } from './support/reset-database.js';

const shopBody = {
  name: 'Padaria do Bairro',
  slug: 'padaria-do-bairro',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

type Method = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Two tabs on one page. Every write to the draft names the revision it read, moves it on by exactly
 * one, and is refused when another write landed since — asserted over every write there is, because
 * one route that forgot would leave every tab's count off by one.
 */
describe('page — the draft revision', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let band: Section;
  let other: Section;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', shopBody);
    band = (await call('POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'HEADING', title: 'Um' } })).json<Section>();
    other = (await call('POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'TEXT', body: 'Dois' } })).json<Section>();
  });

  function call(method: Method | 'GET', url: string, payload?: object, revision?: number | string) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${owner.accessToken}`, ...(revision === undefined ? {} : { 'x-page-revision': String(revision) }) },
      ...(payload ? { payload } : {}),
    });
  }

  const revision = async () => (await draftOf(app, owner.accessToken, 'padaria-do-bairro')).revision;

  /** Every write to a page's draft, each built fresh from the bands the test opened with. */
  const WRITES: [string, () => [Method, string, object?]][] = [
    ['add a band', () => ['POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'HEADING', title: 'Três' } }]],
    ['reorder the bands', () => ['PUT', '/api/stores/padaria-do-bairro/sections/reorder', undefined]],
    ['patch a band', () => ['PUT', `/api/stores/padaria-do-bairro/sections/${band.id}`, { background: '#FFFFFF' }]],
    ['duplicate a band', () => ['POST', `/api/stores/padaria-do-bairro/sections/${band.id}/duplicate`]],
    ['delete a band', () => ['DELETE', `/api/stores/padaria-do-bairro/sections/${other.id}`]],
    ['add a block', () => ['POST', `/api/stores/padaria-do-bairro/sections/${band.id}/components`, { kind: 'TEXT', body: 'Ao lado' }]],
    ['reorder a band’s blocks', () => ['PUT', `/api/stores/padaria-do-bairro/sections/${band.id}/components/reorder`, { ids: [band.components[0]!.id] }]],
    ['patch a block', () => ['PATCH', `/api/stores/padaria-do-bairro/components/${band.components[0]!.id}`, { title: 'Mudou' }]],
    ['move a block', () => ['PUT', `/api/stores/padaria-do-bairro/components/${other.components[0]!.id}/section`, { sectionId: band.id }]],
    ['duplicate a block', () => ['POST', `/api/stores/padaria-do-bairro/components/${band.components[0]!.id}/duplicate`]],
    ['delete a block', () => ['DELETE', `/api/stores/padaria-do-bairro/components/${other.components[0]!.id}`]],
  ];

  it.each(WRITES)('%s: moves the revision on by one, after which that revision is stale', async (_name, build) => {
    const [method, url, body] = build();
    const payload = url.endsWith('/sections/reorder')
      ? { ids: (await call('GET', '/api/stores/padaria-do-bairro/sections')).json<Section[]>().map((row) => row.id) }
      : body;
    const at = await revision();

    const first = await call(method, url, payload, at);
    expect(first.statusCode, first.payload).toBeLessThan(300);
    expect(await revision()).toBe(at + 1);

    // Any write still naming the revision the first one used: another tab that has not seen it.
    const again = await call('PATCH', `/api/stores/padaria-do-bairro/components/${band.components[0]!.id}`, { title: 'Da outra aba' }, at);
    expect(again.statusCode).toBe(409);
    expect(again.json<{ errorCode: string }>().errorCode).toBe('PAGE_DRAFT_STALE');
    expect(await revision()).toBe(at + 1);
  });

  it('checks nothing for a caller that sends no revision, and still counts its write', async () => {
    const at = await revision();

    expect((await call('PATCH', `/api/stores/padaria-do-bairro/components/${band.components[0]!.id}`, { title: 'Livre' })).statusCode).toBe(200);
    expect(await revision()).toBe(at + 1);
  });

  it('leaves the revision where it was when the write is refused for its own reasons', async () => {
    const products = (await call('GET', '/api/stores/padaria-do-bairro/sections')).json<Section[]>().find((row) =>
      row.components.some((component) => component.kind === 'PRODUCTS'),
    )!;
    const at = await revision();

    const refused = await call('DELETE', `/api/stores/padaria-do-bairro/sections/${products.id}`, undefined, at);
    expect(refused.json<{ errorCode: string }>().errorCode).toBe('COMPONENT_REQUIRED');
    expect(await revision()).toBe(at);
  });

  it('refuses a revision that is not a whole number the column holds, never a 500', async () => {
    for (const revision of ['abc', '1e3', '0x10', '-1', '3000000000']) {
      const response = await call('PATCH', `/api/stores/padaria-do-bairro/components/${band.components[0]!.id}`, { title: 'X' }, revision);

      expect(response.statusCode, revision).toBe(400);
      expect(response.json<{ errorCode: string }>().errorCode).toBe('PAGE_REVISION_INVALID');
    }
  });

  it('publishes only the draft the editor saw', async () => {
    const draft = await draftOf(app, owner.accessToken, 'padaria-do-bairro');
    await call('PATCH', `/api/stores/padaria-do-bairro/components/${band.components[0]!.id}`, { title: 'Da outra aba' });

    const response = await call('POST', `/api/stores/padaria-do-bairro/pages/${draft.page.id}/publish`, {}, draft.revision);
    expect(response.statusCode).toBe(409);
  });
});
