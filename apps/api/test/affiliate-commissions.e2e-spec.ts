// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AffiliateProgramOverview, AuthSession, CustomerOrder, Product, ShopAffiliate } from '@harness-monorepo/contracts';

// App
import { AffiliateCommissionSweeper } from '../src/modules/affiliates/affiliate-commission-sweeper.js';
import { payoutPeriodOf } from '../src/modules/affiliates/affiliate-payout-calendar.js';
import { AffiliateSaleMailer } from '../src/modules/affiliates/affiliate-sale-mailer.js';
import { brasiliaDayOf, dayOfDateColumn, openOfBrasiliaDay } from '../src/modules/billing/billing-dates.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { affiliateIdentity } from './support/affiliate-identity.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const PROGRAM_ON = { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null };

describe("an order's affiliate commission: credited at the order, due by the calendar, undone by a cancellation (IMPULSEIA-106)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let sweeper: AffiliateCommissionSweeper;
  let mailer: AffiliateSaleMailer;
  let owner: AuthSession;
  let stranger: AuthSession;
  let shopper: AuthSession;
  let shopperEmail: string;
  let whey: string;
  let creatina: { productId: string; variantId: string };
  let joao: ShopAffiliate & { email: string };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    sweeper = app.get(AffiliateCommissionSweeper);
    mailer = app.get(AffiliateSaleMailer);
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
    whey = await variantOf('Whey', 10_000);
    creatina = { variantId: await variantOf('Creatina', 5_000), productId: (await prisma.product.findFirstOrThrow({ where: { name: 'Creatina' } })).id };

    const table = await programOn();
    // Creatine pays 25% on the default table; every other product its 10%.
    await call('PUT', `/api/stores/lessari/affiliate-program/tables/${table}/rates/${creatina.productId}`, owner, { rateBps: 2500 });
    joao = await affiliate('joao');

    shopperEmail = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Souza', email: shopperEmail, password: PASSWORD });
    await verifyEmailOf(app, shopperEmail);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email: shopperEmail, password: PASSWORD })).json<AuthSession>();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function variantOf(name: string, priceCents: number, shop = 'lessari', session = owner): Promise<string> {
    const product = (await call('POST', `/api/stores/${shop}/products`, session, { name, priceCents })).json<Product>();
    return (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  }

  async function programOn(shop = 'lessari', session = owner): Promise<string> {
    return (await call('PUT', `/api/stores/${shop}/affiliate-program`, session, PROGRAM_ON)).json<AffiliateProgramOverview>().tables[0]!.id;
  }

  /** An affiliate through the real door: invited by the shop, signed up by the invite's link. */
  async function affiliate(slug: string, email = newEmail(slug), shop = 'lessari', session = owner): Promise<ShopAffiliate & { email: string }> {
    const tableId = (await call('GET', `/api/stores/${shop}/affiliate-program`, session)).json<AffiliateProgramOverview>().tables[0]!.id;
    const invited = await call('POST', `/api/stores/${shop}/affiliates`, session, { ...affiliateIdentity(), name: 'João Silva', email, tableId });
    if (invited.statusCode !== 201) throw new Error(`POST affiliates answered ${invited.statusCode}: ${invited.payload}`);
    const token = tokenFromLink((await waitForMessage(email.toLowerCase(), 10_000, 'convidou você')).Text, '/afiliado/convite');
    const accepted = await call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name: 'João Silva', password: PASSWORD, slug, pixKey: null, termsVersion: 0 });
    if (accepted.statusCode !== 201) throw new Error(`sign-up answered ${accepted.statusCode}: ${accepted.payload}`);
    return { ...invited.json<ShopAffiliate>(), email: email.toLowerCase() };
  }

  const visitOf = (affiliateId: string, ago = DAY) => ({ affiliateId, visitedAt: new Date(Date.now() - ago).toISOString() });

  /** The shopper's order of one whey and one creatine — R$ 150,00 — after following a link. */
  async function place(affiliateVisit?: object, items = [{ variantId: whey, quantity: 1 }, { variantId: creatina.variantId, quantity: 1 }]): Promise<CustomerOrder> {
    const response = await call('POST', '/api/stores/lessari/customer/orders', shopper, { items, fulfillment: 'PICKUP', paymentMethod: 'PIX', ...(affiliateVisit ? { affiliateVisit } : {}) });
    if (response.statusCode !== 201) throw new Error(`POST customer/orders answered ${response.statusCode}: ${response.payload}`);
    return response.json<CustomerOrder>();
  }

  const move = (number: number, status: string) => call('PATCH', `/api/stores/lessari/orders/${number}/status`, owner, { status });
  const commissionOf = (orderId: string) => prisma.affiliateCommission.findUnique({ where: { orderId }, include: { lines: true } });
  // By id, the order they were written in: a sweep run at a future instant dates its line ahead of the ones after it.
  const entriesOf = (affiliateId: string) => prisma.affiliateEntry.findMany({ where: { affiliateId }, orderBy: { id: 'asc' }, select: { kind: true, amountCents: true } });

  /** The rule the statement rests on: the balances are what the commissions and the lines add up to. */
  async function expectBooksToHold(affiliateId: string) {
    const [row, pending, lines] = await Promise.all([
      prisma.affiliate.findUniqueOrThrow({ where: { id: affiliateId } }),
      prisma.affiliateCommission.aggregate({ where: { affiliateId, status: 'PENDING' }, _sum: { commissionCents: true } }),
      prisma.affiliateEntry.aggregate({ where: { affiliateId }, _sum: { amountCents: true } }),
    ]);
    expect(row.pendingCents).toBe(pending._sum.commissionCents ?? 0);
    expect(row.availableCents).toBe(lines._sum.amountCents ?? 0);
    return row;
  }

  describe('placed', () => {
    it("credits the order to the affiliate whose link was followed, at their table, line by line", async () => {
      const order = await place(visitOf(joao.id));

      const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { affiliateId: true, affiliateVisitAt: true } });
      expect(row.affiliateId).toBe(joao.id);
      expect(row.affiliateVisitAt).toBeInstanceOf(Date);
      const commission = await commissionOf(order.id);
      // R$ 100,00 of whey at 10% and R$ 50,00 of creatine at 25%.
      expect(commission).toMatchObject({ status: 'PENDING', baseCents: 15_000, commissionCents: 2250, tableName: 'Padrão', zeroReason: null, dueOn: null, availableAt: null });
      expect(commission!.lines.map(({ rateBps, baseCents, commissionCents }) => ({ rateBps, baseCents, commissionCents })).sort((a, b) => a.rateBps - b.rateBps)).toEqual([
        { rateBps: 1000, baseCents: 10_000, commissionCents: 1000 },
        { rateBps: 2500, baseCents: 5000, commissionCents: 1250 },
      ]);
      expect((await expectBooksToHold(joao.id)).pendingCents).toBe(2250);
    });

    it("pays a product its own rate, else its category's, else the table's", async () => {
      const suplementos = (await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Suplementos' })).json<{ id: string }>();
      await prisma.product.updateMany({ where: { name: { in: ['Whey', 'Creatina'] } }, data: { categoryId: suplementos.id } });
      const table = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!;
      await call('PUT', `/api/stores/lessari/affiliate-program/tables/${table.id}/category-rates/${suplementos.id}`, owner, { rateBps: 2000 });

      const order = await place(visitOf(joao.id));

      // Whey has no rate of its own: its category's 20%. Creatine keeps its own 25%.
      const commission = await commissionOf(order.id);
      expect(commission).toMatchObject({ baseCents: 15_000, commissionCents: 3250 });
      expect(commission!.lines.map(({ rateBps, commissionCents }) => ({ rateBps, commissionCents })).sort((a, b) => a.rateBps - b.rateBps)).toEqual([
        { rateBps: 2000, commissionCents: 2000 },
        { rateBps: 2500, commissionCents: 1250 },
      ]);
    });

    it("keeps the table's rates as they were: a change afterwards rewrites nothing", async () => {
      const order = await place(visitOf(joao.id));
      const table = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!;
      await call('PUT', `/api/stores/lessari/affiliate-program/tables/${table.id}`, owner, { name: 'Geral', defaultRateBps: 5000 });

      expect(await commissionOf(order.id)).toMatchObject({ commissionCents: 2250, tableName: 'Padrão' });
    });

    it('e-mails the affiliate of the sale: who bought, what, and the commission it should pay', async () => {
      await place(visitOf(joao.id));
      await mailer.flush();

      const mail = await waitForMessage(joao.email, 10_000, 'Nova venda');
      expect(mail.Text).toContain('pedido nº 1, de Bia Souza');
      expect(mail.Text).toContain('1× Whey');
      expect(mail.Text).toContain('1× Creatina');
      // `Intl` writes a no-break space after the currency sign.
      expect(mail.Text).toMatch(/R\$\s22,50/);
    });

    it.each([
      ['no link at all', () => undefined],
      ['an id that is no affiliate', () => visitOf('0199a1b2-0000-7000-8000-000000000000')],
      ['an id that is no id', () => ({ affiliateId: 'forjado', visitedAt: new Date().toISOString() })],
      ['a visit past the programme’s 30 days', () => visitOf(joao.id, 31 * DAY)],
      ['a visit dated ahead', () => ({ affiliateId: joao.id, visitedAt: new Date(Date.now() + DAY).toISOString() })],
    ])('credits nobody for %s, and places the order all the same', async (_, visit) => {
      const order = await place(visit());

      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).affiliateId).toBeNull();
      expect(await prisma.affiliateCommission.count()).toBe(0);
    });

    it("credits nobody while the affiliate is paused, the programme off, or for another shop's affiliate", async () => {
      await call('POST', `/api/stores/lessari/affiliates/${joao.id}/pause`, owner);
      await place(visitOf(joao.id));
      await call('POST', `/api/stores/lessari/affiliates/${joao.id}/resume`, owner);

      await call('PUT', '/api/stores/lessari/affiliate-program', owner, { ...PROGRAM_ON, enabled: false });
      await place(visitOf(joao.id));
      await call('PUT', '/api/stores/lessari/affiliate-program', owner, PROGRAM_ON);

      await programOn('vizinha', stranger);
      const delas = await affiliate('delas', newEmail('delas'), 'vizinha', stranger);
      await place(visitOf(delas.id));

      expect(await prisma.order.count({ where: { affiliateId: { not: null } } })).toBe(0);
      expect(await place(visitOf(joao.id))).toBeDefined();
      expect(await prisma.order.count({ where: { affiliateId: joao.id } })).toBe(1);
    });

    it('owes nothing, says why and tells nobody when the affiliate bought it themselves', async () => {
      const bia = await affiliate('bia', shopperEmail);
      const byEmail = await place(visitOf(bia.id));

      expect(await commissionOf(byEmail.id)).toMatchObject({ commissionCents: 0, zeroReason: 'OWN_PURCHASE', baseCents: 15_000 });
      expect(await prisma.affiliateSaleNotice.count()).toBe(0);

      // The same phone on both records is the same person too.
      await prisma.affiliate.update({ where: { id: joao.id }, data: { phone: '5511977776666' } });
      await prisma.customer.updateMany({ where: { name: 'Bia Souza' }, data: { phone: '5511977776666' } });
      const byPhone = await place(visitOf(joao.id));
      expect(await commissionOf(byPhone.id)).toMatchObject({ commissionCents: 0, zeroReason: 'OWN_PURCHASE' });
      await expectBooksToHold(bia.id);

      // And the same CPF (the user's review, 12/11/2026), whatever the phone and the e-mail say.
      const maria = await affiliate('maria', newEmail('maria'));
      await prisma.affiliate.update({ where: { id: maria.id }, data: { cpf: '52998224725' } });
      await prisma.customer.updateMany({ where: { name: 'Bia Souza' }, data: { phone: '5511900000000', cpf: '52998224725' } });
      const byCpf = await place(visitOf(maria.id));
      expect(await commissionOf(byCpf.id)).toMatchObject({ commissionCents: 0, zeroReason: 'OWN_PURCHASE' });
    });
  });

  describe('delivered, and then due', () => {
    const dueToday = () => payoutPeriodOf(brasiliaDayOf(new Date()), PROGRAM_ON.payoutDelayDays).dueOn;

    it("is due on the payout period's due day of the delivery, and falls due on its opening", async () => {
      const order = await place(visitOf(joao.id));
      await move(order.number, 'DELIVERED');

      const dated = await commissionOf(order.id);
      expect(dated?.status).toBe('PENDING');
      expect(dayOfDateColumn(dated!.dueOn!)).toBe(dueToday());

      const opening = openOfBrasiliaDay(dueToday());
      expect(await sweeper.sweep(new Date(opening.getTime() - 1))).toBe(0);
      expect(await sweeper.sweep(opening)).toBe(1);
      // A second sweep, or a second process, finds nothing left to release.
      expect(await sweeper.sweep(opening)).toBe(0);

      expect(await commissionOf(order.id)).toMatchObject({ status: 'AVAILABLE', availableAt: opening });
      expect(await entriesOf(joao.id)).toEqual([{ kind: 'RELEASED', amountCents: 2250 }]);
      expect(await expectBooksToHold(joao.id)).toMatchObject({ pendingCents: 0, availableCents: 2250 });
    });

    it('dates it by the delay the programme has on the day of the delivery', async () => {
      const order = await place(visitOf(joao.id));
      await call('PUT', '/api/stores/lessari/affiliate-program', owner, { ...PROGRAM_ON, payoutDelayDays: 0 });
      await move(order.number, 'DELIVERED');

      expect(dayOfDateColumn((await commissionOf(order.id))!.dueOn!)).toBe(payoutPeriodOf(brasiliaDayOf(new Date()), 0).dueOn);
    });

    it('waits again, with no due day, when the order leaves delivered before it falls due — and a new delivery dates it anew', async () => {
      const order = await place(visitOf(joao.id));
      await move(order.number, 'DELIVERED');
      await move(order.number, 'OUT_FOR_DELIVERY');

      expect(await commissionOf(order.id)).toMatchObject({ status: 'PENDING', dueOn: null });
      expect(await entriesOf(joao.id)).toEqual([]);

      await move(order.number, 'DELIVERED');
      expect(dayOfDateColumn((await commissionOf(order.id))!.dueOn!)).toBe(dueToday());
    });

    it('is taken back by a line of its own when the order leaves delivered after it fell due', async () => {
      const order = await place(visitOf(joao.id));
      await move(order.number, 'DELIVERED');
      await sweeper.sweep(openOfBrasiliaDay(dueToday()));
      await move(order.number, 'OUT_FOR_DELIVERY');

      expect(await commissionOf(order.id)).toMatchObject({ status: 'PENDING', dueOn: null, availableAt: null });
      expect(await entriesOf(joao.id)).toEqual([
        { kind: 'RELEASED', amountCents: 2250 },
        { kind: 'REVERSED', amountCents: -2250 },
      ]);
      expect(await expectBooksToHold(joao.id)).toMatchObject({ pendingCents: 2250, availableCents: 0 });
    });
  });

  describe('cancelled', () => {
    it('is undone for good before it fell due, with nothing on the statement, and the affiliate is told', async () => {
      const order = await place(visitOf(joao.id));
      await move(order.number, 'CANCELLED');

      expect(await commissionOf(order.id)).toMatchObject({ status: 'REVERSED', dueOn: null });
      expect(await entriesOf(joao.id)).toEqual([]);
      expect(await expectBooksToHold(joao.id)).toMatchObject({ pendingCents: 0, availableCents: 0 });

      await mailer.flush();
      expect((await waitForMessage(joao.email, 10_000, 'cancelado')).Text).toContain('não será paga');
    });

    it('takes back what fell due by a line of its own, and says it comes off the next payment', async () => {
      const order = await place(visitOf(joao.id));
      await move(order.number, 'DELIVERED');
      await sweeper.sweep(openOfBrasiliaDay(payoutPeriodOf(brasiliaDayOf(new Date()), 10).dueOn));
      await move(order.number, 'CANCELLED');

      expect(await commissionOf(order.id)).toMatchObject({ status: 'REVERSED', availableAt: null });
      expect(await entriesOf(joao.id)).toEqual([
        { kind: 'RELEASED', amountCents: 2250 },
        { kind: 'REVERSED', amountCents: -2250 },
      ]);
      await expectBooksToHold(joao.id);

      await mailer.flush();
      expect((await waitForMessage(joao.email, 10_000, 'cancelado')).Text).toContain('descontada do próximo pagamento');
    });

    it("is undone when the customer cancels their own order, and an own purchase's cancellation tells nobody", async () => {
      const order = await place(visitOf(joao.id));
      expect((await call('POST', `/api/stores/lessari/customer/orders/${order.number}/cancel`, shopper)).statusCode).toBe(200);
      expect(await commissionOf(order.id)).toMatchObject({ status: 'REVERSED' });

      const bia = await affiliate('bia', shopperEmail);
      const own = await place(visitOf(bia.id));
      await move(own.number, 'CANCELLED');
      expect(await prisma.affiliateSaleNotice.count({ where: { orderId: own.id } })).toBe(0);
    });
  });
});
