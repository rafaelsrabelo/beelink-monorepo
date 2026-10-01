// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  Coupon,
  CouponPage,
  CouponRedemptionPage,
  CouponStatus,
  Order,
  Product,
  ProductCategory,
  Promotion,
  PromotionPage,
  PromotionStatus,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const MISSING = '0199a1b2-0000-7000-8000-000000000000';

describe("a shop's promotions and coupons", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let whey: Product;
  let creatine: Product;
  let proteins: ProductCategory;

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
    for (const slug of ['lessari', 'outra']) await call('POST', '/api/stores', owner, shopBody(slug));
    whey = await made<Product>('products', { name: 'Whey', priceCents: 18990 });
    creatine = await made<Product>('products', { name: 'Creatina', priceCents: 5990 });
    proteins = await made<ProductCategory>('product-categories', { name: 'Proteínas' });
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function made<T>(path: string, body: object, shop = 'lessari'): Promise<T> {
    const response = await call('POST', `/api/stores/${shop}/${path}`, owner, body);
    if (response.statusCode !== 201) throw new Error(`POST ${path} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  const promotionBody = (body: object = {}) => ({ name: 'Semana do Consumidor', scope: 'CART', discountKind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), ...body });
  const couponBody = (body: object = {}) => ({ code: 'BEMVINDO10', kind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), ...body });
  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;

  describe('promotions', () => {
    it('keeps a promotion over the cart, over products and over categories, each with what it names', async () => {
      const cart = await call('POST', '/api/stores/lessari/promotions', owner, promotionBody({ name: '  Semana do Consumidor  ', endsAt: daysFromNow(7) }));
      expect(cart.statusCode).toBe(201);
      expect(cart.json<Promotion>()).toMatchObject({
        name: 'Semana do Consumidor',
        scope: 'CART',
        discountKind: 'PERCENT',
        percentBps: 1000,
        amountCents: null,
        active: true,
        status: 'ACTIVE',
        audience: 'EVERYONE',
        products: [],
        categories: [],
      });

      const products = await made<Promotion>('promotions', promotionBody({ scope: 'PRODUCTS', discountKind: 'FIXED', percentBps: null, amountCents: 500, productIds: [whey.id, creatine.id, whey.id.toUpperCase()] }));
      expect(products).toMatchObject({ discountKind: 'FIXED', percentBps: null, amountCents: 500, endsAt: null });
      expect(products.products).toEqual([
        { id: creatine.id, name: 'Creatina', slug: creatine.slug },
        { id: whey.id, name: 'Whey', slug: whey.slug },
      ]);

      const categories = await made<Promotion>('promotions', promotionBody({ scope: 'CATEGORIES', categoryIds: [proteins.id] }));
      expect(categories.categories).toEqual([{ id: proteins.id, name: 'Proteínas', slug: proteins.slug }]);

      const read = await call('GET', `/api/stores/lessari/promotions/${products.id}`, owner);
      expect(read.json<Promotion>()).toEqual(products);
    });

    it('lists the newest first and by where each stands, with the count of every status', async () => {
      const bodies: Record<PromotionStatus, object> = {
        ENDED: { name: 'Encerrada', startsAt: daysFromNow(-10), endsAt: daysFromNow(-1) },
        PAUSED: { name: 'Pausada', active: false },
        SCHEDULED: { name: 'Agendada', startsAt: daysFromNow(2), endsAt: daysFromNow(5) },
        ACTIVE: { name: 'Ativa', endsAt: daysFromNow(5) },
      };
      for (const body of Object.values(bodies)) await made<Promotion>('promotions', promotionBody(body));
      // Over and switched off as well: it reads ended, since switching it on would not make it count.
      await made<Promotion>('promotions', promotionBody({ name: 'Encerrada e pausada', startsAt: daysFromNow(-10), endsAt: daysFromNow(-1), active: false }));
      await made<Promotion>('promotions', promotionBody({ name: 'Da outra loja' }), 'outra');

      const all = (await call('GET', '/api/stores/lessari/promotions', owner)).json<PromotionPage>();
      expect(all.promotions.map((promotion) => [promotion.name, promotion.status])).toEqual([
        ['Encerrada e pausada', 'ENDED'],
        ['Ativa', 'ACTIVE'],
        ['Agendada', 'SCHEDULED'],
        ['Pausada', 'PAUSED'],
        ['Encerrada', 'ENDED'],
      ]);
      expect(all).toMatchObject({ total: 5, page: 1, pageSize: 20, counts: { ALL: 5, ENDED: 2, PAUSED: 1, SCHEDULED: 1, ACTIVE: 1 } });

      // The filter's rule and the row's are one: every status finds exactly the rows that read it.
      for (const status of ['ENDED', 'PAUSED', 'SCHEDULED', 'ACTIVE'] as const) {
        const page = (await call('GET', `/api/stores/lessari/promotions?status=${status}`, owner)).json<PromotionPage>();
        expect(page.promotions.map((promotion) => promotion.status), status).toEqual(Array.from({ length: all.counts[status] }, () => status));
        expect(page.total, status).toBe(all.counts[status]);
        expect(page.counts, status).toEqual(all.counts);
      }

      const second = (await call('GET', '/api/stores/lessari/promotions?page=2&pageSize=2', owner)).json<PromotionPage>();
      expect(second.promotions.map((promotion) => promotion.name)).toEqual(['Agendada', 'Pausada']);
      expect(second).toMatchObject({ total: 5, page: 2, pageSize: 2 });
    });

    it('replaces a promotion whole, pauses and resumes it, and narrows when a product it names is deleted', async () => {
      const promotion = await made<Promotion>('promotions', promotionBody({ scope: 'PRODUCTS', productIds: [whey.id, creatine.id], endsAt: daysFromNow(7) }));

      const replaced = await call('PUT', `/api/stores/lessari/promotions/${promotion.id}`, owner, promotionBody({ name: 'Proteínas em oferta', scope: 'CATEGORIES', discountKind: 'FIXED', percentBps: null, amountCents: 1500, categoryIds: [proteins.id] }));
      expect(replaced.statusCode).toBe(200);
      // The end the body left out is cleared, and the products gave way to the category.
      expect(replaced.json<Promotion>()).toMatchObject({ name: 'Proteínas em oferta', scope: 'CATEGORIES', discountKind: 'FIXED', percentBps: null, amountCents: 1500, endsAt: null, products: [], categories: [{ id: proteins.id }] });

      const paused = await call('PATCH', `/api/stores/lessari/promotions/${promotion.id}`, owner, { active: false });
      expect(paused.json<Promotion>()).toMatchObject({ active: false, status: 'PAUSED', name: 'Proteínas em oferta' });
      // A form saved without the switch leaves it paused; one that sends it is obeyed.
      const renamed = await call('PUT', `/api/stores/lessari/promotions/${promotion.id}`, owner, promotionBody({ name: 'Ainda pausada' }));
      expect(renamed.json<Promotion>()).toMatchObject({ name: 'Ainda pausada', active: false, status: 'PAUSED' });
      expect((await call('PUT', `/api/stores/lessari/promotions/${promotion.id}`, owner, promotionBody({ active: true }))).json<Promotion>()).toMatchObject({ active: true });
      await call('PATCH', `/api/stores/lessari/promotions/${promotion.id}`, owner, { active: false });
      const resumed = await call('PATCH', `/api/stores/lessari/promotions/${promotion.id}`, owner, { active: true });
      expect(resumed.json<Promotion>()).toMatchObject({ active: true, status: 'ACTIVE' });

      const back = await call('PUT', `/api/stores/lessari/promotions/${promotion.id}`, owner, promotionBody({ scope: 'PRODUCTS', productIds: [whey.id, creatine.id] }));
      expect(back.json<Promotion>().products).toHaveLength(2);
      await prisma.product.delete({ where: { id: whey.id } });
      const narrowed = (await call('GET', `/api/stores/lessari/promotions/${promotion.id}`, owner)).json<Promotion>();
      expect(narrowed.products.map((product) => product.name)).toEqual(['Creatina']);
    });

    it('keeps who a promotion is for — everyone unless said — and a replacement that leaves it out is for everyone again', async () => {
      const welcome = await made<Promotion>('promotions', promotionBody({ name: 'Primeira compra', audience: 'FIRST_PURCHASE' }));
      expect(welcome.audience).toBe('FIRST_PURCHASE');
      await made<Promotion>('promotions', promotionBody());

      const all = (await call('GET', '/api/stores/lessari/promotions', owner)).json<PromotionPage>();
      expect(all.promotions.map((promotion) => [promotion.name, promotion.audience])).toEqual([
        ['Semana do Consumidor', 'EVERYONE'],
        ['Primeira compra', 'FIRST_PURCHASE'],
      ]);

      // Pausing is not a replacement: it leaves the audience where it was.
      const url = `/api/stores/lessari/promotions/${welcome.id}`;
      expect((await call('PATCH', url, owner, { active: false })).json<Promotion>()).toMatchObject({ active: false, audience: 'FIRST_PURCHASE' });
      expect((await call('PUT', url, owner, promotionBody({ name: 'Boas-vindas', audience: 'FIRST_PURCHASE' }))).json<Promotion>()).toMatchObject({ name: 'Boas-vindas', audience: 'FIRST_PURCHASE' });
      // A form saved without it clears it, as every optional key but the switch.
      expect((await call('PUT', url, owner, promotionBody())).json<Promotion>()).toMatchObject({ active: false, audience: 'EVERYONE' });
      expect((await call('GET', url, owner)).json<Promotion>().audience).toBe('EVERYONE');

      // Null is not "everyone": a form that sends it believes it said something.
      for (const audience of ['RETURNING', 'first_purchase', '', null, 1]) {
        expect((await call('POST', '/api/stores/lessari/promotions', owner, promotionBody({ audience }))).statusCode, String(audience)).toBe(400);
        expect((await call('PUT', url, owner, promotionBody({ audience }))).statusCode, String(audience)).toBe(400);
      }
      expect(await prisma.promotion.count()).toBe(2);
    });

    it('refuses a value that does not match its kind, a period that ends before it starts and lists that do not match the scope', async () => {
      const refused = async (body: object) => {
        const response = await call('POST', '/api/stores/lessari/promotions', owner, promotionBody(body));
        return [response.statusCode, errorOf(response)];
      };

      expect(await refused({ percentBps: null })).toEqual([400, 'PROMOTION_DISCOUNT_INVALID']);
      expect(await refused({ amountCents: 500 })).toEqual([400, 'PROMOTION_DISCOUNT_INVALID']);
      expect(await refused({ discountKind: 'FIXED' })).toEqual([400, 'PROMOTION_DISCOUNT_INVALID']);
      expect(await refused({ percentBps: 10001 })).toEqual([400, 'PROMOTION_DISCOUNT_INVALID']);
      expect(await refused({ percentBps: 0 })).toEqual([400, 'PROMOTION_DISCOUNT_INVALID']);
      expect(await refused({ percentBps: 12.5 })).toEqual([400, 'PROMOTION_DISCOUNT_INVALID']);
      expect(await refused({ discountKind: 'FIXED', percentBps: null, amountCents: 0 })).toEqual([400, 'PROMOTION_DISCOUNT_INVALID']);
      // A coupon's kind, not a promotion's.
      expect((await refused({ discountKind: 'FREE_SHIPPING', percentBps: null }))[0]).toBe(400);

      expect(await refused({ endsAt: daysFromNow(-2) })).toEqual([400, 'PROMOTION_PERIOD_INVALID']);
      expect(await refused({ startsAt: '2200-01-01T00:00:00.000Z' })).toEqual([400, 'PROMOTION_PERIOD_INVALID']);
      // Only an ISO-8601 instant with its offset: anything else is a guess at what was meant.
      for (const startsAt of ['amanhã', '10/05/2026', '2026-02-31T00:00:00Z', '2026-10-05T10:00', '2026-10-05', '5', 1790000000000, true, null]) {
        expect(await refused({ startsAt }), String(startsAt)).toEqual([400, 'PROMOTION_PERIOD_INVALID']);
      }
      expect(await refused({ endsAt: 0 })).toEqual([400, 'PROMOTION_PERIOD_INVALID']);

      expect(await refused({ scope: 'PRODUCTS' })).toEqual([400, 'PROMOTION_TARGETS_INVALID']);
      expect(await refused({ scope: 'CATEGORIES', productIds: [whey.id] })).toEqual([400, 'PROMOTION_TARGETS_INVALID']);
      expect(await refused({ productIds: [whey.id] })).toEqual([400, 'PROMOTION_TARGETS_INVALID']);
      expect(await refused({ scope: 'PRODUCTS', productIds: ['whey'] })).toEqual([400, 'PROMOTION_TARGETS_INVALID']);

      expect((await refused({ name: '   ' }))[0]).toBe(400);
      expect((await refused({ name: 'x'.repeat(81) }))[0]).toBe(400);
      // Counted as the column counts: a heart is two code points, and the 81st would overflow it.
      expect((await refused({ name: `${'x'.repeat(79)}❤️` }))[0]).toBe(400);
      expect((await refused({ scope: 'SHOP' }))[0]).toBe(400);
      expect((await refused({ active: null }))[0]).toBe(400);
      expect(await prisma.promotion.count()).toBe(0);

      // What the API never writes, the database refuses from any writer: a kind with no value.
      const storeId = (await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } })).id;
      for (const discountKind of ['PERCENT', 'FIXED'] as const) {
        await expect(prisma.promotion.create({ data: { storeId, name: 'Sem valor', scope: 'CART', discountKind, startsAt: new Date() } })).rejects.toThrow();
      }
      expect(Array.from((await made<Promotion>('promotions', promotionBody({ name: `${'x'.repeat(78)}❤️` }))).name)).toHaveLength(80);
    });

    it('answers another shop’s product, category or promotion as one that is not there', async () => {
      const theirs = await made<Product>('products', { name: 'Da outra', priceCents: 1000 }, 'outra');
      const theirCategory = await made<ProductCategory>('product-categories', { name: 'Da outra' }, 'outra');
      const theirPromotion = await made<Promotion>('promotions', promotionBody(), 'outra');
      const mine = await made<Promotion>('promotions', promotionBody());

      for (const body of [{ scope: 'PRODUCTS', productIds: [whey.id, theirs.id] }, { scope: 'PRODUCTS', productIds: [MISSING] }, { scope: 'CATEGORIES', categoryIds: [theirCategory.id] }]) {
        const created = await call('POST', '/api/stores/lessari/promotions', owner, promotionBody(body));
        expect([created.statusCode, errorOf(created)]).toEqual([404, 'PROMOTION_TARGET_NOT_FOUND']);
        const replaced = await call('PUT', `/api/stores/lessari/promotions/${mine.id}`, owner, promotionBody(body));
        expect([replaced.statusCode, errorOf(replaced)]).toEqual([404, 'PROMOTION_TARGET_NOT_FOUND']);
      }
      // A refused replacement left it as it was.
      expect((await call('GET', `/api/stores/lessari/promotions/${mine.id}`, owner)).json<Promotion>()).toEqual(mine);

      for (const id of [theirPromotion.id, MISSING, 'nao-e-um-id']) {
        for (const [method, payload] of [['GET', undefined], ['PUT', promotionBody()], ['PATCH', { active: false }]] as const) {
          const response = await call(method, `/api/stores/lessari/promotions/${id}`, owner, payload);
          expect([response.statusCode, errorOf(response)], `${method} ${id}`).toEqual([404, 'PROMOTION_NOT_FOUND']);
        }
      }
      expect((await call('GET', `/api/stores/outra/promotions/${theirPromotion.id}`, owner)).json<Promotion>()).toMatchObject({ active: true });
    });
  });

  describe('coupons', () => {
    it('keeps a coupon by its code in upper case, one per shop whatever the case', async () => {
      const created = await call('POST', '/api/stores/lessari/coupons', owner, couponBody({ code: '  bemvindo10 ', minSubtotalCents: 5000, endsAt: daysFromNow(30), maxUses: 100, maxUsesPerCustomer: 1 }));
      expect(created.statusCode).toBe(201);
      const coupon = created.json<Coupon>();
      expect(coupon).toMatchObject({
        code: 'BEMVINDO10',
        kind: 'PERCENT',
        percentBps: 1000,
        amountCents: null,
        minSubtotalCents: 5000,
        maxUses: 100,
        maxUsesPerCustomer: 1,
        usedCount: 0,
        active: true,
        status: 'ACTIVE',
        audience: 'EVERYONE',
      });

      const again = await call('POST', '/api/stores/lessari/coupons', owner, couponBody({ code: 'BemVindo10' }));
      expect([again.statusCode, errorOf(again)]).toEqual([409, 'COUPON_CODE_TAKEN']);
      // Unique within its shop, and nowhere else.
      expect((await made<Coupon>('coupons', couponBody(), 'outra')).code).toBe('BEMVINDO10');

      const fixed = await made<Coupon>('coupons', couponBody({ code: 'menos-20', kind: 'FIXED', percentBps: null, amountCents: 2000 }));
      expect(fixed).toMatchObject({ code: 'MENOS-20', kind: 'FIXED', percentBps: null, amountCents: 2000, minSubtotalCents: 0, endsAt: null, maxUses: null, maxUsesPerCustomer: null });
      const shipping = await made<Coupon>('coupons', couponBody({ code: 'FRETE_GRATIS', kind: 'FREE_SHIPPING', percentBps: undefined }));
      expect(shipping).toMatchObject({ kind: 'FREE_SHIPPING', percentBps: null, amountCents: null });

      expect((await call('GET', `/api/stores/lessari/coupons/${coupon.id}`, owner)).json<Coupon>()).toEqual(coupon);
    });

    it('replaces a coupon whole, its code too, refuses a code another one has, and pauses and resumes it', async () => {
      const coupon = await made<Coupon>('coupons', couponBody({ maxUses: 10, endsAt: daysFromNow(30) }));
      const other = await made<Coupon>('coupons', couponBody({ code: 'OUTRO' }));

      const replaced = await call('PUT', `/api/stores/lessari/coupons/${coupon.id}`, owner, couponBody({ code: 'voltei15', percentBps: 1500 }));
      expect(replaced.statusCode).toBe(200);
      expect(replaced.json<Coupon>()).toMatchObject({ code: 'VOLTEI15', percentBps: 1500, maxUses: null, endsAt: null });

      const taken = await call('PUT', `/api/stores/lessari/coupons/${other.id}`, owner, couponBody({ code: 'Voltei15' }));
      expect([taken.statusCode, errorOf(taken)]).toEqual([409, 'COUPON_CODE_TAKEN']);
      // Its own code sent back is no clash.
      expect((await call('PUT', `/api/stores/lessari/coupons/${other.id}`, owner, couponBody({ code: 'outro' }))).statusCode).toBe(200);

      expect((await call('PATCH', `/api/stores/lessari/coupons/${coupon.id}`, owner, { active: false })).json<Coupon>()).toMatchObject({ active: false, status: 'PAUSED', code: 'VOLTEI15' });
      // A form saved without the switch leaves it paused.
      expect((await call('PUT', `/api/stores/lessari/coupons/${coupon.id}`, owner, couponBody({ code: 'VOLTEI15', percentBps: 2000 }))).json<Coupon>()).toMatchObject({ percentBps: 2000, active: false, status: 'PAUSED' });
      expect((await call('PATCH', `/api/stores/lessari/coupons/${coupon.id}`, owner, { active: true })).json<Coupon>()).toMatchObject({ active: true, status: 'ACTIVE' });
    });

    it('keeps who a coupon is for — everyone unless said — and a replacement that leaves it out is for everyone again', async () => {
      const welcome = await made<Coupon>('coupons', couponBody({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE' }));
      expect(welcome.audience).toBe('FIRST_PURCHASE');
      await made<Coupon>('coupons', couponBody());

      const all = (await call('GET', '/api/stores/lessari/coupons', owner)).json<CouponPage>();
      expect(all.coupons.map((coupon) => [coupon.code, coupon.audience])).toEqual([
        ['BEMVINDO10', 'EVERYONE'],
        ['PRIMEIRA10', 'FIRST_PURCHASE'],
      ]);

      const url = `/api/stores/lessari/coupons/${welcome.id}`;
      expect((await call('PATCH', url, owner, { active: false })).json<Coupon>()).toMatchObject({ active: false, audience: 'FIRST_PURCHASE' });
      expect((await call('PUT', url, owner, couponBody({ code: 'PRIMEIRA15', percentBps: 1500, audience: 'FIRST_PURCHASE' }))).json<Coupon>()).toMatchObject({ code: 'PRIMEIRA15', audience: 'FIRST_PURCHASE' });
      expect((await call('PUT', url, owner, couponBody({ code: 'PRIMEIRA15' }))).json<Coupon>()).toMatchObject({ active: false, audience: 'EVERYONE' });
      expect((await call('GET', url, owner)).json<Coupon>().audience).toBe('EVERYONE');

      for (const audience of ['RETURNING', 'first_purchase', '', null, 1]) {
        expect((await call('POST', '/api/stores/lessari/coupons', owner, couponBody({ code: 'OUTRO', audience }))).statusCode, String(audience)).toBe(400);
        expect((await call('PUT', url, owner, couponBody({ code: 'PRIMEIRA15', audience }))).statusCode, String(audience)).toBe(400);
      }
      expect(await prisma.coupon.count()).toBe(2);
    });

    it('lists by where each stands — exhausted at its limit — with the count of every status', async () => {
      const bodies: Record<CouponStatus, object> = {
        ENDED: { code: 'ENCERRADO', startsAt: daysFromNow(-10), endsAt: daysFromNow(-1) },
        EXHAUSTED: { code: 'ESGOTADO', maxUses: 2 },
        PAUSED: { code: 'PAUSADO', active: false },
        SCHEDULED: { code: 'AGENDADO', startsAt: daysFromNow(2) },
        ACTIVE: { code: 'ATIVO', maxUses: 2 },
      };
      for (const body of Object.values(bodies)) await made<Coupon>('coupons', couponBody(body));
      await made<Coupon>('coupons', couponBody({ code: 'SEM-LIMITE' }));
      // Exhausted and switched off reads exhausted; over as well reads ended.
      await made<Coupon>('coupons', couponBody({ code: 'ESGOTADO-PAUSADO', maxUses: 1, active: false }));
      await made<Coupon>('coupons', couponBody({ code: 'ESGOTADO-ENCERRADO', maxUses: 1, startsAt: daysFromNow(-10), endsAt: daysFromNow(-1) }));
      await prisma.coupon.updateMany({ where: { code: { startsWith: 'ESGOTADO' } }, data: { usedCount: 2 } });
      await prisma.coupon.updateMany({ where: { code: { in: ['ATIVO', 'SEM-LIMITE'] } }, data: { usedCount: 1 } });

      const all = (await call('GET', '/api/stores/lessari/coupons', owner)).json<CouponPage>();
      expect(Object.fromEntries(all.coupons.map((coupon) => [coupon.code, coupon.status]))).toEqual({
        'ESGOTADO-ENCERRADO': 'ENDED',
        'ESGOTADO-PAUSADO': 'EXHAUSTED',
        'SEM-LIMITE': 'ACTIVE',
        ATIVO: 'ACTIVE',
        AGENDADO: 'SCHEDULED',
        PAUSADO: 'PAUSED',
        ESGOTADO: 'EXHAUSTED',
        ENCERRADO: 'ENDED',
      });
      expect(all.coupons[0]!.code).toBe('ESGOTADO-ENCERRADO');
      expect(all).toMatchObject({ total: 8, counts: { ALL: 8, ENDED: 2, EXHAUSTED: 2, PAUSED: 1, SCHEDULED: 1, ACTIVE: 2 } });

      for (const status of ['ENDED', 'EXHAUSTED', 'PAUSED', 'SCHEDULED', 'ACTIVE'] as const) {
        const page = (await call('GET', `/api/stores/lessari/coupons?status=${status}`, owner)).json<CouponPage>();
        expect(page.coupons.map((coupon) => coupon.status), status).toEqual(Array.from({ length: all.counts[status] }, () => status));
        expect(page.total, status).toBe(all.counts[status]);
      }

      // A limit lowered below what was used is taken, and reads exhausted.
      const active = all.coupons.find((coupon) => coupon.code === 'ATIVO')!;
      const lowered = await call('PUT', `/api/stores/lessari/coupons/${active.id}`, owner, couponBody({ code: 'ATIVO', maxUses: 1 }));
      expect(lowered.json<Coupon>()).toMatchObject({ maxUses: 1, usedCount: 1, status: 'EXHAUSTED' });
    });

    it('refuses a code it cannot keep, a value that does not match its kind, limits below one and a period that ends before it starts', async () => {
      const refused = async (body: object) => {
        const response = await call('POST', '/api/stores/lessari/coupons', owner, couponBody(body));
        return [response.statusCode, errorOf(response)];
      };

      // "straße" would read STRASSE once its case is raised: refused as typed, never corrected.
      for (const code of ['AB', 'BEM VINDO', 'PROMOÇÃO', 'straße', 'ﬁrst10', '-DEZ', 'X'.repeat(31), '', 10]) {
        expect(await refused({ code }), String(code)).toEqual([400, 'COUPON_CODE_INVALID']);
      }

      expect(await refused({ percentBps: null })).toEqual([400, 'COUPON_DISCOUNT_INVALID']);
      expect(await refused({ amountCents: 500 })).toEqual([400, 'COUPON_DISCOUNT_INVALID']);
      expect(await refused({ kind: 'FIXED' })).toEqual([400, 'COUPON_DISCOUNT_INVALID']);
      expect(await refused({ kind: 'FREE_SHIPPING' })).toEqual([400, 'COUPON_DISCOUNT_INVALID']);
      expect(await refused({ percentBps: 10001 })).toEqual([400, 'COUPON_DISCOUNT_INVALID']);

      expect(await refused({ endsAt: daysFromNow(-2) })).toEqual([400, 'COUPON_PERIOD_INVALID']);
      expect(await refused({ startsAt: undefined })).toEqual([400, 'COUPON_PERIOD_INVALID']);
      expect(await refused({ startsAt: '2026-10-05 10:00' })).toEqual([400, 'COUPON_PERIOD_INVALID']);
      expect(await refused({ endsAt: '31/12/2026' })).toEqual([400, 'COUPON_PERIOD_INVALID']);
      expect((await refused({ active: null }))[0]).toBe(400);

      expect((await refused({ maxUses: 0 }))[0]).toBe(400);
      expect((await refused({ maxUsesPerCustomer: 0 }))[0]).toBe(400);
      expect((await refused({ minSubtotalCents: -1 }))[0]).toBe(400);
      // What the API never writes, the database refuses from any writer.
      const storeId = (await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } })).id;
      await expect(prisma.coupon.create({ data: { storeId, code: 'minusculo', kind: 'PERCENT', percentBps: 1000, startsAt: new Date() } })).rejects.toThrow();
      await expect(prisma.coupon.create({ data: { storeId, code: 'SEM-VALOR', kind: 'PERCENT', startsAt: new Date() } })).rejects.toThrow();
      await expect(prisma.coupon.create({ data: { storeId, code: 'SEM-VALOR', kind: 'FIXED', startsAt: new Date() } })).rejects.toThrow();
      expect(await prisma.coupon.count()).toBe(0);
    });

    it('shows the orders a coupon went into, the most recent first, each with its customer and what it took off', async () => {
      const coupon = await made<Coupon>('coupons', couponBody());
      const unused = await made<Coupon>('coupons', couponBody({ code: 'PARADO' }));
      const variant = await prisma.productVariant.findFirstOrThrow({ where: { productId: whey.id } });
      const place = async (name: string, phone: string) =>
        (await call('POST', '/api/stores/lessari/orders', owner, { customer: { name, phone }, items: [{ variantId: variant.id, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' })).json<Order>();

      const first = await place('Bia Souza', '(11) 98888-7777');
      const second = await place('Caio Lima', '(11) 97777-6666');
      const third = await place('Bia Souza', '(11) 98888-7777');
      // The use is the order transaction's to write (BEELINK-191); here it is written as that will.
      for (const [index, order] of [first, second, third].entries()) {
        await prisma.couponRedemption.create({ data: { couponId: coupon.id, orderId: order.id, discountCents: 1899, createdAt: new Date(Date.now() - (3 - index) * 60_000) } });
      }
      await call('PATCH', `/api/stores/lessari/orders/${second.number}/status`, owner, { status: 'CANCELLED' });

      const page = (await call('GET', `/api/stores/lessari/coupons/${coupon.id}/redemptions`, owner)).json<CouponRedemptionPage>();
      expect(page).toMatchObject({ total: 3, page: 1, pageSize: 20 });
      expect(page.redemptions.map((use) => [use.order.number, use.order.status, use.customer.name, use.discountCents])).toEqual([
        [3, 'ACCEPTED', 'Bia Souza', 1899],
        [2, 'CANCELLED', 'Caio Lima', 1899],
        [1, 'ACCEPTED', 'Bia Souza', 1899],
      ]);
      expect(page.redemptions[0]!.order).toMatchObject({ totalCents: third.totalCents, placedAt: third.placedAt });

      const second2 = (await call('GET', `/api/stores/lessari/coupons/${coupon.id}/redemptions?page=2&pageSize=2`, owner)).json<CouponRedemptionPage>();
      expect(second2.redemptions.map((use) => use.order.number)).toEqual([1]);
      expect((await call('GET', `/api/stores/lessari/coupons/${unused.id}/redemptions`, owner)).json<CouponRedemptionPage>()).toMatchObject({ redemptions: [], total: 0 });

      // An order takes one coupon.
      await expect(prisma.couponRedemption.create({ data: { couponId: unused.id, orderId: first.id, discountCents: 100 } })).rejects.toThrow();

      const theirs = await made<Coupon>('coupons', couponBody(), 'outra');
      for (const id of [theirs.id, MISSING, 'nao-e-um-id']) {
        for (const [method, path, payload] of [['GET', '', undefined], ['PUT', '', couponBody()], ['PATCH', '', { active: false }], ['GET', '/redemptions', undefined]] as const) {
          const response = await call(method, `/api/stores/lessari/coupons/${id}${path}`, owner, payload);
          expect([response.statusCode, errorOf(response)], `${method} ${id}${path}`).toEqual([404, 'COUPON_NOT_FOUND']);
        }
      }
    });
  });

  it('opens every route to the shop’s owner alone', async () => {
    const stranger = await signUpAndSignIn(app, newEmail('estranho'));
    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Souza', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();

    const promotion = await made<Promotion>('promotions', promotionBody());
    const coupon = await made<Coupon>('coupons', couponBody());
    const routes = [
      ['GET', '/promotions', undefined],
      ['POST', '/promotions', promotionBody()],
      ['GET', `/promotions/${promotion.id}`, undefined],
      ['PUT', `/promotions/${promotion.id}`, promotionBody()],
      ['PATCH', `/promotions/${promotion.id}`, { active: false }],
      ['GET', '/coupons', undefined],
      ['POST', '/coupons', couponBody({ code: 'OUTRO' })],
      ['GET', `/coupons/${coupon.id}`, undefined],
      ['PUT', `/coupons/${coupon.id}`, couponBody()],
      ['PATCH', `/coupons/${coupon.id}`, { active: false }],
      ['GET', `/coupons/${coupon.id}/redemptions`, undefined],
    ] as const;

    for (const [method, path, payload] of routes) {
      const url = `/api/stores/lessari${path}`;
      expect((await call(method, url, undefined, payload)).statusCode, `${method} ${path} with no session`).toBe(401);
      expect((await call(method, url, shopper, payload)).statusCode, `${method} ${path} as a shopper`).toBe(401);
      const refused = await call(method, url, stranger, payload);
      expect([refused.statusCode, errorOf(refused)], `${method} ${path} as another owner`).toEqual([403, 'STORE_FORBIDDEN']);
    }
    expect((await call('GET', '/api/stores/nenhuma/promotions', owner)).statusCode).toBe(404);
    expect((await call('GET', `/api/stores/lessari/promotions/${promotion.id}`, owner)).json<Promotion>()).toMatchObject({ active: true });
    expect(await prisma.coupon.count()).toBe(1);
  });
});
