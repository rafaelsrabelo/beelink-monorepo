// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AffiliateHome,
  AffiliateInvitation,
  AffiliateOrderPage,
  AffiliateOwed,
  AffiliatePayoutPage,
  AffiliateProgramOverview,
  AffiliateShop,
  AffiliateSignUpResult,
  AffiliateSlugAvailability,
  AffiliateStatement,
  AuthSession,
  CustomerOrder,
  OrderAffiliate,
  Product,
  PublicAffiliateLink,
  ShopAffiliate,
} from '@harness-monorepo/contracts';

// App
import { AffiliateCommissionSweeper } from '../src/modules/affiliates/affiliate-commission-sweeper.js';
import { payoutPeriodOf } from '../src/modules/affiliates/affiliate-payout-calendar.js';
import { AffiliateSaleMailer } from '../src/modules/affiliates/affiliate-sale-mailer.js';
import { brasiliaDayOf, dayOfDateColumn, openOfBrasiliaDay } from '../src/modules/billing/billing-dates.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: 'Lessari', slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

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

const CONTACT_KEYS = ['phone', 'email', 'cpf', 'document', 'address', 'customerId'];

/**
 * The affiliates epic end to end (IMPULSEIA-109), through the doors a person uses: a shop opens its
 * programme and invites Maria by e-mail; she reads the invite, takes her `/name` and signs up by it;
 * a customer arrives by her link and buys; the shop delivers; the due day comes and the sweep makes
 * the commission hers; the shop pays her outside bee-link and records it; and she reads all of it in
 * her own area — the buyer's name, never a way to reach them. One file, one story: each step leans on
 * the one before, as the people in it do.
 */
