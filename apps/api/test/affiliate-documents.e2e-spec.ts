// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AffiliateDocumentUpload, AffiliateDocumentView, AffiliateProgramOverview, ApiErrorBody, AuthSession, ShopAffiliate, ShopAffiliatePage } from '@harness-monorepo/contracts';

// App
import { AffiliateDocumentSweeper } from '../src/modules/affiliates/affiliate-document-sweeper.js';
import type { PrivateUpload } from '../src/modules/uploads/cloudinary-private-assets.js';
import { CloudinaryPrivateAssets } from '../src/modules/uploads/cloudinary-private-assets.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { affiliateIdentity } from './support/affiliate-identity.js';
import { PASSWORD, login, newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

/** Cloudinary's private side, standing in: it keeps the ids it was given and the ones deleted. */
class FakePrivateAssets {
  stored: string[] = [];
  destroyed: string[] = [];
  private next = 0;

  config() {
    return { cloudName: 'fake', apiKey: 'key', apiSecret: 'secret', folder: 'bee-link' };
  }

  async upload(file: { bytes: Buffer; type: string }, subfolder: string, accept: { types: readonly string[]; maxBytes: number }): Promise<PrivateUpload> {
    if (!accept.types.includes(file.type)) return { status: 'unsupported' };
    if (file.bytes.byteLength > accept.maxBytes) return { status: 'too-large' };
    this.next += 1;
    const publicId = `bee-link/${subfolder}/photo-${this.next}`;
    this.stored.push(publicId);
    return { status: 'uploaded', publicId, format: 'jpg' };
  }

  async downloadUrl(publicId: string, format: string, expiresAt: Date): Promise<string> {
    return `https://api.cloudinary.test/download/${publicId}.${format}?expires_at=${Math.floor(expiresAt.getTime() / 1000)}`;
  }

  async destroy(publicId: string): Promise<boolean> {
    this.destroyed.push(publicId);
    return true;
  }
}

/** What a browser's FormData sends, built by hand: `app.inject` takes the bytes as they are. */
function photo(type = 'image/jpeg', bytes = Buffer.from('a photo')) {
  const boundary = '----beelink-document-e2e';
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="frente.jpg"\r\nContent-Type: ${type}\r\n\r\n`);
  return { payload: Buffer.concat([head, bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

describe("an affiliate's identity document (the user's review, 12/11/2026)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let assets: FakePrivateAssets;
  let owner: AuthSession;
  let stranger: AuthSession;
  let defaultTable: string;

  beforeAll(async () => {
    assets = new FakePrivateAssets();
    app = await createTestApp((builder) => builder.overrideProvider(CloudinaryPrivateAssets).useValue(assets));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    assets.stored = [];
    assets.destroyed = [];
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('POST', '/api/stores', stranger, shopBody('vizinha'));
    defaultTable = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;
  const base = '/api/stores/lessari/affiliates';

  function send(session = owner, slug = 'lessari', file = photo()) {
    return app.inject({ method: 'POST', url: `/api/stores/${slug}/affiliate-documents`, headers: { ...file.headers, authorization: `Bearer ${session.accessToken}` }, payload: file.payload });
  }

  async function uploaded(session = owner, slug = 'lessari'): Promise<string> {
    const response = await send(session, slug);
    if (response.statusCode !== 201) throw new Error(`POST affiliate-documents answered ${response.statusCode}: ${response.payload}`);
    return response.json<AffiliateDocumentUpload>().id;
  }

  async function invite(document: object, email = newEmail('afiliado')) {
    return call('POST', base, owner, { ...affiliateIdentity(), name: 'João Silva', email, tableId: defaultTable, document });
  }

  it('keeps each photo privately, in a folder of the shop, and answers only an id', async () => {
    const response = await send();

    expect(response.statusCode).toBe(201);
    expect(Object.keys(response.json<AffiliateDocumentUpload>())).toEqual(['id']);
    const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });
    expect(assets.stored).toEqual([`bee-link/affiliate-documents/${storeId}/photo-1`]);
  });

  it('takes a PDF too, and refuses anything else, a stranger and nobody', async () => {
    expect((await send(owner, 'lessari', photo('application/pdf'))).statusCode).toBe(201);
    expect(errorOf(await send(owner, 'lessari', photo('application/zip')))).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect((await send(stranger, 'lessari')).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/stores/lessari/affiliate-documents', ...photo() })).statusCode).toBe(401);
    expect(assets.stored).toHaveLength(1);
  });

  it('may wait for later; when sent, it has a type, a front, and a back unless a passport', async () => {
    const later = await call('POST', base, owner, { ...affiliateIdentity(), name: 'João', email: newEmail('a'), tableId: defaultTable });
    expect(later.statusCode).toBe(201);
    expect(later.json<ShopAffiliate>().document).toBeNull();
    expect(errorOf(await invite({ type: 'RG', frontUploadId: await uploaded(), backUploadId: null }))).toBe('AFFILIATE_DOCUMENT_INVALID');
    expect(errorOf(await invite({ type: 'CARTEIRA', frontUploadId: await uploaded(), backUploadId: await uploaded() }))).toBe('AFFILIATE_DOCUMENT_INVALID');

    const passport = await invite({ type: 'PASSPORT', frontUploadId: await uploaded(), backUploadId: null });
    expect(passport.statusCode).toBe(201);
    expect(passport.json<ShopAffiliate>().document).toEqual({ type: 'PASSPORT', hasBack: false, uploadedAt: expect.any(String) });
  });

  it("names only this shop's photos, each once", async () => {
    const theirs = await uploaded(stranger, 'vizinha');
    expect(errorOf(await invite({ type: 'CNH', frontUploadId: theirs, backUploadId: await uploaded() }))).toBe('AFFILIATE_DOCUMENT_UPLOAD_NOT_FOUND');

    const front = await uploaded();
    const back = await uploaded();
    expect((await invite({ type: 'CNH', frontUploadId: front, backUploadId: back })).statusCode).toBe(201);
    expect(errorOf(await invite({ type: 'CNH', frontUploadId: front, backUploadId: back }))).toBe('AFFILIATE_DOCUMENT_UPLOAD_NOT_FOUND');
  });

  it("is read by the shop's owner alone, at links that expire — and is in no other answer", async () => {
    const joao = (await invite({ type: 'RG', frontUploadId: await uploaded(), backUploadId: await uploaded() })).json<ShopAffiliate>();

    const read = await call('GET', `${base}/${joao.id}/document`, owner);
    expect(read.statusCode).toBe(200);
    const view = read.json<AffiliateDocumentView>();
    expect(view).toEqual({ type: 'RG', frontUrl: expect.stringContaining(`${assets.stored[0]}.jpg`), frontFormat: 'jpg', backUrl: expect.stringContaining(`${assets.stored[1]}.jpg`), backFormat: 'jpg', expiresAt: expect.any(String), uploadedAt: expect.any(String) });
    expect(new Date(view.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(10 * 60 * 1000);
    expect((await call('GET', `${base}/${joao.id}/document`, stranger)).statusCode).toBe(403);
    expect((await call('GET', `/api/stores/vizinha/affiliates/${joao.id}/document`, stranger)).statusCode).toBe(404);

    // The record, the list and the invite the person reads say nothing of where the photos are.
    const token = tokenFromLink((await waitForMessage(joao.email)).Text, '/afiliado/convite');
    for (const answer of [await call('GET', `${base}/${joao.id}`, owner), await call('GET', base, owner), await call('GET', `/api/affiliate-invites/${token}`)]) {
      expect(answer.payload).not.toContain('photo-');
      expect(answer.payload).not.toContain('cloudinary');
    }
    expect((await call('GET', base, owner)).json<ShopAffiliatePage>().affiliates[0]).not.toHaveProperty('document');

    // Nor what the affiliate reads of themselves once in.
    await call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name: 'João Silva', password: PASSWORD, slug: 'joao', pixKey: null, termsVersion: 0 });
    const area = await call('GET', '/api/affiliate/stores/lessari', await login(app, joao.email));
    expect(area.statusCode).toBe(200);
    expect(area.payload).not.toContain('photo-');
  });

  it('is sent again from the record, and the photos before are deleted', async () => {
    const joao = (await invite({ type: 'RG', frontUploadId: await uploaded(), backUploadId: await uploaded() })).json<ShopAffiliate>();

    const replaced = await call('PUT', `${base}/${joao.id}/document`, owner, { type: 'CIN', frontUploadId: await uploaded(), backUploadId: await uploaded() });
    expect(replaced.json<ShopAffiliate>().document).toMatchObject({ type: 'CIN', hasBack: true });
    expect(assets.destroyed.sort()).toEqual([assets.stored[0], assets.stored[1]].sort());
    expect(errorOf(await call('GET', `${base}/${MISSING_AFFILIATE}/document`, owner))).toBe('AFFILIATE_NOT_FOUND');
  });

  it('says there is none, for one invited before it was asked', async () => {
    const joao = (await invite({ type: 'RG', frontUploadId: await uploaded(), backUploadId: await uploaded() })).json<ShopAffiliate>();
    await prisma.affiliateDocument.deleteMany({ where: { affiliateId: joao.id } });

    expect((await call('GET', `${base}/${joao.id}`, owner)).json<ShopAffiliate>().document).toBeNull();
    expect(errorOf(await call('GET', `${base}/${joao.id}/document`, owner))).toBe('AFFILIATE_DOCUMENT_NOT_FOUND');
  });

  it('deletes the photos when the invite is cancelled', async () => {
    const joao = (await invite({ type: 'RG', frontUploadId: await uploaded(), backUploadId: await uploaded() })).json<ShopAffiliate>();

    expect((await call('DELETE', `${base}/${joao.id}`, owner)).statusCode).toBe(204);
    expect(assets.destroyed.sort()).toEqual([...assets.stored].sort());
    expect(await prisma.affiliateDocument.count()).toBe(0);
  });

  it('deletes the photos nobody named within a day, and keeps the fresh ones', async () => {
    const stale = await uploaded();
    const fresh = await uploaded();
    await prisma.affiliateDocumentUpload.update({ where: { id: stale }, data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } });

    expect(await app.get(AffiliateDocumentSweeper).sweep(new Date())).toBe(1);
    expect(assets.destroyed).toEqual([assets.stored[0]]);
    expect((await prisma.affiliateDocumentUpload.findMany()).map((row) => row.id)).toEqual([fresh]);
    expect(errorOf(await invite({ type: 'PASSPORT', frontUploadId: stale, backUploadId: null }))).toBe('AFFILIATE_DOCUMENT_UPLOAD_NOT_FOUND');
  });
});

const MISSING_AFFILIATE = '0199a1b2-0000-7000-8000-000000000000';
