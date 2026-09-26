// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Types
import type { AuthSession, PageDraft, PublicLanding, PublicStore, Section, StorePage } from '@harness-monorepo/contracts';

// App
import { documentOf, readPageDocument } from '../src/modules/page/page-document.js';
import { sectionInclude } from '../src/modules/page/page.mapper.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { draftOf, publishPage } from './support/publish.js';
import { resetDatabase } from './support/reset-database.js';

const shopBody = {
  name: 'Padaria do Bairro',
  slug: 'padaria-do-bairro',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

/** The draft is the owner's; a visitor is served what was last published. */
describe('pages — the draft and its versions', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;

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
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  const served = async () => (await app.inject({ method: 'GET', url: '/api/stores/padaria-do-bairro/public' })).json<PublicStore>().sections;

  it('serves a new shop its opening page at once, and has nothing to publish', async () => {
    expect((await served()).length).toBeGreaterThan(0);
    expect((await draftOf(app, owner.accessToken, 'padaria-do-bairro')).hasUnpublishedChanges).toBe(false);
  });

  // Acceptance: adding or editing a block does not change the shop until Publicar.
  it('leaves the shop as it was while the draft changes, and serves the draft once published', async () => {
    const before = await served();

    const added = await call('POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'HEADING', title: 'Novidade' } });
    const heading = added.json<Section>().components[0]!;
    const existing = before.flatMap((section) => section.components)[0]!;
    await call('PATCH', `/api/stores/padaria-do-bairro/components/${existing.id}`, { title: 'Mudou' });

    expect(await served()).toEqual(before);
    expect((await draftOf(app, owner.accessToken, 'padaria-do-bairro')).hasUnpublishedChanges).toBe(true);

    await publishPage(app, owner.accessToken, 'padaria-do-bairro');
    const after = (await served()).flatMap((section) => section.components);
    expect(after.find((component) => component.id === heading.id)).toMatchObject({ title: 'Novidade' });
    expect(after.find((component) => component.id === existing.id)).toMatchObject({ title: 'Mudou' });
    expect((await draftOf(app, owner.accessToken, 'padaria-do-bairro')).hasUnpublishedChanges).toBe(false);
  });

  it('numbers the versions and says who published the one served', async () => {
    await publishPage(app, owner.accessToken, 'padaria-do-bairro');

    const draft: PageDraft = await draftOf(app, owner.accessToken, 'padaria-do-bairro');
    expect(draft.published).toMatchObject({ number: 2, live: true, author: { name: expect.any(String) } });
  });

  it('serves a landing as published, its later draft to nobody, and nothing once taken down', async () => {
    const page = (
      await call('POST', '/api/stores/padaria-do-bairro/pages', { title: 'Ofertas', template: 'em-branco' })
    ).json<StorePage>();
    const url = '/api/stores/padaria-do-bairro/landings/ofertas';

    await call('PATCH', `/api/stores/padaria-do-bairro/pages/${page.id}`, { status: 'PUBLISHED' });
    const first = (await app.inject({ method: 'GET', url })).json<PublicLanding>();
    expect(first.sections).toHaveLength(1);

    await call('POST', `/api/stores/padaria-do-bairro/sections?pageId=${page.id}`, { component: { kind: 'TEXT', body: 'Só amanhã' } });
    expect((await app.inject({ method: 'GET', url })).json<PublicLanding>().sections).toEqual(first.sections);

    await publishPage(app, owner.accessToken, 'padaria-do-bairro', page.id);
    expect((await app.inject({ method: 'GET', url })).json<PublicLanding>().sections).toHaveLength(2);

    await call('PATCH', `/api/stores/padaria-do-bairro/pages/${page.id}`, { status: 'DRAFT' });
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404);
  });

  it('previews the home’s draft to its owner, not what is served', async () => {
    await call('POST', '/api/stores/padaria-do-bairro/sections', { component: { kind: 'HEADING', title: 'Só no rascunho' } });

    const preview = await call('GET', '/api/stores/padaria-do-bairro/pages/home/preview');
    expect(preview.statusCode).toBe(200);
    expect(JSON.stringify(preview.json())).toContain('Só no rascunho');
    expect(JSON.stringify(await served())).not.toContain('Só no rascunho');
  });

  // The migration froze every page as it was served; the SQL and `documentOf` must agree on what that is.
  it('freezes a page in the migration exactly as documentOf would', async () => {
    const prisma = app.get(PrismaService);
    const hidden = (await call('POST', '/api/stores/padaria-do-bairro/sections', { isActive: false, component: { kind: 'TEXT', body: 'Oculto' } })).json<Section>();
    await call('PATCH', `/api/stores/padaria-do-bairro/components/${hidden.components[0]!.id}`, { isActive: false, align: 'RIGHT' });
    await prisma.storePageVersion.deleteMany({});

    const migration = readFileSync(
      fileURLToPath(new URL('../prisma/migrations/20260926050000_page_versions/migration.sql', import.meta.url)),
      'utf8',
    );
    const backfill = migration.slice(migration.indexOf('-- backfill:begin'), migration.indexOf('-- backfill:end'));
    await prisma.$executeRawUnsafe(backfill);

    const version = await prisma.storePageVersion.findFirstOrThrow({ where: { page: { kind: 'HOME' } } });
    const rows = await prisma.storeSection.findMany({
      where: { pageId: version.pageId },
      include: sectionInclude,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    expect(readPageDocument(version.document)).toEqual(documentOf(rows));
  });
});
