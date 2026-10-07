// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PageDraft, PublicStore, Section, StoreComponent } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';
import { draftOf, publishPage } from './support/publish.js';

const shopBody = {
  name: 'Padaria do Bairro',
  slug: 'padaria-do-bairro',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

const SHOP = '/api/stores/padaria-do-bairro';

/**
 * A categories block's card style (BEELINK-308), through the real pipe and database: written, held
 * in the draft until Publicar, served to a visitor, carried by a copy and brought back by a restore.
 */
describe('page — a categories block drawn as artwork alone', () => {
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

    const response = await call('POST', `${SHOP}/sections`, { component: { kind: 'CATEGORIES', display: 'RAIL' } });
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

  async function served(): Promise<StoreComponent['cardStyle'] | undefined> {
    const visitor = (await app.inject({ method: 'GET', url: `${SHOP}/public` })).json<PublicStore>();
    return visitor.sections.flatMap((section) => section.components).find((component) => component.id === band.components[0]!.id)?.cardStyle;
  }

  it('opens as the photo with its name: null, to the owner and to a visitor', async () => {
    expect(band.components[0]?.cardStyle).toBeNull();

    await publishPage(app, owner.accessToken, 'padaria-do-bairro');
    expect(await served()).toBeNull();
  });

  it('holds the choice in the draft, and serves it only once published', async () => {
    await publishPage(app, owner.accessToken, 'padaria-do-bairro');

    const patched = await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { cardStyle: 'ART_ONLY' });
    expect(patched.statusCode, patched.payload).toBe(200);
    expect(patched.json<StoreComponent>().cardStyle).toBe('ART_ONLY');
    expect(await served()).toBeNull();

    await publishPage(app, owner.accessToken, 'padaria-do-bairro');
    expect(await served()).toBe('ART_ONLY');

    // Back to the first style, said by name or by null: both are accepted and kept as sent.
    const named = await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { cardStyle: 'PHOTO_WITH_NAME' });
    expect(named.json<StoreComponent>().cardStyle).toBe('PHOTO_WITH_NAME');
    const cleared = await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { cardStyle: null });
    expect(cleared.statusCode, cleared.payload).toBe(200);
    expect(cleared.json<StoreComponent>().cardStyle).toBeNull();
  });

  it('leaves the choice alone on a patch that does not name it, and keeps it under another format', async () => {
    await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { cardStyle: 'ART_ONLY' });

    const patched = await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { display: 'CHIPS', title: 'Departamentos' });

    expect(patched.statusCode, patched.payload).toBe(200);
    expect(patched.json<StoreComponent>()).toMatchObject({ display: 'CHIPS', cardStyle: 'ART_ONLY' });
  });

  it('keeps the original\'s card style on its copy', async () => {
    await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { cardStyle: 'ART_ONLY' });

    const copy = await call('POST', `${SHOP}/components/${band.components[0]!.id}/duplicate`);

    expect(copy.statusCode, copy.payload).toBe(201);
    expect(copy.json<StoreComponent>().cardStyle).toBe('ART_ONLY');
  });

  it('brings the style back with the version that had it', async () => {
    await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { cardStyle: 'ART_ONLY' });
    await publishPage(app, owner.accessToken, 'padaria-do-bairro');
    const withArt = await draftOf(app, owner.accessToken, 'padaria-do-bairro');

    await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { cardStyle: null });
    await publishPage(app, owner.accessToken, 'padaria-do-bairro');
    expect(await served()).toBeNull();

    const restored = await call('POST', `${SHOP}/pages/${withArt.page.id}/versions/${withArt.published!.id}/restore`);
    expect(restored.statusCode, restored.payload).toBe(200);
    const drafted = restored.json<PageDraft>().sections.flatMap((section) => section.components).find((component) => component.id === band.components[0]!.id);
    expect(drafted?.cardStyle).toBe('ART_ONLY');
  });

  it('refuses a style that is not one of the two, and one sent to another kind', async () => {
    const unknown = await call('PATCH', `${SHOP}/components/${band.components[0]!.id}`, { cardStyle: 'ROUND' });
    expect(unknown.statusCode, unknown.payload).toBe(400);
    expect(unknown.json<ApiErrorBody>().errorCode).toBe('COMPONENT_CARD_STYLE_INVALID');

    const heading = await call('POST', `${SHOP}/sections`, { component: { kind: 'HEADING', title: 'Oi', cardStyle: 'ART_ONLY' } });
    expect(heading.statusCode, heading.payload).toBe(400);
    expect(heading.json<ApiErrorBody>().errorCode).toBe('COMPONENT_CARD_STYLE_INVALID');

    const added = await call('POST', `${SHOP}/sections/${band.id}/components`, { kind: 'TEXT', body: 'Texto' });
    const patched = await call('PATCH', `${SHOP}/components/${added.json<StoreComponent>().id}`, { cardStyle: 'ART_ONLY' });
    expect(patched.statusCode, patched.payload).toBe(400);
    expect(patched.json<ApiErrorBody>().errorCode).toBe('COMPONENT_CARD_STYLE_INVALID');

    // Null on another kind is "as it always drew", and is taken.
    const cleared = await call('PATCH', `${SHOP}/components/${added.json<StoreComponent>().id}`, { cardStyle: null });
    expect(cleared.statusCode, cleared.payload).toBe(200);
  });
});
