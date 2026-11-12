// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AffiliateProgramOverview,
  AffiliateProgramPayload,
  ApiErrorBody,
  AuthSession,
  CommissionCategoryRate,
  CommissionProductRate,
  CommissionTable,
  Product,
  ProductCategory,
} from '@harness-monorepo/contracts';

// App
import { payoutPeriodsOfMonth } from '../src/modules/affiliates/affiliate-payout-calendar.js';
import { brasiliaDayOf } from '../src/modules/billing/billing-dates.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const MISSING = '0199a1b2-0000-7000-8000-000000000000';
const RULES: AffiliateProgramPayload = { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: 'Comissão paga por Pix.' };

describe("a shop's affiliate programme: its rules and its commission tables", () => {
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
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('POST', '/api/stores', stranger, shopBody('vizinha'));
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;
  const overview = (slug = 'lessari', session = owner) => call('GET', `/api/stores/${slug}/affiliate-program`, session);
  const save = (rules: object) => call('PUT', '/api/stores/lessari/affiliate-program', owner, rules);
  const createTable = (body: object, slug = 'lessari', session = owner) => call('POST', `/api/stores/${slug}/affiliate-program/tables`, session, body);
  const tablesUrl = '/api/stores/lessari/affiliate-program/tables';

  async function product(name: string, slug = 'lessari', session = owner): Promise<Product> {
    const response = await call('POST', `/api/stores/${slug}/products`, session, { name, priceCents: 10_000 });
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<Product>();
  }

  async function category(name: string, slug = 'lessari', session = owner): Promise<ProductCategory> {
    const response = await call('POST', `/api/stores/${slug}/product-categories`, session, { name });
    if (response.statusCode !== 201) throw new Error(`POST product-categories answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductCategory>();
  }

  async function defaultTableId(): Promise<string> {
    const { tables } = (await overview()).json<AffiliateProgramOverview>();
    return tables.find((table) => table.isDefault)!.id;
  }

  describe('the programme', () => {
    it('opens on its first reading, switched off, with a default table of 10% and the running month at ten days', async () => {
      const response = await overview();

      expect(response.statusCode).toBe(200);
      const read = response.json<AffiliateProgramOverview>();
      expect(read.program).toEqual({ enabled: false, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: expect.any(String) });
      expect(read.tables).toEqual([{ id: expect.any(String), name: 'Padrão', defaultRateBps: 1000, isDefault: true, productRateCount: 0, categoryRateCount: 0, affiliateCount: 0 }]);
      expect(read.periods).toEqual(payoutPeriodsOfMonth(brasiliaDayOf(new Date()), 10));
      expect(read.periods.map((period) => period.firstDay.slice(8))).toEqual(['01', '11', '21']);
    });

    it('opens one programme and one default table, however many first readings arrive at once', async () => {
      const answers = await Promise.all(Array.from({ length: 6 }, () => overview()));

      expect(answers.map((answer) => answer.statusCode)).toEqual([200, 200, 200, 200, 200, 200]);
      expect(await prisma.affiliateProgram.count()).toBe(1);
      expect(await prisma.commissionTable.count()).toBe(1);
    });

    it('saves the rules whole, and the periods follow the saved delay', async () => {
      const saved = await save({ ...RULES, payoutDelayDays: 0, attributionDays: 7 });

      expect(saved.statusCode).toBe(200);
      const read = saved.json<AffiliateProgramOverview>();
      expect(read.program).toMatchObject({ enabled: true, attributionDays: 7, payoutDelayDays: 0, termsText: 'Comissão paga por Pix.' });
      expect(read.periods.every((period) => period.dueOn === period.lastDay)).toBe(true);
      expect((await overview()).json<AffiliateProgramOverview>().program).toMatchObject({ enabled: true, payoutDelayDays: 0 });
    });

    it("moves the terms' version only when their text changes — removal included — and keeps it for the same text", async () => {
      const versionAfter = async (termsText: string | null) => (await save({ ...RULES, termsText })).json<AffiliateProgramOverview>().program.termsVersion;

      expect(await versionAfter('Primeira versão')).toBe(1);
      expect(await versionAfter('  Primeira versão  ')).toBe(1);
      expect(await versionAfter('Segunda versão')).toBe(2);
      expect(await versionAfter(null)).toBe(3);
      // Blank is no terms, as null is: nothing changed.
      expect(await versionAfter('   ')).toBe(3);
      expect((await overview()).json<AffiliateProgramOverview>().program.termsText).toBeNull();
    });

    it('counts two different texts saved at once as two changes', async () => {
      await overview();
      await Promise.all([save({ ...RULES, termsText: 'Texto A' }), save({ ...RULES, termsText: 'Texto B' })]);

      expect((await overview()).json<AffiliateProgramOverview>().program.termsVersion).toBe(2);
    });

    it.each([
      ['a visit that counts for no days', { attributionDays: 0 }],
      ['a visit that counts past 90 days', { attributionDays: 91 }],
      ['a negative delay', { payoutDelayDays: -1 }],
      ['a delay past 60 days', { payoutDelayDays: 61 }],
      ['a fractional delay', { payoutDelayDays: 2.5 }],
      ['terms past 10000 characters', { termsText: 'a'.repeat(10_001) }],
      ['terms that are not text', { termsText: 42 }],
      ['a switch that is not one', { enabled: 'true' }],
    ])('refuses %s', async (_, change) => {
      const response = await save({ ...RULES, ...change });

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('AFFILIATE_PROGRAM_INVALID');
    });

    it.each(['enabled', 'attributionDays', 'payoutDelayDays', 'termsText'] as const)('refuses the rules without %s, rather than resetting it', async (key) => {
      const { [key]: _left, ...rest } = RULES;
      const response = await save(rest);

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('AFFILIATE_PROGRAM_INVALID');
    });

    it("is its owner's alone, and a stranger's reading opens nothing", async () => {
      const foreign = await overview('lessari', stranger);
      expect(foreign.statusCode).toBe(403);
      expect(errorOf(foreign)).toBe('STORE_FORBIDDEN');
      expect(await prisma.affiliateProgram.count()).toBe(0);

      expect((await call('GET', '/api/stores/lessari/affiliate-program')).statusCode).toBe(401);
      expect(errorOf(await overview('ninguem'))).toBe('STORE_NOT_FOUND');
      expect((await call('PUT', '/api/stores/lessari/affiliate-program', stranger, RULES)).statusCode).toBe(403);
    });
  });

  describe('the tables', () => {
    it('creates one, trimmed, and lists it after the default table', async () => {
      const created = await createTable({ name: '  Influencers  ', defaultRateBps: 1500 });

      expect(created.statusCode).toBe(201);
      expect(created.json<CommissionTable>()).toEqual({ id: expect.any(String), name: 'Influencers', defaultRateBps: 1500, isDefault: false, rates: [], categoryRates: [], updatedAt: expect.any(String) });
      await createTable({ name: 'Amigos', defaultRateBps: 500 });
      expect((await overview()).json<AffiliateProgramOverview>().tables.map((table) => table.name)).toEqual(['Padrão', 'Amigos', 'Influencers']);
    });

    it('opens the programme when the first thing the owner does is create a table', async () => {
      expect((await createTable({ name: 'Influencers', defaultRateBps: 1500 })).statusCode).toBe(201);

      expect(await prisma.commissionTable.count({ where: { isDefault: true } })).toBe(1);
    });

    it("refuses a name another of the shop's tables has, and lets another shop have it", async () => {
      await createTable({ name: 'Influencers', defaultRateBps: 1500 });
      const amigos = (await createTable({ name: 'Amigos', defaultRateBps: 500 })).json<CommissionTable>();

      const again = await createTable({ name: 'Influencers', defaultRateBps: 900 });
      expect(again.statusCode).toBe(409);
      expect(errorOf(again)).toBe('COMMISSION_TABLE_NAME_TAKEN');
      expect(errorOf(await createTable({ name: 'Padrão', defaultRateBps: 900 }))).toBe('COMMISSION_TABLE_NAME_TAKEN');
      expect(errorOf(await call('PUT', `${tablesUrl}/${amigos.id}`, owner, { name: 'Influencers', defaultRateBps: 500 }))).toBe('COMMISSION_TABLE_NAME_TAKEN');
      expect((await createTable({ name: 'Influencers', defaultRateBps: 1500 }, 'vizinha', stranger)).statusCode).toBe(201);
    });

    it("changes a table's name and rate — the default one's too", async () => {
      const id = await defaultTableId();
      const changed = await call('PUT', `${tablesUrl}/${id}`, owner, { name: 'Geral', defaultRateBps: 800 });

      expect(changed.statusCode).toBe(200);
      expect(changed.json<CommissionTable>()).toMatchObject({ id, name: 'Geral', defaultRateBps: 800, isDefault: true });
      expect((await call('GET', `${tablesUrl}/${id}`, owner)).json<CommissionTable>()).toMatchObject({ name: 'Geral', defaultRateBps: 800 });
    });

    it('deletes a table with its rates, and never the default one', async () => {
      const whey = await product('Whey');
      const table = (await createTable({ name: 'Influencers', defaultRateBps: 1500 })).json<CommissionTable>();
      await call('PUT', `${tablesUrl}/${table.id}/rates/${whey.id}`, owner, { rateBps: 2000 });

      const removed = await call('DELETE', `${tablesUrl}/${table.id}`, owner);
      expect(removed.statusCode).toBe(204);
      expect(errorOf(await call('GET', `${tablesUrl}/${table.id}`, owner))).toBe('COMMISSION_TABLE_NOT_FOUND');
      expect(await prisma.commissionTableRate.count()).toBe(0);

      const kept = await call('DELETE', `${tablesUrl}/${await defaultTableId()}`, owner);
      expect(kept.statusCode).toBe(409);
      expect(errorOf(kept)).toBe('COMMISSION_TABLE_DEFAULT');
      expect(await prisma.commissionTable.count({ where: { isDefault: true } })).toBe(1);
    });

    it('stops at fifty tables', async () => {
      await overview();
      const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });
      await prisma.commissionTable.createMany({ data: Array.from({ length: 49 }, (_, i) => ({ storeId, name: `Tabela ${i}`, defaultRateBps: 100 })) });

      const response = await createTable({ name: 'A quinquagésima primeira', defaultRateBps: 100 });
      expect(response.statusCode).toBe(409);
      expect(errorOf(response)).toBe('COMMISSION_TABLE_LIMIT');
    });

    it.each([
      ['no name', { name: '   ', defaultRateBps: 1000 }],
      ['a name past 60 characters', { name: 'a'.repeat(61), defaultRateBps: 1000 }],
      ['a negative rate', { name: 'X', defaultRateBps: -1 }],
      ['a rate past 100%', { name: 'X', defaultRateBps: 10_001 }],
      ['a fractional rate', { name: 'X', defaultRateBps: 2.5 }],
      ['no rate', { name: 'X' }],
    ])('refuses a table with %s', async (_, body) => {
      const response = await createTable(body);

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('COMMISSION_TABLE_INVALID');
    });

    it("answers another shop's table, and one that does not exist, as not found", async () => {
      const foreign = (await createTable({ name: 'Delas', defaultRateBps: 1500 }, 'vizinha', stranger)).json<CommissionTable>();

      for (const id of [foreign.id, MISSING, 'nao-e-um-id']) {
        const response = await call('GET', `${tablesUrl}/${id}`, owner);
        expect(response.statusCode).toBe(404);
        expect(errorOf(response)).toBe('COMMISSION_TABLE_NOT_FOUND');
      }
      expect((await call('PUT', `${tablesUrl}/${foreign.id}`, owner, { name: 'Minha', defaultRateBps: 1 })).statusCode).toBe(404);
      expect((await call('DELETE', `${tablesUrl}/${foreign.id}`, owner)).statusCode).toBe(404);
      expect((await call('GET', `/api/stores/vizinha/affiliate-program/tables/${foreign.id}`, owner)).statusCode).toBe(403);
    });
  });

  describe("a product's own rate", () => {
    it("replaces the table's, 0 included, and goes back to it when removed", async () => {
      const [whey, creatina] = [await product('Whey'), await product('Creatina')];
      const id = await defaultTableId();

      const set = await call('PUT', `${tablesUrl}/${id}/rates/${whey.id}`, owner, { rateBps: 2500 });
      expect(set.statusCode).toBe(200);
      expect(set.json<CommissionProductRate>()).toEqual({ productId: whey.id, rateBps: 2500 });
      await call('PUT', `${tablesUrl}/${id}/rates/${whey.id}`, owner, { rateBps: 3000 });
      await call('PUT', `${tablesUrl}/${id}/rates/${creatina.id}`, owner, { rateBps: 0 });

      const table = (await call('GET', `${tablesUrl}/${id}`, owner)).json<CommissionTable>();
      expect(table.rates).toEqual(expect.arrayContaining([{ productId: whey.id, rateBps: 3000 }, { productId: creatina.id, rateBps: 0 }]));
      expect(table.rates).toHaveLength(2);
      expect((await overview()).json<AffiliateProgramOverview>().tables[0]!.productRateCount).toBe(2);

      expect((await call('DELETE', `${tablesUrl}/${id}/rates/${whey.id}`, owner)).statusCode).toBe(204);
      expect((await call('DELETE', `${tablesUrl}/${id}/rates/${whey.id}`, owner)).statusCode).toBe(204);
      expect((await call('GET', `${tablesUrl}/${id}`, owner)).json<CommissionTable>().rates).toEqual([{ productId: creatina.id, rateBps: 0 }]);
    });

    it("refuses another shop's product, and a rate out of range", async () => {
      const foreign = await product('Deles', 'vizinha', stranger);
      const id = await defaultTableId();

      for (const productId of [foreign.id, MISSING, 'nao-e-um-id']) {
        const response = await call('PUT', `${tablesUrl}/${id}/rates/${productId}`, owner, { rateBps: 1000 });
        expect(response.statusCode).toBe(404);
        expect(errorOf(response)).toBe('PRODUCT_NOT_FOUND');
      }
      const whey = await product('Whey');
      for (const rateBps of [-1, 10_001, 1.5]) {
        expect(errorOf(await call('PUT', `${tablesUrl}/${id}/rates/${whey.id}`, owner, { rateBps }))).toBe('COMMISSION_TABLE_INVALID');
      }
      expect(await prisma.commissionTableRate.count()).toBe(0);
    });

    it('goes with its product', async () => {
      const whey = await product('Whey');
      await call('PUT', `${tablesUrl}/${await defaultTableId()}/rates/${whey.id}`, owner, { rateBps: 2500 });

      expect((await call('DELETE', `/api/stores/lessari/products/${whey.id}`, owner)).statusCode).toBe(204);
      expect(await prisma.commissionTableRate.count()).toBe(0);
    });
  });

  describe("a category's own rate", () => {
    it("is set, 0 included, read with the table, counted, and goes back to the table's when removed", async () => {
      const [bolsas, brindes] = [await category('Bolsas'), await category('Brindes')];
      const id = await defaultTableId();

      const set = await call('PUT', `${tablesUrl}/${id}/category-rates/${bolsas.id}`, owner, { rateBps: 1500 });
      expect(set.statusCode).toBe(200);
      expect(set.json<CommissionCategoryRate>()).toEqual({ categoryId: bolsas.id, rateBps: 1500 });
      await call('PUT', `${tablesUrl}/${id}/category-rates/${bolsas.id}`, owner, { rateBps: 1800 });
      await call('PUT', `${tablesUrl}/${id}/category-rates/${brindes.id}`, owner, { rateBps: 0 });

      const table = (await call('GET', `${tablesUrl}/${id}`, owner)).json<CommissionTable>();
      expect(table.categoryRates).toEqual(expect.arrayContaining([{ categoryId: bolsas.id, rateBps: 1800 }, { categoryId: brindes.id, rateBps: 0 }]));
      expect(table.categoryRates).toHaveLength(2);
      expect((await overview()).json<AffiliateProgramOverview>().tables[0]).toMatchObject({ categoryRateCount: 2, productRateCount: 0 });

      expect((await call('DELETE', `${tablesUrl}/${id}/category-rates/${bolsas.id}`, owner)).statusCode).toBe(204);
      expect((await call('DELETE', `${tablesUrl}/${id}/category-rates/${bolsas.id}`, owner)).statusCode).toBe(204);
      expect((await call('GET', `${tablesUrl}/${id}`, owner)).json<CommissionTable>().categoryRates).toEqual([{ categoryId: brindes.id, rateBps: 0 }]);
    });

    it("refuses another shop's category, and a rate out of range", async () => {
      const foreign = await category('Delas', 'vizinha', stranger);
      const id = await defaultTableId();

      for (const categoryId of [foreign.id, MISSING, 'nao-e-um-id']) {
        const response = await call('PUT', `${tablesUrl}/${id}/category-rates/${categoryId}`, owner, { rateBps: 1000 });
        expect(response.statusCode).toBe(404);
        expect(errorOf(response)).toBe('PRODUCT_CATEGORY_NOT_FOUND');
      }
      const bolsas = await category('Bolsas');
      for (const rateBps of [-1, 10_001, 1.5]) {
        expect(errorOf(await call('PUT', `${tablesUrl}/${id}/category-rates/${bolsas.id}`, owner, { rateBps }))).toBe('COMMISSION_TABLE_INVALID');
      }
      expect(await prisma.commissionTableCategoryRate.count()).toBe(0);
    });

    it('goes with its category, and with its table', async () => {
      const bolsas = await category('Bolsas');
      await call('PUT', `${tablesUrl}/${await defaultTableId()}/category-rates/${bolsas.id}`, owner, { rateBps: 1500 });
      const table = (await createTable({ name: 'Influencers', defaultRateBps: 1500 })).json<CommissionTable>();
      await call('PUT', `${tablesUrl}/${table.id}/category-rates/${bolsas.id}`, owner, { rateBps: 2000 });

      expect((await call('DELETE', `${tablesUrl}/${table.id}`, owner)).statusCode).toBe(204);
      expect(await prisma.commissionTableCategoryRate.count()).toBe(1);
      expect((await call('DELETE', `/api/stores/lessari/product-categories/${bolsas.id}`, owner)).statusCode).toBe(204);
      expect(await prisma.commissionTableCategoryRate.count()).toBe(0);
    });
  });

  it("keeps the affiliates' own area out of a shop's address", async () => {
    const response = await call('POST', '/api/stores', owner, shopBody('afiliado'));

    expect(response.statusCode).toBe(400);
    expect(errorOf(response)).toBe('STORE_SLUG_RESERVED');
  });
});