describe('the affiliates epic, end to end: invite → accept → link → order → delivery → due day → payout → the affiliate reads it', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let sweeper: AffiliateCommissionSweeper;
  let saleMailer: AffiliateSaleMailer;
  let owner: AuthSession;
  let shopper: AuthSession;
  let shopperEmail: string;
  let whey: Product;
  const mariaEmail = newEmail('maria');
  let token: string;
  let mariaId: string;
  let maria: { id: string; session: AuthSession };
  let order: CustomerOrder;
  let dueOn: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    sweeper = app.get(AffiliateCommissionSweeper);
    saleMailer = app.get(AffiliateSaleMailer);

    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    whey = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey 900 g', priceCents: 10_000 })).json<Product>();

    shopperEmail = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Souza', email: shopperEmail, password: PASSWORD });
    await verifyEmailOf(app, shopperEmail);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email: shopperEmail, password: PASSWORD })).json<AuthSession>();
  });

  afterAll(async () => {
    await app.close();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const area = (path: string) => call('GET', `/api/affiliate/stores${path}`, maria.session);

  it('opens the programme, and invites Maria by e-mail', async () => {
    const overview = (await call('PUT', '/api/stores/lessari/affiliate-program', owner, { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: 'Comissão paga por Pix.' })).json<AffiliateProgramOverview>();
    expect(overview.program).toMatchObject({ enabled: true, termsVersion: 1 });

    const invited = await call('POST', '/api/stores/lessari/affiliates', owner, { name: 'Maria Souza', email: mariaEmail, tableId: overview.tables[0]!.id });
    expect(invited.statusCode).toBe(201);
    expect(invited.json<ShopAffiliate>()).toMatchObject({ status: 'INVITED', slug: null });
    mariaId = invited.json<ShopAffiliate>().id;

    token = tokenFromLink((await waitForMessage(mariaEmail.toLowerCase(), 10_000, 'convidou você')).Text, '/afiliado/convite');
  });

  it('lets her read the invite and take her /name, and signs her up by it', async () => {
    const invitation = (await call('GET', `/api/affiliate-invites/${token}`)).json<AffiliateInvitation>();
    expect(invitation).toMatchObject({ store: { slug: 'lessari' }, table: { name: 'Padrão', defaultRateBps: 1000 }, terms: { text: 'Comissão paga por Pix.', version: 1 }, hasAccount: false });

    expect((await call('GET', `/api/affiliate-invites/${token}/slug?slug=maria`)).json<AffiliateSlugAvailability>()).toEqual({ slug: 'maria', available: true, reason: null });

    const signedUp = await call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name: 'Maria Souza', password: PASSWORD, slug: 'maria', pixKey: 'maria@pix.test', termsVersion: 1 });
    expect(signedUp.statusCode).toBe(201);
    const result = signedUp.json<AffiliateSignUpResult>();
    maria = { id: mariaId, session: result.session };
    expect(result.affiliate).toEqual({ storeName: 'Lessari', storeSlug: 'lessari', slug: 'maria' });
    expect((await call('GET', `/api/stores/lessari/affiliates/${mariaId}`, owner)).json<ShopAffiliate>()).toMatchObject({ status: 'ACTIVE', slug: 'maria', pixKey: 'maria@pix.test', termsVersion: 1 });

    // The invite was used: its link opens nothing any more.
    expect((await call('GET', `/api/affiliate-invites/${token}`)).statusCode).toBe(404);
  });

  it('answers her link on the shop window and counts the visit, as a number and nothing of the visitor', async () => {
    const link = (await call('GET', '/api/stores/lessari/affiliate-link?slug=maria')).json<PublicAffiliateLink>();
    expect(link.affiliate).toMatchObject({ id: maria.id, slug: 'maria', name: 'Maria Souza', attributionDays: 30 });

    expect((await call('POST', '/api/stores/lessari/affiliate-visits', undefined, { affiliateId: maria.id })).statusCode).toBeLessThan(300);
    const days = await prisma.affiliateVisitDay.findMany({ where: { affiliateId: maria.id } });
    expect(days.map((day) => day.visits)).toEqual([1]);
  });

  it('credits the order placed after the visit, and tells her who bought', async () => {
    const variantId = (await prisma.productVariant.findFirstOrThrow({ where: { productId: whey.id } })).id;
    const placed = await call('POST', '/api/stores/lessari/customer/orders', shopper, {
      items: [{ variantId, quantity: 1 }],
      fulfillment: 'PICKUP',
      paymentMethod: 'PIX',
      affiliateVisit: { affiliateId: maria.id, visitedAt: new Date(Date.now() - 60_000).toISOString() },
    });
    expect(placed.statusCode).toBe(201);
    order = placed.json<CustomerOrder>();

    const credited = (await call('GET', `/api/stores/lessari/orders/${order.number}/affiliate`, owner)).json<OrderAffiliate>();
    expect(credited.affiliate).toMatchObject({ id: maria.id, slug: 'maria' });
    expect(credited.commission).toMatchObject({ status: 'PENDING', baseCents: 10_000, commissionCents: 1000 });

    await saleMailer.flush();
    expect((await waitForMessage(mariaEmail.toLowerCase(), 10_000, 'Nova venda')).Text).toContain(`pedido nº ${order.number}, de Bia Souza`);
  });

  it("dates the commission by the delivery day's period, at the programme's delay", async () => {
    const delivered = await call('PATCH', `/api/stores/lessari/orders/${order.number}/status`, owner, { status: 'DELIVERED' });
    expect(delivered.statusCode).toBe(200);

    const row = await prisma.affiliateCommission.findFirstOrThrow({ where: { affiliateId: maria.id } });
    dueOn = dayOfDateColumn(row.dueOn!);
    expect(dueOn).toBe(payoutPeriodOf(brasiliaDayOf(new Date()), 10).dueOn);
    expect(row.status).toBe('PENDING');
  });

  it('makes it hers on the due day, and the shop sees it owed', async () => {
    await sweeper.sweep(openOfBrasiliaDay(dueOn));

    const statement = (await call('GET', `/api/stores/lessari/affiliates/${maria.id}/statement`, owner)).json<AffiliateStatement>();
    expect(statement).toMatchObject({ pendingCents: 0, availableCents: 1000 });
    expect(statement.entries.map((entry) => [entry.kind, entry.amountCents])).toEqual([['RELEASED', 1000]]);

    const owed = (await call('GET', '/api/stores/lessari/affiliate-program/owed', owner)).json<AffiliateOwed>();
    expect(owed.owedCents).toBe(1000);
    expect(owed.affiliates).toEqual([expect.objectContaining({ affiliate: expect.objectContaining({ id: maria.id, pixKey: 'maria@pix.test' }), availableCents: 1000, pendingCents: 0 })]);
  });

  it('records the payout the shop made outside bee-link, and e-mails her', async () => {
    await clearInbox();
    const paidOn = brasiliaDayOf(new Date());
    const paid = await call('POST', `/api/stores/lessari/affiliates/${maria.id}/payouts`, owner, { amountCents: 1000, paidOn, method: 'PIX', note: 'Pix de novembro' });
    expect(paid.statusCode).toBe(201);

    const statement = (await call('GET', `/api/stores/lessari/affiliates/${maria.id}/statement`, owner)).json<AffiliateStatement>();
    expect(statement.availableCents).toBe(0);
    expect(statement.entries.map((entry) => [entry.kind, entry.amountCents])).toEqual([['PAID_OUT', -1000], ['RELEASED', 1000]]);
    expect((await waitForMessage(mariaEmail.toLowerCase(), 10_000)).Text).toContain('/afiliado/lessari?aba=extrato');
  });

  it('shows her all of it in her own area — the buyer by name, and nothing that reaches them', async () => {
    expect((await area('')).json<AffiliateShop[]>()).toEqual([expect.objectContaining({ store: expect.objectContaining({ slug: 'lessari' }), slug: 'maria', status: 'ACTIVE', availableCents: 0, pendingCents: 0 })]);

    const home = (await area('/lessari')).json<AffiliateHome>();
    expect(home).toMatchObject({ linksCredit: true, linkPath: '/lessari/maria', availableCents: 0, pendingCents: 0 });
    expect(home.numbers).toMatchObject({ visits: 1, orders: 1, sales: 1, commissionCents: 1000 });

    const orders = await area('/lessari/orders');
    const page = orders.json<AffiliateOrderPage>();
    expect(page.orders).toEqual([expect.objectContaining({ number: order.number, status: 'DELIVERED', customerName: 'Bia Souza', commission: expect.objectContaining({ status: 'AVAILABLE', commissionCents: 1000 }) })]);
    const keys = keysOf(page);
    for (const key of CONTACT_KEYS) expect(keys.has(key)).toBe(false);
    expect(orders.payload).not.toContain(shopperEmail.toLowerCase());

    const statement = (await area('/lessari/statement')).json<AffiliateStatement>();
    expect(statement.entries.map((entry) => entry.kind)).toEqual(['PAID_OUT', 'RELEASED']);
    expect(keysOf(statement).has('actorId')).toBe(false);

    const payouts = (await area('/lessari/payouts')).json<AffiliatePayoutPage>();
    expect(payouts.payouts).toEqual([expect.objectContaining({ amountCents: 1000, method: 'PIX', note: 'Pix de novembro' })]);
  });
});
