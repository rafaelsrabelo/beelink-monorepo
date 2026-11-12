// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AffiliateHome,
  AffiliateOrderPage,
  AffiliatePayoutPage,
  AffiliateProductPage,
  AffiliateProfile,
  AffiliateProgramOverview,
  AffiliateShop,
  AffiliateSignUpResult,
  AffiliateStatement,
  ApiErrorBody,
  AuthSession,
  CustomerOrder,
  Product,
  ShopAffiliate,
} from '@harness-monorepo/contracts';

// App
import { AffiliateCommissionSweeper } from '../src/modules/affiliates/affiliate-commission-sweeper.js';
import { brasiliaDayOf, dayOfDateColumn, openOfBrasiliaDay } from '../src/modules/billing/billing-dates.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const PROGRAM_ON = { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null };
const PHOTO = 'https://res.cloudinary.com/bee-link/image/upload/v1/afiliados/maria.png';

/** Every key anywhere in an answer: what the affiliate is told must never name how to reach a customer. */
function keysOf(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const item of value) keysOf(item, into);
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      into.add(key);
      keysOf(inner, into);
    }
  }
  return into;
}

describe("the affiliate's own area: the shops they sell for, their links, orders, statement and data (IMPULSEIA-108)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let sweeper: AffiliateCommissionSweeper;
  let owner: AuthSession;
  let stranger: AuthSession;
  let shopper: AuthSession;
  let shopperEmail: string;
  let whey: Product;
  let maria: { record: ShopAffiliate; session: AuthSession; email: string };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    sweeper = app.get(AffiliateCommissionSweeper);
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
    whey = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey 900 g', priceCents: 10_000 })).json<Product>();
    await call('PUT', '/api/stores/lessari/affiliate-program', owner, PROGRAM_ON);
    maria = await affiliate('maria', 'Maria Souza');

    shopperEmail = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Souza', email: shopperEmail, password: PASSWORD });
    await verifyEmailOf(app, shopperEmail);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email: shopperEmail, password: PASSWORD })).json<AuthSession>();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;
  const area = (path: string, session = maria.session) => call('GET', `/api/affiliate/stores${path}`, session);
  const profile = (payload: object, session = maria.session) => call('PATCH', '/api/affiliate/stores/lessari/profile', session, payload);

  /** An affiliate through the real door — invited, signed up by the invite's link — and the session it opened. */
  async function affiliate(slug: string, name: string, email = newEmail(slug)): Promise<{ record: ShopAffiliate; session: AuthSession; email: string }> {
    const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
    const record = (await call('POST', '/api/stores/lessari/affiliates', owner, { name, email, tableId })).json<ShopAffiliate>();
    const token = tokenFromLink((await waitForMessage(email.toLowerCase(), 10_000, 'convidou você')).Text, '/afiliado/convite');
    const accepted = await call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name, password: PASSWORD, slug, pixKey: `${slug}@pix.test`, termsVersion: 0 });
    if (accepted.statusCode !== 201) throw new Error(`sign-up answered ${accepted.statusCode}: ${accepted.payload}`);
    return { record, session: accepted.json<AffiliateSignUpResult>().session, email: email.toLowerCase() };
  }

  /** The shopper's order of one whey — R$ 100,00, 10% on the default table — a day after following Maria's link. */
  async function place(): Promise<CustomerOrder> {
    const variantId = (await prisma.productVariant.findFirstOrThrow({ where: { productId: whey.id } })).id;
    const affiliateVisit = { affiliateId: maria.record.id, visitedAt: new Date(Date.now() - DAY).toISOString() };
    const response = await call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', affiliateVisit });
    if (response.statusCode !== 201) throw new Error(`POST customer/orders answered ${response.statusCode}: ${response.payload}`);
    return response.json<CustomerOrder>();
  }

  const deliver = (number: number) => call('PATCH', `/api/stores/lessari/orders/${number}/status`, owner, { status: 'DELIVERED' });

  async function release(orderNumber: number): Promise<void> {
    const order = await prisma.order.findFirstOrThrow({ where: { number: orderNumber, store: { slug: 'lessari' } }, select: { id: true } });
    const { dueOn } = await prisma.affiliateCommission.findUniqueOrThrow({ where: { orderId: order.id } });
    await sweeper.sweep(openOfBrasiliaDay(dayOfDateColumn(dueOn!)));
  }

  describe('the shops', () => {
    it('lists the shops the account sells for, and none for an account that sells for none', async () => {
      const response = await area('');

      expect(response.statusCode).toBe(200);
      expect(response.json<AffiliateShop[]>()).toEqual([
        { store: { slug: 'lessari', name: 'lessari', logoUrl: null }, slug: 'maria', status: 'ACTIVE', availableCents: 0, pendingCents: 0 },
      ]);
      expect((await area('', owner)).json<AffiliateShop[]>()).toEqual([]);
      expect((await call('GET', '/api/affiliate/stores')).statusCode).toBe(401);
    });

    it('reads the live standing at a shop, not an ended one before it', async () => {
      await call('POST', `/api/stores/lessari/affiliates/${maria.record.id}/end`, owner);
      expect((await area('')).json<AffiliateShop[]>()[0]).toMatchObject({ slug: 'maria', status: 'ENDED' });

      // Invited again: the account exists, so it accepts signed in, as a new standing.
      const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
      await clearInbox();
      await call('POST', '/api/stores/lessari/affiliates', owner, { name: 'Maria Souza', email: maria.email, tableId });
      const token = tokenFromLink((await waitForMessage(maria.email, 10_000, 'convidou você')).Text, '/afiliado/convite');
      expect((await call('POST', `/api/affiliate-invites/${token}/accept`, maria.session, { slug: 'maria-de-novo', pixKey: null, termsVersion: 0 })).statusCode).toBe(200);

      expect((await area('')).json<AffiliateShop[]>()).toEqual([expect.objectContaining({ slug: 'maria-de-novo', status: 'ACTIVE' })]);
      expect((await area('/lessari')).json<AffiliateHome>().affiliate.slug).toBe('maria-de-novo');
    });
  });

  describe('the front page at a shop', () => {
    it('says the standing, the link, the table and their data, with nothing owed yet', async () => {
      const response = await area('/lessari');

      expect(response.statusCode).toBe(200);
      expect(response.json<AffiliateHome>()).toEqual({
        store: { slug: 'lessari', name: 'lessari', logoUrl: null },
        affiliate: { id: maria.record.id, name: 'Maria Souza', slug: 'maria', status: 'ACTIVE', table: { name: 'Padrão', defaultRateBps: 1000 } },
        linksCredit: true,
        linkPath: '/lessari/maria',
        pendingCents: 0,
        availableCents: 0,
        payment: { availableCents: 0, next: null },
        numbers: { days: 30, visits: 0, orders: 0, sales: 0, commissionCents: 0 },
        profile: { pixKey: 'maria@pix.test', phone: null, photoUrl: null, tagline: null },
      });
    });

    it('counts the last thirty days, and says when the next payment falls due and how much', async () => {
      await call('POST', '/api/stores/lessari/affiliate-visits', undefined, { affiliateId: maria.record.id });
      const delivered = await place();
      await place();
      const cancelled = await place();
      await deliver(delivered.number);
      await call('PATCH', `/api/stores/lessari/orders/${cancelled.number}/status`, owner, { status: 'CANCELLED' });

      const home = (await area('/lessari')).json<AffiliateHome>();
      const { dueOn } = await prisma.affiliateCommission.findFirstOrThrow({ where: { affiliateId: maria.record.id, dueOn: { not: null } } });

      expect(home.numbers).toEqual({ days: 30, visits: 1, orders: 2, sales: 1, commissionCents: 2000 });
      expect(home.payment).toEqual({ availableCents: 0, next: { dueOn: dayOfDateColumn(dueOn!), amountCents: 1000 } });
      expect(home.pendingCents).toBe(2000);
    });

    it('says links credit nobody while paused, and has no link once ended — and still reads', async () => {
      await call('POST', `/api/stores/lessari/affiliates/${maria.record.id}/pause`, owner);
      expect((await area('/lessari')).json<AffiliateHome>()).toMatchObject({ linksCredit: false, linkPath: '/lessari/maria', affiliate: { status: 'PAUSED' } });

      await call('POST', `/api/stores/lessari/affiliates/${maria.record.id}/end`, owner);
      expect((await area('/lessari')).json<AffiliateHome>()).toMatchObject({ linksCredit: false, linkPath: null, affiliate: { status: 'ENDED' } });
      expect((await area('/lessari/statement')).statusCode).toBe(200);
    });

    it('is the standing account\'s alone: a shop it does not sell for, its owner included, is not found', async () => {
      for (const session of [stranger, owner]) {
        const response = await area('/lessari', session);
        expect(response.statusCode).toBe(404);
        expect(errorOf(response)).toBe('AFFILIATE_NOT_FOUND');
      }
      expect(errorOf(await area('/vizinha'))).toBe('AFFILIATE_NOT_FOUND');
      expect(errorOf(await area('/ninguem'))).toBe('STORE_NOT_FOUND');
    });
  });

  describe('the orders', () => {
    it('reads who bought by name, what and the commission — and nothing that reaches the customer', async () => {
      const order = await place();
      await deliver(order.number);

      const response = await area('/lessari/orders');
      expect(response.statusCode).toBe(200);
      const page = response.json<AffiliateOrderPage>();
      expect(page).toMatchObject({ total: 1, page: 1, pageSize: 20 });
      expect(page.orders[0]).toEqual({
        number: order.number,
        placedAt: expect.any(String),
        status: 'DELIVERED',
        customerName: 'Bia Souza',
        items: [{ name: 'Whey 900 g', variantLabel: null, quantity: 1 }],
        commission: { status: 'PENDING', baseCents: 10_000, commissionCents: 1000, zeroReason: null, dueOn: expect.any(String) },
      });

      const keys = keysOf(page);
      for (const key of ['phone', 'email', 'cpf', 'document', 'address', 'customerId']) expect(keys.has(key)).toBe(false);
      expect(response.payload).not.toContain(shopperEmail.toLowerCase());
    });
  });

  describe('the statement and the payouts', () => {
    it("reads the shop's lines and reasons, never who wrote them, and the payouts it registered", async () => {
      const order = await place();
      await deliver(order.number);
      await release(order.number);
      await call('POST', `/api/stores/lessari/affiliates/${maria.record.id}/adjustments`, owner, { amountCents: 500, reason: 'Bônus de novembro' });
      await call('POST', `/api/stores/lessari/affiliates/${maria.record.id}/payouts`, owner, { amountCents: 1200, paidOn: brasiliaDayOf(new Date()), method: 'PIX', note: 'Pix de novembro' });

      const statement = (await area('/lessari/statement')).json<AffiliateStatement>();
      expect(statement).toMatchObject({ pendingCents: 0, availableCents: 300, total: 3 });
      expect(statement.entries.map((entry) => [entry.kind, entry.amountCents])).toEqual([
        ['PAID_OUT', -1200],
        ['ADJUSTED', 500],
        ['RELEASED', 1000],
      ]);
      expect(statement.entries[1]!.reason).toBe('Bônus de novembro');
      expect(keysOf(statement).has('actorId')).toBe(false);

      const payouts = (await area('/lessari/payouts')).json<AffiliatePayoutPage>();
      expect(payouts).toEqual({ payouts: [{ id: expect.any(String), amountCents: 1200, paidOn: brasiliaDayOf(new Date()), method: 'PIX', note: 'Pix de novembro' }], total: 1, page: 1, pageSize: 20 });

      const home = (await area('/lessari')).json<AffiliateHome>();
      expect(home.payment.availableCents).toBe(300);
    });

    it('e-mails the affiliate once when a payout is registered, from the shop, with the way to the statement', async () => {
      const order = await place();
      await deliver(order.number);
      await release(order.number);
      await clearInbox();

      await call('POST', `/api/stores/lessari/affiliates/${maria.record.id}/payouts`, owner, { amountCents: 1000, paidOn: brasiliaDayOf(new Date()), method: 'TRANSFER', note: null });

      const mail = await waitForMessage(maria.email, 10_000, 'Pagamento registrado');
      expect(mail.Text).toContain('registrou um pagamento de');
      expect(mail.Text).toContain('por transferência');
      expect(mail.Text).toContain('/afiliado/lessari?aba=extrato');
      expect(await prisma.affiliatePayoutNotice.count({ where: { sentAt: { not: null } } })).toBe(1);
    });
  });

  describe('the products and their links', () => {
    it('lists the products on the shelf with the link that credits them and what each pays', async () => {
      const creatina = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Creatina', priceCents: 5000 })).json<Product>();
      await call('POST', '/api/stores/lessari/products', owner, { name: 'Rascunho', priceCents: 100, status: 'DRAFT' });
      const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
      await call('PUT', `/api/stores/lessari/affiliate-program/tables/${tableId}/rates/${creatina.id}`, owner, { rateBps: 2500 });

      const page = (await area('/lessari/products')).json<AffiliateProductPage>();
      expect(page.total).toBe(2);
      expect(page.products).toEqual([
        { productId: creatina.id, name: 'Creatina', imageUrl: null, priceCents: 5000, rateBps: 2500, path: `/lessari/produtos/${creatina.slug}?afiliado=maria` },
        { productId: whey.id, name: 'Whey 900 g', imageUrl: null, priceCents: 10_000, rateBps: 1000, path: `/lessari/produtos/${whey.slug}?afiliado=maria` },
      ]);
      expect((await area('/lessari/products?q=whey')).json<AffiliateProductPage>().products.map((product) => product.name)).toEqual(['Whey 900 g']);
    });

    it('has no links for an ended affiliate', async () => {
      await call('POST', `/api/stores/lessari/affiliates/${maria.record.id}/end`, owner);

      const response = await area('/lessari/products');
      expect(response.statusCode).toBe(409);
      expect(errorOf(response)).toBe('AFFILIATE_STATUS_INVALID');
    });
  });

  describe('their own data', () => {
    it('keeps a Pix key and a phone in one shape, the phrase trimmed and a photo uploaded here', async () => {
      const response = await profile({ pixKey: '529.982.247-25', phone: '(11) 98888-7777', tagline: '  Separei meus favoritos  ', photoUrl: PHOTO });

      expect(response.statusCode).toBe(200);
      expect(response.json<AffiliateProfile>()).toEqual({ pixKey: '52998224725', phone: '5511988887777', photoUrl: PHOTO, tagline: 'Separei meus favoritos' });
      expect((await call('GET', '/api/stores/lessari/affiliate-link?slug=maria')).json<{ affiliate: { photoUrl: string; tagline: string } }>().affiliate).toMatchObject({ photoUrl: PHOTO, tagline: 'Separei meus favoritos' });
    });

    it('leaves a key it is not given alone, and clears one given as null', async () => {
      await profile({ tagline: 'Frase', phone: '(11) 98888-7777' });

      expect((await profile({ tagline: null })).json<AffiliateProfile>()).toEqual({ pixKey: 'maria@pix.test', phone: '5511988887777', photoUrl: null, tagline: null });
    });

    it.each([
      ['a Pix key of no known shape', { pixKey: 'minha chave' }],
      ['a phone that is no phone', { phone: '123' }],
      ['a photo from anywhere else', { photoUrl: 'https://exemplo.com/maria.png' }],
      ['a photo over plain http', { photoUrl: 'http://res.cloudinary.com/bee-link/maria.png' }],
      ['a phrase past 100 characters', { tagline: 'a'.repeat(101) }],
    ])('refuses %s', async (_, payload) => {
      const response = await profile(payload);

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('AFFILIATE_PROFILE_INVALID');
    });

    it('lets an ended affiliate keep the Pix key, and not what the shop window shows', async () => {
      await call('POST', `/api/stores/lessari/affiliates/${maria.record.id}/end`, owner);

      expect((await profile({ pixKey: 'novo@pix.test' })).json<AffiliateProfile>().pixKey).toBe('novo@pix.test');
      expect(errorOf(await profile({ tagline: 'Ainda aqui' }))).toBe('AFFILIATE_STATUS_INVALID');
    });

    it("is never another's to change", async () => {
      expect(errorOf(await profile({ tagline: 'De fora' }, stranger))).toBe('AFFILIATE_NOT_FOUND');
      expect(errorOf(await profile({ tagline: 'Da dona' }, owner))).toBe('AFFILIATE_NOT_FOUND');
    });
  });

  it("keeps the affiliate's invite out of a shop's address", async () => {
    const response = await call('POST', '/api/stores', owner, shopBody('convite'));

    expect(response.statusCode).toBe(400);
    expect(errorOf(response)).toBe('STORE_SLUG_RESERVED');
  });
});
