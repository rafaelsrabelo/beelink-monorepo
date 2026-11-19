// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AffiliateInvitation,
  AffiliatePageContent,
  AffiliatePageOverview,
  AffiliatePagePayload,
  AffiliateProgramOverview,
  ApiErrorBody,
  AuthSession,
  PublicAffiliatePage,
  PublicStore,
  ShopAffiliate,
  ShopAffiliateApplication,
  ShopAffiliateApplicationPage,
} from '@harness-monorepo/contracts';

// App
import { AffiliateApplicationSweeper } from '../src/modules/affiliates/affiliate-application-sweeper.js';
import { EMPTY_AFFILIATE_PAGE_CONTENT } from '../src/modules/affiliates/affiliate-page.constants.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { affiliateDocumentFor, affiliateIdentity } from './support/affiliate-identity.js';
import { PASSWORD, newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once. Every test applies from the one
// address an inject comes from, so the suite runs under a limit none of them reaches.
vi.hoisted(() => {
  process.env.AFFILIATE_APPLICATION_RATE_LIMIT_MAX = '200';
  process.env.AFFILIATE_APPLICATION_RATE_LIMIT_WINDOW = '1 hour';
});

function shopBody(slug: string) {
  return { name: 'Lessari', slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const PROGRAM_ON = { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: 'Pagamento por Pix.' };
const OPEN_PAGE: AffiliatePagePayload = {
  open: true,
  placements: { homeBanner: true, footerLink: true, topStrip: false },
  tableId: null,
  approval: 'MANUAL',
  content: { ...EMPTY_AFFILIATE_PAGE_CONTENT },
};
/** A CPF no affiliate of the suite has: the counter in `affiliateIdentity` starts far from it. */
const ANA_CPF = '111.444.777-35';

describe('the "Seja afiliado" page and its applications (plan 2026-11-14)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;

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
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;
  const savePage = (page: AffiliatePagePayload, session = owner) => call('PUT', '/api/stores/lessari/affiliate-page', session, page);
  const pageOf = async () => (await call('GET', '/api/stores/lessari/affiliate-page', owner)).json<AffiliatePageOverview>();
  const apply = (body: object) => call('POST', '/api/stores/lessari/affiliate-join/applications', undefined, body);
  const listOf = async (query = '') => (await call('GET', `/api/stores/lessari/affiliate-applications${query}`, owner)).json<ShopAffiliateApplicationPage>();
  const ana = (extra: object = {}) => ({ name: '  Ana Souza ', email: ' Ana@Exemplo.com ', phone: '(11) 95555-4444', extraAnswer: '@ana.treinos', accepted: true, ...extra });

  async function programOn(): Promise<string> {
    const overview = (await call('PUT', '/api/stores/lessari/affiliate-program', owner, PROGRAM_ON)).json<AffiliateProgramOverview>();
    return overview.tables[0]!.id;
  }

  async function openPage(page: Partial<AffiliatePagePayload> = {}): Promise<void> {
    await programOn();
    const saved = await savePage({ ...OPEN_PAGE, ...page });
    if (saved.statusCode !== 200) throw new Error(`PUT affiliate-page answered ${saved.statusCode}: ${saved.payload}`);
  }

  async function pending(): Promise<ShopAffiliateApplication> {
    const sent = await apply(ana());
    if (sent.statusCode !== 202) throw new Error(`apply answered ${sent.statusCode}: ${sent.payload}`);
    return (await listOf()).applications[0]!;
  }

  describe('the page, as its owner keeps it', () => {
    it('reads closed before it is saved, every text the product\'s own, announcing the default table', async () => {
      const overview = await pageOf();
      expect(overview).toEqual({
        page: { open: false, placements: { homeBanner: true, footerLink: true, topStrip: false }, tableId: null, approval: 'MANUAL', content: EMPTY_AFFILIATE_PAGE_CONTENT, updatedAt: null },
        blockedBy: 'CLOSED',
        rateBps: 1000,
        maxRateBps: 1000,
        pendingApplications: 0,
      });
    });

    it('keeps what the shop wrote, a blank text as the product\'s own, and says what still hides it', async () => {
      const content: AffiliatePageContent = {
        ...EMPTY_AFFILIATE_PAGE_CONTENT,
        title: '  Venda a {loja} e ganhe {comissao}  ',
        subtitle: '   ',
        highlights: [' Sem custo ', 'Pix'],
        steps: [{ title: 'Inscreva-se', text: 'Leva um minuto.' }],
        benefits: [],
        questions: [{ question: 'Quando recebo?', answer: 'Três vezes por mês.' }],
        askExtraQuestion: false,
        bannerTitle: 'Seja parceira da {loja}',
      };
      const saved = await savePage({ ...OPEN_PAGE, content });
      expect(saved.statusCode).toBe(200);
      const overview = saved.json<AffiliatePageOverview>();
      expect(overview.page.content).toEqual({ ...content, title: 'Venda a {loja} e ganhe {comissao}', subtitle: null, highlights: ['Sem custo', 'Pix'] });
      expect(overview.page.open).toBe(true);
      // Open, and still hidden: the programme is off.
      expect(overview.blockedBy).toBe('PROGRAM_OFF');
      await programOn();
      expect((await pageOf()).blockedBy).toBeNull();
    });

    it('announces a table the shop shares, and refuses another affiliate\'s own commission or none of the shop\'s', async () => {
      await programOn();
      const special = (await call('POST', '/api/stores/lessari/affiliate-program/tables', owner, { name: 'Revendedoras', defaultRateBps: 1500 })).json<{ id: string }>();
      expect((await savePage({ ...OPEN_PAGE, tableId: special.id })).json<AffiliatePageOverview>()).toMatchObject({ page: { tableId: special.id }, rateBps: 1500 });

      const own = await call('POST', '/api/stores/lessari/affiliates', owner, { ...affiliateIdentity(), name: 'Bia', email: newEmail('bia'), commission: { defaultRateBps: 2000, categoryRates: [], productRates: [] } });
      const ownTable = own.json<ShopAffiliate>().table.id;
      const personal = await savePage({ ...OPEN_PAGE, tableId: ownTable });
      expect(personal.statusCode).toBe(409);
      expect(errorOf(personal)).toBe('COMMISSION_TABLE_PERSONAL');

      const missing = await savePage({ ...OPEN_PAGE, tableId: '0199a1b2-0000-7000-8000-000000000000' });
      expect(missing.statusCode).toBe(404);
      expect(errorOf(missing)).toBe('COMMISSION_TABLE_NOT_FOUND');
    });

    // Mutante's: 10% on the table, up to 30% on products of its own choosing — "{comissao}" reads "até 30%".
    it('announces the highest rate a product on sale earns on the table — its own, else its category\'s — and no rate no sale can earn', async () => {
      const tableId = await programOn();
      const tables = `/api/stores/lessari/affiliate-program/tables/${tableId}`;
      const created = async (path: string, body: object) => (await call('POST', `/api/stores/lessari/${path}`, owner, body)).json<{ id: string }>();
      const [proteins, gifts] = [await created('product-categories', { name: 'Proteínas' }), await created('product-categories', { name: 'Brindes' })];
      const whey = await created('products', { name: 'Whey', priceCents: 10_000, categoryId: proteins.id });
      const draft = await created('products', { name: 'Pré-treino', priceCents: 10_000, status: 'DRAFT' });
      const mug = await created('products', { name: 'Caneca', priceCents: 10_000, categoryId: gifts.id });

      await openPage();
      expect(await pageOf()).toMatchObject({ rateBps: 1000, maxRateBps: 1000 });

      // A draft sells nothing, and a category whose every product on sale has a rate of its own pays none.
      await call('PUT', `${tables}/rates/${draft.id}`, owner, { rateBps: 5000 });
      await call('PUT', `${tables}/category-rates/${gifts.id}`, owner, { rateBps: 4000 });
      await call('PUT', `${tables}/rates/${mug.id}`, owner, { rateBps: 500 });
      expect(await pageOf()).toMatchObject({ rateBps: 1000, maxRateBps: 1000 });

      await call('PUT', `${tables}/category-rates/${proteins.id}`, owner, { rateBps: 2000 });
      expect(await pageOf()).toMatchObject({ rateBps: 1000, maxRateBps: 2000 });

      await call('PUT', `${tables}/rates/${whey.id}`, owner, { rateBps: 3000 });
      expect(await pageOf()).toMatchObject({ rateBps: 1000, maxRateBps: 3000 });
      expect((await call('GET', '/api/stores/lessari/affiliate-join')).json<PublicAffiliatePage>()).toMatchObject({ rateBps: 1000, maxRateBps: 3000 });
      expect((await call('GET', '/api/stores/lessari/public')).json<PublicStore>().affiliatePage).toMatchObject({ rateBps: 1000, maxRateBps: 3000 });
    });

    it('hands the page back to the default table when the one it announced is deleted', async () => {
      await programOn();
      const special = (await call('POST', '/api/stores/lessari/affiliate-program/tables', owner, { name: 'Revendedoras', defaultRateBps: 1500 })).json<{ id: string }>();
      await savePage({ ...OPEN_PAGE, tableId: special.id });
      await app.inject({ method: 'DELETE', url: `/api/stores/lessari/affiliate-program/tables/${special.id}`, headers: { authorization: `Bearer ${owner.accessToken}` } });

      expect(await pageOf()).toMatchObject({ page: { tableId: null }, rateBps: 1000, maxRateBps: 1000 });
    });

    it.each([
      ['a title past 120 characters', { title: 'x'.repeat(121) }],
      ['no step at all', { steps: [] }],
      ['five steps', { steps: Array.from({ length: 5 }, () => ({ title: 'Passo', text: 'Texto' })) }],
      ['a benefit with no text', { benefits: [{ title: 'Pix', text: ' ' }] }],
      ['four highlights', { highlights: ['a', 'b', 'c', 'd'] }],
      ['an image that is no address', { imageUrl: 'nao-e-endereco' }],
      ['a text left out', { badge: undefined }],
    ])('refuses %s', async (_, change) => {
      const response = await savePage({ ...OPEN_PAGE, content: { ...EMPTY_AFFILIATE_PAGE_CONTENT, ...change } as AffiliatePageContent });
      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('AFFILIATE_PAGE_INVALID');
    });

    it('is the owner\'s alone', async () => {
      expect((await call('GET', '/api/stores/lessari/affiliate-page', stranger)).statusCode).toBe(403);
      expect((await savePage(OPEN_PAGE, stranger)).statusCode).toBe(403);
      expect((await call('GET', '/api/stores/lessari/affiliate-applications', stranger)).statusCode).toBe(403);
    });
  });

  describe('the page, as a visitor reads it', () => {
    it('answers what the shop wrote, the rate and the terms, and tells every page of the shop window where it is', async () => {
      await openPage({ content: { ...EMPTY_AFFILIATE_PAGE_CONTENT, title: 'Venda a {loja}', bannerTitle: 'Seja parceira' } });

      const page = await call('GET', '/api/stores/lessari/affiliate-join');
      expect(page.statusCode).toBe(200);
      expect(page.json<PublicAffiliatePage>()).toEqual({
        content: { ...EMPTY_AFFILIATE_PAGE_CONTENT, title: 'Venda a {loja}', bannerTitle: 'Seja parceira' },
        rateBps: 1000,
        maxRateBps: 1000,
        terms: { text: 'Pagamento por Pix.', version: 1 },
      });
      expect((await call('GET', '/api/stores/lessari/public')).json<PublicStore>().affiliatePage).toEqual({
        placements: { homeBanner: true, footerLink: true, topStrip: false },
        rateBps: 1000,
        maxRateBps: 1000,
        bannerTitle: 'Seja parceira',
        bannerText: null,
        bannerCta: null,
      });
    });

    it('is closed — on the page and on the shop window — while the shopkeeper has not opened it, or the programme is off', async () => {
      const closed = async () => {
        const page = await call('GET', '/api/stores/lessari/affiliate-join');
        expect(page.statusCode).toBe(404);
        expect(errorOf(page)).toBe('AFFILIATE_PAGE_CLOSED');
        expect((await call('GET', '/api/stores/lessari/public')).json<PublicStore>().affiliatePage).toBeNull();
        const sent = await apply(ana());
        expect(sent.statusCode).toBe(404);
        expect(errorOf(sent)).toBe('AFFILIATE_PAGE_CLOSED');
      };

      await closed();
      await savePage(OPEN_PAGE);
      await closed();
      await programOn();
      await savePage({ ...OPEN_PAGE, open: false });
      await closed();
      expect(await prisma.affiliateApplication.count()).toBe(0);
    });
  });

  describe('an application', () => {
    it('is kept for the shop to decide, as typed and normalised, with the question as it was asked', async () => {
      await openPage({ content: { ...EMPTY_AFFILIATE_PAGE_CONTENT, extraQuestion: 'Qual o seu Instagram?' } });

      const sent = await apply(ana());
      expect(sent.statusCode).toBe(202);
      expect(sent.payload).toBe('');
      const list = await listOf();
      expect(list).toMatchObject({ total: 1, pendingCount: 1, page: 1, pageSize: 20 });
      expect(list.applications[0]).toMatchObject({
        name: 'Ana Souza',
        email: 'ana@exemplo.com',
        phone: '5511955554444',
        extraQuestion: 'Qual o seu Instagram?',
        extraAnswer: '@ana.treinos',
        status: 'PENDING',
        decidedAt: null,
        affiliate: null,
      });
      expect((await pageOf()).pendingApplications).toBe(1);
    });

    it('keeps no answer to a question the page does not ask', async () => {
      await openPage({ content: { ...EMPTY_AFFILIATE_PAGE_CONTENT, askExtraQuestion: false } });
      await apply(ana());
      expect((await listOf()).applications[0]).toMatchObject({ extraQuestion: null, extraAnswer: null });
    });

    it('is answered alike — and kept once — however many times an e-mail applies, and for an e-mail already the shop\'s affiliate or a robot\'s form', async () => {
      await openPage();
      expect((await apply(ana())).statusCode).toBe(202);
      expect((await apply(ana({ name: 'Ana S. Souza', phone: '(11) 94444-3333' }))).statusCode).toBe(202);
      const [only] = (await listOf()).applications;
      expect((await listOf()).total).toBe(1);
      expect(only).toMatchObject({ name: 'Ana S. Souza', phone: '5511944443333' });

      const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
      const bia = newEmail('bia');
      await call('POST', '/api/stores/lessari/affiliates', owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, '/api/stores/lessari/affiliates'), name: 'Bia', email: bia, tableId });
      expect((await apply(ana({ email: bia }))).statusCode).toBe(202);
      expect((await apply(ana({ email: newEmail('robo'), website: 'https://spam.example' }))).statusCode).toBe(202);
      expect((await listOf()).total).toBe(1);
    });

    it.each([
      ['no name', { name: ' ' }],
      ['an e-mail that is none', { email: 'ana' }],
      ['a phone that is none', { phone: '123' }],
      ['the terms not accepted', { accepted: false }],
      ['an answer past 200 characters', { extraAnswer: 'x'.repeat(201) }],
    ])('refuses %s', async (_, change) => {
      await openPage();
      const response = await apply(ana(change));
      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('AFFILIATE_APPLICATION_INVALID');
    });

    it('takes no field the form does not ask — a CPF least of all', async () => {
      await openPage();
      expect((await apply(ana({ cpf: ANA_CPF }))).statusCode).toBe(400);
      expect(await prisma.affiliateApplication.count()).toBe(0);
    });
  });

  describe('approving', () => {
    it('invites the person as the shop\'s own form does — with no CPF, which they give on accepting', async () => {
      await openPage();
      const application = await pending();

      const approved = await call('POST', `/api/stores/lessari/affiliate-applications/${application.id}/approve`, owner, {});
      expect(approved.statusCode).toBe(200);
      const decided = approved.json<ShopAffiliateApplication>();
      expect(decided).toMatchObject({ status: 'APPROVED', affiliate: { status: 'INVITED' } });
      expect(decided.decidedAt).not.toBeNull();

      const affiliate = await prisma.affiliate.findUniqueOrThrow({ where: { id: decided.affiliate!.id }, include: { table: true } });
      expect(affiliate).toMatchObject({ name: 'Ana Souza', email: 'ana@exemplo.com', phone: '5511955554444', cpf: null, status: 'INVITED' });
      expect(affiliate.table.isDefault).toBe(true);

      const token = tokenFromLink((await waitForMessage('ana@exemplo.com')).Text, '/afiliado/convite');
      const invitation = (await call('GET', `/api/affiliate-invites/${token}`)).json<AffiliateInvitation>();
      expect(invitation.cpfRequired).toBe(true);

      const signUp = (extra: object) => call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name: 'Ana Souza', password: PASSWORD, slug: 'ana', pixKey: null, termsVersion: 1, ...extra });
      const without = await signUp({});
      expect(without.statusCode).toBe(400);
      expect(errorOf(without)).toBe('AFFILIATE_ACCEPTANCE_INVALID');
      expect(await prisma.user.count({ where: { email: 'ana@exemplo.com' } })).toBe(0);

      const accepted = await signUp({ cpf: ANA_CPF });
      expect(accepted.statusCode).toBe(201);
      expect(await prisma.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } })).toMatchObject({ status: 'ACTIVE', slug: 'ana', cpf: '11144477735' });
    });

    it('refuses on accepting a CPF another affiliate of the shop has', async () => {
      await openPage();
      const application = await pending();
      const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
      await call('POST', '/api/stores/lessari/affiliates', owner, { phone: '(21) 98888-7777', cpf: ANA_CPF, name: 'Bia', email: newEmail('bia'), tableId });
      await clearInbox();
      await call('POST', `/api/stores/lessari/affiliate-applications/${application.id}/approve`, owner, {});
      const token = tokenFromLink((await waitForMessage('ana@exemplo.com')).Text, '/afiliado/convite');

      const response = await call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name: 'Ana Souza', password: PASSWORD, slug: 'ana', pixKey: null, termsVersion: 1, cpf: ANA_CPF });
      expect(response.statusCode).toBe(409);
      expect(errorOf(response)).toBe('AFFILIATE_CPF_TAKEN');
    });

    it('invites on the table named, else the one the page announces', async () => {
      await programOn();
      const special = (await call('POST', '/api/stores/lessari/affiliate-program/tables', owner, { name: 'Revendedoras', defaultRateBps: 1500 })).json<{ id: string }>();
      const vip = (await call('POST', '/api/stores/lessari/affiliate-program/tables', owner, { name: 'VIP', defaultRateBps: 2000 })).json<{ id: string }>();
      await savePage({ ...OPEN_PAGE, tableId: special.id });

      const first = await pending();
      const onPage = (await call('POST', `/api/stores/lessari/affiliate-applications/${first.id}/approve`, owner, {})).json<ShopAffiliateApplication>();
      expect((await prisma.affiliate.findUniqueOrThrow({ where: { id: onPage.affiliate!.id } })).tableId).toBe(special.id);

      await apply(ana({ email: newEmail('carla') }));
      const second = (await listOf('?status=PENDING')).applications[0]!;
      const named = (await call('POST', `/api/stores/lessari/affiliate-applications/${second.id}/approve`, owner, { tableId: vip.id })).json<ShopAffiliateApplication>();
      expect((await prisma.affiliate.findUniqueOrThrow({ where: { id: named.affiliate!.id } })).tableId).toBe(vip.id);
    });

    it('decides once: an approved or refused application is neither approved nor refused again', async () => {
      await openPage();
      const application = await pending();
      expect((await call('POST', `/api/stores/lessari/affiliate-applications/${application.id}/refuse`, owner)).json<ShopAffiliateApplication>()).toMatchObject({ status: 'REFUSED', affiliate: null });

      for (const action of ['approve', 'refuse']) {
        const again = await call('POST', `/api/stores/lessari/affiliate-applications/${application.id}/${action}`, owner, {});
        expect(again.statusCode).toBe(409);
        expect(again.json<ApiErrorBody & { details: object }>()).toMatchObject({ errorCode: 'AFFILIATE_APPLICATION_DECIDED', details: { status: 'REFUSED' } });
      }
      expect(await prisma.affiliate.count()).toBe(0);
      expect((await listOf('?status=REFUSED')).total).toBe(1);
      expect((await listOf('?status=PENDING')).total).toBe(0);
    });

    it('refuses an e-mail the shop invited meanwhile, and an application of another shop', async () => {
      await openPage();
      const application = await pending();
      const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
      await call('POST', '/api/stores/lessari/affiliates', owner, { ...affiliateIdentity(), name: 'Ana', email: 'ana@exemplo.com', tableId });

      const taken = await call('POST', `/api/stores/lessari/affiliate-applications/${application.id}/approve`, owner, {});
      expect(taken.statusCode).toBe(409);
      expect(errorOf(taken)).toBe('AFFILIATE_EMAIL_TAKEN');

      await call('POST', '/api/stores', stranger, shopBody('vizinha'));
      const theirs = await call('POST', `/api/stores/vizinha/affiliate-applications/${application.id}/refuse`, stranger);
      expect(theirs.statusCode).toBe(404);
      expect(errorOf(theirs)).toBe('AFFILIATE_APPLICATION_NOT_FOUND');
    });
  });

  describe('a page that invites at once', () => {
    it('approves every application as it arrives, on the table it announces, and sends the invite', async () => {
      await openPage({ approval: 'AUTO' });

      expect((await apply(ana())).statusCode).toBe(202);
      const [application] = (await listOf()).applications;
      expect(application).toMatchObject({ status: 'APPROVED', affiliate: { status: 'INVITED' } });
      expect((await listOf()).pendingCount).toBe(0);
      const message = await waitForMessage('ana@exemplo.com');
      expect(tokenFromLink(message.Text, '/afiliado/convite')).toBeTruthy();

      // Applying again changes nothing: the e-mail is the shop's affiliate now.
      expect((await apply(ana())).statusCode).toBe(202);
      expect(await prisma.affiliate.count()).toBe(1);
      expect((await listOf()).total).toBe(1);
    });

    it('approves the application already waiting from before, rather than keeping two', async () => {
      await openPage();
      await apply(ana());
      await savePage({ ...OPEN_PAGE, approval: 'AUTO' });

      await apply(ana());
      const list = await listOf();
      expect(list.total).toBe(1);
      expect(list.applications[0]).toMatchObject({ status: 'APPROVED' });
    });
  });

  it('deletes a decided application 90 days after its decision, and keeps one still waiting', async () => {
    await openPage();
    const refused = await pending();
    await call('POST', `/api/stores/lessari/affiliate-applications/${refused.id}/refuse`, owner);
    await apply(ana({ email: newEmail('carla') }));
    const sweeper = app.get(AffiliateApplicationSweeper);

    expect(await sweeper.sweep(new Date(Date.now() + 89 * DAY))).toBe(0);
    expect(await sweeper.sweep(new Date(Date.now() + 91 * DAY))).toBe(1);
    expect(await prisma.affiliateApplication.findMany({ select: { status: true } })).toEqual([{ status: 'PENDING' }]);
  });

  it('keeps the address the page\'s: no category takes it', async () => {
    const category = await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Seja afiliado' });
    expect(category.statusCode).toBe(400);
    expect(errorOf(category)).toBe('CATALOG_SLUG_RESERVED');
  });
});
