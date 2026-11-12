// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AcceptedAffiliate,
  AffiliateInvitation,
  AffiliateProgramOverview,
  AffiliateSignUpResult,
  AffiliateSlugAvailability,
  ApiErrorBody,
  AuthSession,
  CommissionTable,
  Product,
  ProductCategory,
  ShopAffiliate,
  ShopAffiliatePage,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { affiliateDocumentFor, affiliateIdentity } from './support/affiliate-identity.js';
import { PASSWORD, login, newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, countMessages, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug === 'lessari' ? 'Lessari' : slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const MISSING = '0199a1b2-0000-7000-8000-000000000000';
const INVITE_PATH = '/afiliado/convite';

describe("a shop's affiliates: the invite, and accepting it", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;
  let defaultTable: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('POST', '/api/stores', stranger, shopBody('vizinha'));
    const overview = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>();
    defaultTable = overview.tables[0]!.id;
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;
  const detailsOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().details;
  const base = '/api/stores/lessari/affiliates';

  async function invite(body: Partial<{ name: string; email: string; tableId: string; phone: string | null; note: string | null }> = {}): Promise<ShopAffiliate & { token: string }> {
    const email = body.email ?? newEmail('afiliado');
    const response = await call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'João Silva', tableId: defaultTable, ...body, email });
    if (response.statusCode !== 201) throw new Error(`POST affiliates answered ${response.statusCode}: ${response.payload}`);
    const message = await waitForMessage(email.toLowerCase());
    return { ...response.json<ShopAffiliate>(), token: tokenFromLink(message.Text, INVITE_PATH) };
  }

  const acceptance = (over: object = {}) => ({ slug: 'joao', pixKey: 'joao@pix.com', termsVersion: 0, ...over });
  const signUp = (token: string, over: object = {}) => call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name: 'João Silva', password: PASSWORD, ...acceptance(over) });

  async function activeAffiliate(slug = 'joao'): Promise<ShopAffiliate & { token: string }> {
    const invited = await invite();
    const response = await signUp(invited.token, { slug });
    if (response.statusCode !== 201) throw new Error(`sign-up answered ${response.statusCode}: ${response.payload}`);
    return invited;
  }

  describe('the shop invites', () => {
    it('makes an INVITED affiliate and e-mails the invite, from the shop, to bee-link\'s own page', async () => {
      const email = newEmail('joao');
      const response = await call('POST', base, owner, { name: '  João Silva  ', email: email.toUpperCase(), tableId: defaultTable, phone: '(11) 98888-7777', cpf: '529.982.247-25', note: 'Veio da feira', document: await affiliateDocumentFor(prisma, base) });

      expect(response.statusCode).toBe(201);
      expect(response.json<ShopAffiliate>()).toMatchObject({
        name: 'João Silva',
        email,
        phone: '5511988887777',
        cpf: '52998224725',
        slug: null,
        status: 'INVITED',
        table: { id: defaultTable, name: 'Padrão' },
        note: 'Veio da feira',
        acceptedAt: null,
        invite: { sentAt: expect.any(String), expiresAt: expect.any(String) },
      });
      const message = await waitForMessage(email);
      expect(message.Subject).toBe('Lessari convidou você para ser afiliado');
      expect(message.From.Name).toBe('Lessari');
      expect(message.Text).toContain(`http://localhost:3000${INVITE_PATH}?token=`);
      expect((await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.affiliateCount).toBe(1);
    });

    it('refuses an e-mail another live affiliate of the shop has, and takes it again once that one ended', async () => {
      const email = newEmail('dupla');
      await call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'Primeira', email, tableId: defaultTable });

      const again = await call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'Segunda', email: email.toUpperCase(), tableId: defaultTable });
      expect(again.statusCode).toBe(409);
      expect(errorOf(again)).toBe('AFFILIATE_EMAIL_TAKEN');
      expect((await call('POST', '/api/stores/vizinha/affiliates', stranger, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, '/api/stores/vizinha/affiliates'), name: 'Lá', email, tableId: (await call('GET', '/api/stores/vizinha/affiliate-program', stranger)).json<AffiliateProgramOverview>().tables[0]!.id })).statusCode).toBe(201);

      const active = await activeAffiliate();
      await call('POST', `${base}/${active.id}/end`, owner);
      expect((await call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'De volta', email: active.email, tableId: defaultTable })).statusCode).toBe(201);
    });

    it.each([
      ['no name', { name: ' ' }],
      ['an e-mail that is not one', { email: 'nao-e-email' }],
      ['a phone without its area code', { phone: '9888-7777' }],
      ['no phone', { phone: undefined }],
      ['a phone of null', { phone: null }],
      ['no CPF', { cpf: undefined }],
      ['a CPF whose check digits are wrong', { cpf: '529.982.247-26' }],
      ['a CPF of one digit repeated', { cpf: '111.111.111-11' }],
      ['a note past 500 characters', { note: 'a'.repeat(501) }],
      ['a table that is no id', { tableId: 'tabela' }],
    ])('refuses an affiliate with %s', async (_, change) => {
      const response = await call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'João', email: newEmail('x'), tableId: defaultTable, ...change });

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('AFFILIATE_INVALID');
    });

    it('refuses a CPF another live affiliate of the shop has, lets another shop have it, and takes it again once that one ended', async () => {
      const first = await activeAffiliate();
      expect((await call('PATCH', `${base}/${first.id}`, owner, { cpf: '529.982.247-25' })).statusCode).toBe(200);

      const again = await call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'Segunda', email: newEmail('cpf-b'), tableId: defaultTable, cpf: '52998224725' });
      expect(again.statusCode).toBe(409);
      expect(errorOf(again)).toBe('AFFILIATE_CPF_TAKEN');
      const vizinha = (await call('GET', '/api/stores/vizinha/affiliate-program', stranger)).json<AffiliateProgramOverview>().tables[0]!.id;
      expect((await call('POST', '/api/stores/vizinha/affiliates', stranger, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, '/api/stores/vizinha/affiliates'), name: 'Lá', email: newEmail('cpf-c'), tableId: vizinha, cpf: '52998224725' })).statusCode).toBe(201);

      await call('POST', `${base}/${first.id}/end`, owner);
      expect((await call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'De volta', email: newEmail('cpf-d'), tableId: defaultTable, cpf: '52998224725' })).statusCode).toBe(201);
    });

    it('completes and corrects the phone and the CPF on the record, and never clears them', async () => {
      const invited = await invite();
      const other = await invite();

      const changed = await call('PATCH', `${base}/${invited.id}`, owner, { phone: '(31) 98888-1111', cpf: '529.982.247-25' });
      expect(changed.statusCode).toBe(200);
      expect(changed.json<ShopAffiliate>()).toMatchObject({ phone: '5531988881111', cpf: '52998224725' });

      for (const change of [{ phone: null }, { cpf: null }, { cpf: '123' }, { phone: '12' }]) {
        expect(errorOf(await call('PATCH', `${base}/${invited.id}`, owner, change))).toBe('AFFILIATE_INVALID');
      }
      const taken = await call('PATCH', `${base}/${other.id}`, owner, { cpf: '52998224725' });
      expect(taken.statusCode).toBe(409);
      expect(errorOf(taken)).toBe('AFFILIATE_CPF_TAKEN');
    });

    it('answers an affiliate invited before the phone and the CPF were asked with both null, for the shop to complete', async () => {
      const invited = await invite();
      await prisma.affiliate.update({ where: { id: invited.id }, data: { phone: null, cpf: null } });

      expect((await call('GET', `${base}/${invited.id}`, owner)).json<ShopAffiliate>()).toMatchObject({ phone: null, cpf: null });
    });

    it("refuses another shop's table, and is the owner's alone", async () => {
      const foreign = (await call('GET', '/api/stores/vizinha/affiliate-program', stranger)).json<AffiliateProgramOverview>().tables[0]!.id;
      for (const tableId of [foreign, MISSING]) {
        expect(errorOf(await call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'João', email: newEmail('x'), tableId }))).toBe('COMMISSION_TABLE_NOT_FOUND');
      }
      expect((await call('POST', base, stranger, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name: 'João', email: newEmail('x'), tableId: defaultTable })).statusCode).toBe(403);
      expect((await call('GET', base)).statusCode).toBe(401);
    });

    it('lists the newest invited first, by status, a page at a time, and reads one', async () => {
      const first = await invite({ name: 'Primeira' });
      const second = await invite({ name: 'Segunda' });
      await signUp(second.token, { slug: 'segunda' });

      const all = (await call('GET', `${base}?pageSize=1`, owner)).json<ShopAffiliatePage>();
      expect(all).toMatchObject({ total: 2, page: 1, pageSize: 1 });
      expect(all.affiliates.map((affiliate) => affiliate.name)).toEqual(['Segunda']);
      expect((await call('GET', `${base}?status=INVITED`, owner)).json<ShopAffiliatePage>().affiliates.map((a) => a.id)).toEqual([first.id]);
      expect(errorOf(await call('GET', `${base}?status=SOMEWHERE`, owner))).toBe('AFFILIATE_INVALID');

      const read = (await call('GET', `${base}/${second.id}`, owner)).json<ShopAffiliate>();
      expect(read).toMatchObject({ status: 'ACTIVE', slug: 'segunda', pixKey: 'joao@pix.com', termsVersion: 0, invite: null, acceptedAt: expect.any(String) });
      expect(errorOf(await call('GET', `/api/stores/vizinha/affiliates/${second.id}`, stranger))).toBe('AFFILIATE_NOT_FOUND');
      expect(errorOf(await call('GET', `${base}/nao-e-id`, owner))).toBe('AFFILIATE_NOT_FOUND');
    });

    it('changes the table and the note, and refuses a table of another shop', async () => {
      const influencers = (await call('POST', '/api/stores/lessari/affiliate-program/tables', owner, { name: 'Influencers', defaultRateBps: 1500 })).json<CommissionTable>();
      const invited = await invite();

      const changed = await call('PATCH', `${base}/${invited.id}`, owner, { tableId: influencers.id, note: null });
      expect(changed.statusCode).toBe(200);
      expect(changed.json<ShopAffiliate>()).toMatchObject({ table: { id: influencers.id, name: 'Influencers' }, note: null });
      expect(errorOf(await call('PATCH', `${base}/${invited.id}`, owner, { tableId: MISSING }))).toBe('COMMISSION_TABLE_NOT_FOUND');
    });

    it('sends the invite again at most once a minute, and only the newest link works', async () => {
      const invited = await invite();

      const tooSoon = await call('POST', `${base}/${invited.id}/resend`, owner);
      expect(tooSoon.statusCode).toBe(409);
      expect(errorOf(tooSoon)).toBe('AFFILIATE_INVITE_RECENTLY_SENT');

      await prisma.affiliateInvite.update({ where: { affiliateId: invited.id }, data: { sentAt: new Date(Date.now() - 61_000) } });
      await clearInbox();
      expect((await call('POST', `${base}/${invited.id}/resend`, owner)).statusCode).toBe(200);
      const token = tokenFromLink((await waitForMessage(invited.email)).Text, INVITE_PATH);

      expect(errorOf(await call('GET', `/api/affiliate-invites/${invited.token}`))).toBe('AFFILIATE_INVITE_NOT_FOUND');
      expect((await call('GET', `/api/affiliate-invites/${token}`)).statusCode).toBe(200);
    });

    it('cancels an invite nobody accepted, and nothing else', async () => {
      const invited = await invite();
      expect((await call('DELETE', `${base}/${invited.id}`, owner)).statusCode).toBe(204);
      expect(await prisma.affiliate.count()).toBe(0);
      expect(errorOf(await call('GET', `/api/affiliate-invites/${invited.token}`))).toBe('AFFILIATE_INVITE_NOT_FOUND');

      const active = await activeAffiliate();
      const refused = await call('DELETE', `${base}/${active.id}`, owner);
      expect(refused.statusCode).toBe(409);
      expect(detailsOf(refused)).toEqual({ status: 'ACTIVE' });
    });

    it('pauses, resumes and ends — for good — and says where the affiliate stands when it cannot', async () => {
      const active = await activeAffiliate();
      const move = (to: string) => call('POST', `${base}/${active.id}/${to}`, owner);

      expect((await move('pause')).json<ShopAffiliate>().status).toBe('PAUSED');
      expect(detailsOf(await move('pause'))).toEqual({ status: 'PAUSED' });
      expect((await move('resume')).json<ShopAffiliate>().status).toBe('ACTIVE');
      const ended = (await move('end')).json<ShopAffiliate>();
      expect(ended).toMatchObject({ status: 'ENDED', slug: 'joao', endedAt: expect.any(String) });
      for (const to of ['pause', 'resume', 'end']) expect(detailsOf(await move(to))).toEqual({ status: 'ENDED' });

      const invited = await invite();
      expect(errorOf(await call('POST', `${base}/${invited.id}/pause`, owner))).toBe('AFFILIATE_STATUS_INVALID');
    });

    it('refuses to delete a table a live affiliate is on, and hands the ended ones to the default table', async () => {
      const influencers = (await call('POST', '/api/stores/lessari/affiliate-program/tables', owner, { name: 'Influencers', defaultRateBps: 1500 })).json<CommissionTable>();
      const active = await activeAffiliate();
      await call('PATCH', `${base}/${active.id}`, owner, { tableId: influencers.id });

      const refused = await call('DELETE', `/api/stores/lessari/affiliate-program/tables/${influencers.id}`, owner);
      expect(refused.statusCode).toBe(409);
      expect(errorOf(refused)).toBe('COMMISSION_TABLE_IN_USE');

      await call('POST', `${base}/${active.id}/end`, owner);
      expect((await call('DELETE', `/api/stores/lessari/affiliate-program/tables/${influencers.id}`, owner)).statusCode).toBe(204);
      expect((await call('GET', `${base}/${active.id}`, owner)).json<ShopAffiliate>().table.id).toBe(defaultTable);
    });
  });

  describe('the invite, as the person invited reads it', () => {
    it('shows the shop, the condition with the products on the shelf, the terms and a /name to start from', async () => {
      const whey = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey', priceCents: 10_000 })).json<Product>();
      const hidden = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Rascunho', priceCents: 10_000, status: 'DRAFT' })).json<Product>();
      for (const product of [whey, hidden]) await call('PUT', `/api/stores/lessari/affiliate-program/tables/${defaultTable}/rates/${product.id}`, owner, { rateBps: 2000 });
      const bolsas = (await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Bolsas' })).json<{ id: string }>();
      await call('PUT', `/api/stores/lessari/affiliate-program/tables/${defaultTable}/category-rates/${bolsas.id}`, owner, { rateBps: 1500 });
      await call('PUT', '/api/stores/lessari/affiliate-program', owner, { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: 'Pagamento por Pix.' });
      const invited = await invite();

      const response = await call('GET', `/api/affiliate-invites/${invited.token}`);
      expect(response.statusCode).toBe(200);
      expect(response.json<AffiliateInvitation>()).toEqual({
        store: { name: 'Lessari', slug: 'lessari', logoUrl: null },
        affiliate: { name: 'João Silva', email: invited.email },
        table: { name: 'Padrão', defaultRateBps: 1000, categories: [{ categoryId: bolsas.id, name: 'Bolsas', rateBps: 1500 }], products: [{ productId: whey.id, name: 'Whey', rateBps: 2000 }] },
        terms: { text: 'Pagamento por Pix.', version: 1 },
        expiresAt: invited.invite!.expiresAt,
        hasAccount: false,
        suggestedSlug: 'joao-silva',
      });
    });

    it('says the e-mail has an account, and suggests another /name when the first is taken', async () => {
      await activeAffiliate('joao-silva');
      const email = newEmail('existente');
      await signUpAndSignIn(app, email);
      const invited = await invite({ email });

      expect((await call('GET', `/api/affiliate-invites/${invited.token}`)).json<AffiliateInvitation>()).toMatchObject({ hasAccount: true, suggestedSlug: 'joao' });
    });

    it('answers an expired invite with 410, and a link that names none with 404', async () => {
      const invited = await invite();
      await prisma.affiliateInvite.update({ where: { affiliateId: invited.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

      const expired = await call('GET', `/api/affiliate-invites/${invited.token}`);
      expect(expired.statusCode).toBe(410);
      expect(errorOf(expired)).toBe('AFFILIATE_INVITE_EXPIRED');
      expect(errorOf(await call('GET', '/api/affiliate-invites/nao-existe'))).toBe('AFFILIATE_INVITE_NOT_FOUND');
    });

    it('says whether a /name can be theirs, as it would be kept, and why not', async () => {
      await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Suplementos' });
      const renamed = (await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Roupas' })).json<ProductCategory>();
      await call('PUT', `/api/stores/lessari/product-categories/${renamed.id}`, owner, { name: 'Moda' });
      await activeAffiliate('maria');
      const invited = await invite();
      const check = (slug: string) => call('GET', `/api/affiliate-invites/${invited.token}/slug?slug=${encodeURIComponent(slug)}`).then((r) => r.json<AffiliateSlugAvailability>());

      expect(await check('João Silva')).toEqual({ slug: 'joao-silva', available: true, reason: null });
      expect(await check('ab')).toMatchObject({ available: false, reason: 'INVALID' });
      expect(await check('produtos')).toMatchObject({ available: false, reason: 'RESERVED' });
      expect(await check('suplementos')).toMatchObject({ available: false, reason: 'TAKEN' });
      expect(await check('roupas')).toMatchObject({ available: false, reason: 'TAKEN' });
      expect(await check('maria')).toMatchObject({ available: false, reason: 'TAKEN' });
    });
  });

  describe('accepting', () => {
    it('with no account: makes one, verified, and accepts — the session opens and the password signs in', async () => {
      const invited = await invite();

      const response = await signUp(invited.token, { slug: 'João' });
      expect(response.statusCode).toBe(201);
      const result = response.json<AffiliateSignUpResult>();
      expect(result.affiliate).toEqual({ storeName: 'Lessari', storeSlug: 'lessari', slug: 'joao' } satisfies AcceptedAffiliate);
      expect((await call('GET', '/api/users/me', result.session)).statusCode).toBe(200);
      expect((await login(app, invited.email)).accessToken).toEqual(expect.any(String));

      const account = await prisma.user.findFirstOrThrow({ where: { email: invited.email, storeId: null }, include: { legalAcceptances: true } });
      expect(account.emailVerifiedAt).not.toBeNull();
      expect(account.legalAcceptances.map((acceptance) => acceptance.via)).toEqual(['SIGN_UP']);
      expect((await call('GET', `${base}/${invited.id}`, owner)).json<ShopAffiliate>()).toMatchObject({ status: 'ACTIVE', slug: 'joao', pixKey: 'joao@pix.com', termsVersion: 0 });
      expect(errorOf(await call('GET', `/api/affiliate-invites/${invited.token}`))).toBe('AFFILIATE_INVITE_NOT_FOUND');
      expect(await countMessages(invited.email)).toBe(1);
    });

    it('with no account, refuses — and makes no account — when the e-mail has one, the terms changed or the /name is taken', async () => {
      const taken = newEmail('ja-tem');
      await signUpAndSignIn(app, taken);
      expect(errorOf(await signUp((await invite({ email: taken })).token))).toBe('AUTH_EMAIL_TAKEN');

      const invited = await invite();
      await call('PUT', '/api/stores/lessari/affiliate-program', owner, { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: 'Novos termos' });
      expect(errorOf(await signUp(invited.token))).toBe('AFFILIATE_TERMS_CHANGED');

      await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Joao' });
      const refused = await signUp(invited.token, { termsVersion: 1 });
      expect(errorOf(refused)).toBe('AFFILIATE_SLUG_UNAVAILABLE');
      expect(detailsOf(refused)).toEqual({ reason: 'TAKEN' });
      expect(await prisma.user.count({ where: { email: invited.email } })).toBe(0);
    });

    it.each([
      ['no password', { password: undefined }],
      ['a short password', { password: 'curta' }],
      ['a Pix key past 140 characters', { pixKey: 'a'.repeat(141) }],
      ['no terms version', { termsVersion: undefined }],
    ])('refuses a sign-up with %s', async (_, change) => {
      const response = await signUp((await invite()).token, change);

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('AFFILIATE_ACCEPTANCE_INVALID');
    });

    it('signed in: links the account of the e-mail invited, and refuses another, saying whom it is for', async () => {
      const email = newEmail('conta');
      const session = await signUpAndSignIn(app, email);
      const invited = await invite({ email });

      const wrong = await call('POST', `/api/affiliate-invites/${invited.token}/accept`, stranger, acceptance());
      expect(wrong.statusCode).toBe(403);
      expect(errorOf(wrong)).toBe('AFFILIATE_INVITE_EMAIL_MISMATCH');
      expect(detailsOf(wrong)).toEqual({ email });
      expect((await call('POST', `/api/affiliate-invites/${invited.token}/accept`, undefined, acceptance())).statusCode).toBe(401);

      const accepted = await call('POST', `/api/affiliate-invites/${invited.token}/accept`, session, acceptance({ pixKey: '  ' }));
      expect(accepted.statusCode).toBe(200);
      expect(accepted.json<AcceptedAffiliate>()).toEqual({ storeName: 'Lessari', storeSlug: 'lessari', slug: 'joao' });
      const affiliate = await prisma.affiliate.findUniqueOrThrow({ where: { id: invited.id } });
      expect(affiliate).toMatchObject({ status: 'ACTIVE', pixKey: null, userId: (await prisma.user.findFirstOrThrow({ where: { email, storeId: null } })).id });
    });

    it('gives one /name to one of two invites claiming it at once', async () => {
      const [first, second] = [await invite(), await invite()];

      const answers = await Promise.all([signUp(first.token, { slug: 'disputado' }), signUp(second.token, { slug: 'disputado' })]);

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([201, 409]);
      expect(await prisma.affiliate.count({ where: { slug: 'disputado' } })).toBe(1);
    });
  });

  describe("the shop's addresses", () => {
    it("refuses a category on an affiliate's /name, created or renamed", async () => {
      await activeAffiliate('promo');

      const created = await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Promo' });
      expect(created.statusCode).toBe(409);
      expect(errorOf(created)).toBe('PRODUCT_CATEGORY_SLUG_AFFILIATE');

      const category = (await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Ofertas' })).json<ProductCategory>();
      expect(errorOf(await call('PUT', `/api/stores/lessari/product-categories/${category.id}`, owner, { name: 'Promo' }))).toBe('PRODUCT_CATEGORY_SLUG_AFFILIATE');
      expect((await call('PUT', `/api/stores/lessari/product-categories/${category.id}`, owner, { description: 'Só a descrição' })).statusCode).toBe(200);
      expect((await call('POST', '/api/stores/vizinha/product-categories', stranger, { name: 'Promo' })).statusCode).toBe(201);
    });
  });
});
