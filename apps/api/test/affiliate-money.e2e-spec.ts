// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AffiliateOwed,
  AffiliateProgramOverview,
  AffiliateStatement,
  ApiErrorBody,
  AuthSession,
  CustomerOrder,
  Order,
  OrderAffiliate,
  OrderPage,
  Product,
  ShopAffiliate,
} from '@harness-monorepo/contracts';

// App
import { AffiliateCommissionSweeper } from '../src/modules/affiliates/affiliate-commission-sweeper.js';
import { AffiliateSaleMailer } from '../src/modules/affiliates/affiliate-sale-mailer.js';
import { brasiliaDayOf, daysAfter, dateColumnOf, dayOfDateColumn, openOfBrasiliaDay } from '../src/modules/billing/billing-dates.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { affiliateDocumentFor, affiliateIdentity } from './support/affiliate-identity.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const MISSING = '0199a1b2-0000-7000-8000-000000000000';
const PROGRAM_ON = { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null };

describe("the shop's money with its affiliates: an order's affiliate, the statement, payouts and what is owed (IMPULSEIA-107)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let sweeper: AffiliateCommissionSweeper;
  let mailer: AffiliateSaleMailer;
  let owner: AuthSession;
  let stranger: AuthSession;
  let shopper: AuthSession;
  let whey: string;
  let joao: ShopAffiliate;
  let maria: ShopAffiliate;

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
    await call('PUT', '/api/stores/lessari/affiliate-program', owner, PROGRAM_ON);
    joao = await affiliate('joao', 'João Silva');
    maria = await affiliate('maria', 'Maria Souza');

    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Souza', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;

  async function variantOf(name: string, priceCents: number): Promise<string> {
    const product = (await call('POST', '/api/stores/lessari/products', owner, { name, priceCents })).json<Product>();
    return (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  }

  /** An affiliate through the real door: invited by the shop, signed up by the invite's link. */
  async function affiliate(slug: string, name: string): Promise<ShopAffiliate> {
    const email = newEmail(slug);
    const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
    const invited = await call('POST', '/api/stores/lessari/affiliates', owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, '/api/stores/lessari/affiliates'), name, email, tableId });
    const token = tokenFromLink((await waitForMessage(email.toLowerCase(), 10_000, 'convidou você')).Text, '/afiliado/convite');
    const accepted = await call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name, password: PASSWORD, slug, pixKey: `${slug}@pix.test`, termsVersion: 0 });
    if (accepted.statusCode !== 201) throw new Error(`sign-up answered ${accepted.statusCode}: ${accepted.payload}`);
    return invited.json<ShopAffiliate>();
  }

  /** The shopper's order of one whey — R$ 100,00, 10% on the default table — after following a link. */
  async function place(affiliateId?: string): Promise<CustomerOrder> {
    const affiliateVisit = affiliateId ? { affiliateId, visitedAt: new Date(Date.now() - DAY).toISOString() } : undefined;
    const response = await call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', ...(affiliateVisit ? { affiliateVisit } : {}) });
    if (response.statusCode !== 201) throw new Error(`POST customer/orders answered ${response.statusCode}: ${response.payload}`);
    return response.json<CustomerOrder>();
  }

  const register = (affiliateId?: string | null) =>
    call('POST', '/api/stores/lessari/orders', owner, { customer: { name: 'Carla Dias', phone: '(11) 98888-7777' }, items: [{ variantId: whey, quantity: 2 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', ...(affiliateId !== undefined ? { affiliateId } : {}) });
  const move = (number: number, status: string) => call('PATCH', `/api/stores/lessari/orders/${number}/status`, owner, { status });
  const readAffiliate = (number: number, session = owner) => call('GET', `/api/stores/lessari/orders/${number}/affiliate`, session);
  const change = (number: number, affiliateId: string | null, reason = 'Cliente veio pela Maria', session = owner) => call('PUT', `/api/stores/lessari/orders/${number}/affiliate`, session, { affiliateId, reason });
  const statementOf = (affiliateId: string) => call('GET', `/api/stores/lessari/affiliates/${affiliateId}/statement`, owner).then((response) => response.json<AffiliateStatement>());
  const adjust = (affiliateId: string, amountCents: number, reason = 'Produto devolvido depois do pagamento') => call('POST', `/api/stores/lessari/affiliates/${affiliateId}/adjustments`, owner, { amountCents, reason });
  const pay = (affiliateId: string, payload: object) => call('POST', `/api/stores/lessari/affiliates/${affiliateId}/payouts`, owner, { paidOn: brasiliaDayOf(new Date()), method: 'PIX', note: null, ...payload });

  /** Delivered, and swept on its due day: the commission is available. */
  async function deliverAndRelease(number: number, orderId: string): Promise<void> {
    await move(number, 'DELIVERED');
    const { dueOn } = await prisma.affiliateCommission.findUniqueOrThrow({ where: { orderId } });
    await sweeper.sweep(openOfBrasiliaDay(dayOfDateColumn(dueOn!)));
  }

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

  describe("an order's affiliate", () => {
    it('reads whom it is credited to, and its commission waiting on the delivery', async () => {
      const order = await place(joao.id);

      const read = await readAffiliate(order.number);
      expect(read.statusCode).toBe(200);
      expect(read.json<OrderAffiliate>()).toEqual({
        affiliate: { id: joao.id, name: 'João Silva', slug: 'joao', status: 'ACTIVE' },
        commission: { status: 'PENDING', baseCents: 10_000, commissionCents: 1000, tableName: 'Padrão', zeroReason: null, dueOn: null, availableAt: null },
        changes: [],
        refundedCents: 0,
        changeable: true,
      });
      expect((await readAffiliate((await place()).number)).json<OrderAffiliate>()).toMatchObject({ affiliate: null, commission: null, changeable: true });
    });

    it('moves a pending commission to another affiliate, worked out again, and keeps the change with its reason', async () => {
      const order = await place(joao.id);
      await mailer.flush();
      await clearInbox();

      const moved = await change(order.number, maria.id);
      expect(moved.statusCode).toBe(200);
      const read = moved.json<OrderAffiliate>();
      expect(read.affiliate).toMatchObject({ id: maria.id, name: 'Maria Souza' });
      expect(read.commission).toMatchObject({ status: 'PENDING', commissionCents: 1000 });
      expect(read.changes).toEqual([{ from: { id: joao.id, name: 'João Silva' }, to: { id: maria.id, name: 'Maria Souza' }, reason: 'Cliente veio pela Maria', at: expect.any(String) }]);
      expect((await expectBooksToHold(joao.id)).pendingCents).toBe(0);
      expect((await expectBooksToHold(maria.id)).pendingCents).toBe(1000);

      // The sale's e-mail is owed again, to whom it is credited now.
      await mailer.flush();
      const row = await prisma.affiliate.findUniqueOrThrow({ where: { id: maria.id }, select: { email: true } });
      expect((await waitForMessage(row.email, 10_000, 'venda')).Subject).toContain(`nº ${order.number}`);
    });

    it('takes an order off its affiliate, and credits one that had none — dated by its delivery when delivered', async () => {
      const order = await place(joao.id);
      const off = (await change(order.number, null, 'Venda da própria loja')).json<OrderAffiliate>();
      expect(off).toMatchObject({ affiliate: null, commission: null, changes: [{ from: { name: 'João Silva' }, to: null }] });
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).affiliateId).toBeNull();
      expect((await expectBooksToHold(joao.id)).pendingCents).toBe(0);

      const other = await place();
      await move(other.number, 'DELIVERED');
      const credited = (await change(other.number, maria.id)).json<OrderAffiliate>();
      expect(credited.commission).toMatchObject({ status: 'PENDING', commissionCents: 1000 });
      expect(credited.commission!.dueOn).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
      expect(credited.commission!.dueOn! > brasiliaDayOf(new Date())).toBe(true);
    });

    it('changes nothing for the affiliate it already has', async () => {
      const order = await place(joao.id);

      expect((await change(order.number, joao.id)).json<OrderAffiliate>().changes).toEqual([]);
    });

    it('refuses once the commission fell due — a correction is an adjustment — and on a cancelled order', async () => {
      const order = await place(joao.id);
      await deliverAndRelease(order.number, order.id);
      const due = await change(order.number, maria.id);
      expect(due.statusCode).toBe(409);
      expect(due.json<ApiErrorBody & { details: object }>()).toMatchObject({ errorCode: 'AFFILIATE_COMMISSION_NOT_PENDING', details: { status: 'AVAILABLE' } });
      expect((await readAffiliate(order.number)).json<OrderAffiliate>().changeable).toBe(false);

      const cancelled = await place(joao.id);
      await move(cancelled.number, 'CANCELLED');
      expect(errorOf(await change(cancelled.number, maria.id))).toBe('ORDER_CANCELLED');
    });

    it('refuses an affiliate who cannot be credited: paused, another shop\'s, or with the programme off', async () => {
      const order = await place(joao.id);
      await call('POST', `/api/stores/lessari/affiliates/${maria.id}/pause`, owner);
      const paused = await change(order.number, maria.id);
      expect(paused.statusCode).toBe(409);
      expect(paused.json<ApiErrorBody & { details: object }>()).toMatchObject({ errorCode: 'AFFILIATE_STATUS_INVALID', details: { status: 'PAUSED' } });
      expect(errorOf(await change(order.number, MISSING))).toBe('AFFILIATE_NOT_FOUND');

      await call('PUT', '/api/stores/lessari/affiliate-program', owner, { ...PROGRAM_ON, enabled: false });
      await call('POST', `/api/stores/lessari/affiliates/${maria.id}/resume`, owner);
      expect(errorOf(await change(order.number, maria.id))).toBe('AFFILIATE_ATTRIBUTION_CLOSED');
      // Taking it off asks nothing of the programme.
      expect((await change(order.number, null)).statusCode).toBe(200);
    });

    it('refuses a change with no reason, an order that is not there, and anyone but the owner', async () => {
      const order = await place(joao.id);

      for (const reason of ['', '  ', 'a'.repeat(201)]) expect(errorOf(await change(order.number, maria.id, reason))).toBe('AFFILIATE_ORDER_CHANGE_INVALID');
      expect(errorOf(await call('PUT', `/api/stores/lessari/orders/${order.number}/affiliate`, owner, { reason: 'Sem afiliado escrito' }))).toBe('AFFILIATE_ORDER_CHANGE_INVALID');
      expect(errorOf(await change(9999, maria.id))).toBe('ORDER_NOT_FOUND');
      expect((await readAffiliate(order.number, stranger)).statusCode).toBe(403);
      expect((await change(order.number, maria.id, 'Tentativa alheia', stranger)).statusCode).toBe(403);
    });

    it('says how much of the order was given back, which the commission did not follow by itself', async () => {
      const order = await place(joao.id);
      const storeId = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).storeId;
      // Money given back as Asaas tells it (BEELINK-208): one refund done, one still asked, which is not money back yet.
      await prisma.orderRefund.create({ data: { orderId: order.id, storeId, providerId: 'pay_1', amountCents: 3000, status: 'DONE', origin: 'ASAAS' } });
      await prisma.orderRefund.create({ data: { orderId: order.id, storeId, providerId: 'pay_2', amountCents: 900, status: 'REQUESTED', origin: 'ASAAS' } });

      const read = (await readAffiliate(order.number)).json<OrderAffiliate>();
      expect(read.refundedCents).toBe(3000);
      expect(read.commission!.commissionCents).toBe(1000);
    });
  });

  describe('a sale registered in the panel', () => {
    it('is credited to the affiliate the shopkeeper chose, at their table', async () => {
      const sale = await register(maria.id);

      expect(sale.statusCode).toBe(201);
      const order = sale.json<Order>();
      expect((await readAffiliate(order.number)).json<OrderAffiliate>()).toMatchObject({ affiliate: { id: maria.id }, commission: { commissionCents: 2000, status: 'PENDING' } });
      expect(await prisma.affiliateSaleNotice.count({ where: { orderId: order.id, kind: 'SALE' } })).toBe(1);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).affiliateVisitAt).toBeNull();
    });

    it('is refused aloud for an affiliate who cannot be credited, and registers nothing', async () => {
      await call('POST', `/api/stores/lessari/affiliates/${maria.id}/pause`, owner);
      expect(errorOf(await register(maria.id))).toBe('AFFILIATE_STATUS_INVALID');
      expect(errorOf(await register(MISSING))).toBe('AFFILIATE_NOT_FOUND');
      await call('PUT', '/api/stores/lessari/affiliate-program', owner, { ...PROGRAM_ON, enabled: false });
      expect(errorOf(await register(joao.id))).toBe('AFFILIATE_ATTRIBUTION_CLOSED');
      expect(await prisma.order.count()).toBe(0);

      expect((await register(null)).statusCode).toBe(201);
    });
  });

  it("filters the shop's orders by affiliate", async () => {
    const [first] = [await place(joao.id), await place(maria.id), await place()];

    const page = (await call('GET', `/api/stores/lessari/orders?affiliateId=${joao.id}`, owner)).json<OrderPage>();
    expect(page.orders.map((order) => order.number)).toEqual([first!.number]);
    expect((await call('GET', `/api/stores/lessari/orders?affiliateId=${MISSING}`, owner)).json<OrderPage>().total).toBe(0);
  });

  describe("an affiliate's statement", () => {
    it('reads what fell due, takes an adjustment with its reason and a payout made outside, and the books hold', async () => {
      const order = await place(joao.id);
      await deliverAndRelease(order.number, order.id);
      expect(await statementOf(joao.id)).toMatchObject({ pendingCents: 0, availableCents: 1000, total: 1, entries: [{ kind: 'RELEASED', amountCents: 1000, orderNumber: order.number, reason: null, payout: null }] });

      const adjusted = await adjust(joao.id, -250);
      expect(adjusted.statusCode).toBe(201);
      expect(adjusted.json<AffiliateStatement>()).toMatchObject({ availableCents: 750, total: 2 });
      expect(adjusted.json<AffiliateStatement>().entries[0]).toMatchObject({ kind: 'ADJUSTED', amountCents: -250, reason: 'Produto devolvido depois do pagamento' });

      const paidOn = daysAfter(brasiliaDayOf(new Date()), -1);
      const paid = await pay(joao.id, { amountCents: 750, paidOn, method: 'TRANSFER', note: '  TED  ' });
      expect(paid.statusCode).toBe(201);
      expect(paid.json<AffiliateStatement>()).toMatchObject({ availableCents: 0, total: 3 });
      expect(paid.json<AffiliateStatement>().entries[0]).toMatchObject({ kind: 'PAID_OUT', amountCents: -750, payout: { paidOn, method: 'TRANSFER', note: 'TED' } });
      const entry = await prisma.affiliateEntry.findFirstOrThrow({ where: { kind: 'PAID_OUT' } });
      expect(entry.actorId).toBe(owner.user.id);
      await expectBooksToHold(joao.id);
    });

    it('refuses a payout past what is available — an advance is an adjustment — or dated in the future', async () => {
      const order = await place(joao.id);
      await deliverAndRelease(order.number, order.id);

      const over = await pay(joao.id, { amountCents: 1001 });
      expect(over.statusCode).toBe(409);
      expect(over.json<ApiErrorBody & { details: object }>()).toMatchObject({ errorCode: 'AFFILIATE_PAYOUT_EXCEEDS_BALANCE', details: { availableCents: 1000 } });
      expect(errorOf(await pay(joao.id, { amountCents: 100, paidOn: daysAfter(brasiliaDayOf(new Date()), 1) }))).toBe('AFFILIATE_PAYOUT_INVALID');
      for (const change of [{ paidOn: '2026-02-30' }, { amountCents: 0 }, { method: 'BOLETO' }, { note: 'a'.repeat(201) }]) {
        expect(errorOf(await pay(joao.id, { amountCents: 100, ...change }))).toBe('AFFILIATE_PAYOUT_INVALID');
      }
      expect(await prisma.affiliatePayout.count()).toBe(0);
    });

    it('refuses an adjustment of nothing or with no reason, and books for someone still invited', async () => {
      for (const [amountCents, reason] of [[0, 'Sem valor'], [100, ' '], [100_000_001, 'Demais']] as const) {
        expect(errorOf(await adjust(joao.id, amountCents, reason))).toBe('AFFILIATE_ADJUSTMENT_INVALID');
      }
      const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
      const invited = (await call('POST', '/api/stores/lessari/affiliates', owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, '/api/stores/lessari/affiliates'), name: 'Ainda Convidada', email: newEmail('convidada'), tableId })).json<ShopAffiliate>();
      expect(errorOf(await adjust(invited.id, 100))).toBe('AFFILIATE_STATUS_INVALID');
      expect(errorOf(await call('GET', `/api/stores/lessari/affiliates/${MISSING}/statement`, owner))).toBe('AFFILIATE_NOT_FOUND');
    });

    it('lets the balance go below zero, which the next payout is short by', async () => {
      expect((await adjust(joao.id, -500)).json<AffiliateStatement>().availableCents).toBe(-500);
      expect(errorOf(await pay(joao.id, { amountCents: 1 }))).toBe('AFFILIATE_PAYOUT_EXCEEDS_BALANCE');
    });
  });

  it('owes by due day: overdue, still to come and waiting on the delivery, each affiliate with their Pix key', async () => {
    const today = brasiliaDayOf(new Date());
    const due = await place(joao.id);
    await deliverAndRelease(due.number, due.id);
    // Fallen due ten days ago and still unpaid.
    await prisma.affiliateCommission.update({ where: { orderId: due.id }, data: { dueOn: dateColumnOf(daysAfter(today, -10)) } });
    const delivered = await place(maria.id);
    await move(delivered.number, 'DELIVERED');
    await place(maria.id);

    const owed = (await call('GET', '/api/stores/lessari/affiliate-program/owed', owner)).json<AffiliateOwed>();
    expect(owed).toMatchObject({ today, owedCents: 1000, undatedCents: 0, awaitingDeliveryCents: 1000 });
    expect(owed.due).toEqual([{ dueOn: daysAfter(today, -10), amountCents: 1000, affiliateCount: 1, state: 'OVERDUE' }]);
    expect(owed.upcoming).toEqual([{ dueOn: expect.any(String), amountCents: 1000, affiliateCount: 1, state: 'UPCOMING' }]);
    expect(owed.affiliates).toEqual([
      { affiliate: { id: joao.id, name: 'João Silva', slug: 'joao', status: 'ACTIVE', pixKey: 'joao@pix.test' }, availableCents: 1000, pendingCents: 0, oldestDueOn: daysAfter(today, -10), overdue: true },
      { affiliate: expect.objectContaining({ id: maria.id }), availableCents: 0, pendingCents: 2000, oldestDueOn: null, overdue: false },
    ]);
    expect((await call('GET', '/api/stores/lessari/affiliate-program/owed', stranger)).statusCode).toBe(403);
  });

  it("takes the affiliate's photo and phrase off the shop window", async () => {
    await prisma.affiliate.update({ where: { id: maria.id }, data: { photoUrl: 'https://cdn.test/maria.jpg', tagline: 'Meus favoritos' } });

    const noPhoto = await call('DELETE', `/api/stores/lessari/affiliates/${maria.id}/photo`, owner);
    expect(noPhoto.statusCode).toBe(200);
    expect(noPhoto.json<ShopAffiliate>()).toMatchObject({ photoUrl: null, tagline: 'Meus favoritos' });
    expect((await call('DELETE', `/api/stores/lessari/affiliates/${maria.id}/tagline`, owner)).json<ShopAffiliate>()).toMatchObject({ photoUrl: null, tagline: null });
    expect((await call('DELETE', `/api/stores/lessari/affiliates/${maria.id}/photo`, stranger)).statusCode).toBe(403);
  });

  it('tells the panel whether orders are credited here yet', async () => {
    expect((await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().linksLive).toBe(true);
  });
});
