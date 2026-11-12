// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AffiliateCommissionPayload, AffiliateProgramOverview, ApiErrorBody, AuthSession, CommissionTable, Product, ProductCategory, ShopAffiliate } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { affiliateDocumentFor, affiliateIdentity } from './support/affiliate-identity.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("an affiliate's own commission, set on the invite (the user's review, 12/11/2026)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;
  let defaultTable: string;
  let suplementos: ProductCategory;
  let whey: Product;

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
    defaultTable = (await overview()).tables[0]!.id;
    suplementos = (await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Suplementos' })).json<ProductCategory>();
    whey = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey 900g', priceCents: 15_000 })).json<Product>();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;
  const overview = () => call('GET', '/api/stores/lessari/affiliate-program', owner).then((response) => response.json<AffiliateProgramOverview>());
  const base = '/api/stores/lessari/affiliates';
  const own = (over: Partial<AffiliateCommissionPayload> = {}): AffiliateCommissionPayload => ({
    defaultRateBps: 1200,
    categoryRates: [{ categoryId: suplementos.id, rateBps: 1500 }],
    productRates: [{ productId: whey.id, rateBps: 800 }],
    ...over,
  });

  async function invite(body: object, name = 'João Silva') {
    return call('POST', base, owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, base), name, email: newEmail('afiliado'), ...body });
  }

  async function invited(body: object, name?: string): Promise<ShopAffiliate> {
    const response = await invite(body, name);
    if (response.statusCode !== 201) throw new Error(`POST affiliates answered ${response.statusCode}: ${response.payload}`);
    return response.json<ShopAffiliate>();
  }

  const table = (id: string) => call('GET', `/api/stores/lessari/affiliate-program/tables/${id}`, owner).then((response) => response.json<CommissionTable>());

  it('makes a table of theirs alone, with the rates typed, and puts them on it', async () => {
    const joao = await invited({ commission: own() });

    expect(joao.table).toMatchObject({ name: 'Comissão de João Silva', personal: true });
    expect(await table(joao.table.id)).toMatchObject({
      defaultRateBps: 1200,
      isDefault: false,
      categoryRates: [{ categoryId: suplementos.id, rateBps: 1500 }],
      rates: [{ productId: whey.id, rateBps: 800 }],
      affiliate: { id: joao.id, name: 'João Silva' },
    });
    const listed = (await overview()).tables;
    expect(listed.map((row) => row.name)).toEqual(['Padrão', 'Comissão de João Silva']);
    expect(listed[1]).toMatchObject({ affiliate: { id: joao.id, name: 'João Silva' }, affiliateCount: 1 });
  });

  it('names a second João apart, and does not count own tables toward the fifty', async () => {
    await invited({ commission: own() });
    const second = await invited({ commission: own() });
    expect(second.table.name).toBe('Comissão de João Silva (2)');

    const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });
    await prisma.commissionTable.createMany({ data: Array.from({ length: 48 }, (_, i) => ({ storeId, name: `Tabela ${i}`, defaultRateBps: 100 })) });
    expect((await call('POST', '/api/stores/lessari/affiliate-program/tables', owner, { name: 'A quinquagésima', defaultRateBps: 100 })).statusCode).toBe(201);
    expect(errorOf(await call('POST', '/api/stores/lessari/affiliate-program/tables', owner, { name: 'Uma a mais', defaultRateBps: 100 }))).toBe('COMMISSION_TABLE_LIMIT');
  });

  it('asks for a shared table or an own commission — one, not both, not neither', async () => {
    expect(errorOf(await invite({ tableId: defaultTable, commission: own() }))).toBe('AFFILIATE_INVALID');
    expect(errorOf(await invite({}))).toBe('AFFILIATE_INVALID');
    expect(errorOf(await invite({ commission: own({ defaultRateBps: 10_001 }) }))).toBe('AFFILIATE_INVALID');
    expect(errorOf(await invite({ commission: own({ productRates: [{ productId: whey.id, rateBps: 1 }, { productId: whey.id, rateBps: 2 }] }) }))).toBe('AFFILIATE_INVALID');
    expect(await prisma.commissionTable.count({ where: { affiliateId: { not: null } } })).toBe(0);
  });

  it("refuses another shop's category or product, and writes nothing", async () => {
    const theirs = (await call('POST', '/api/stores/vizinha/product-categories', stranger, { name: 'Delas' })).json<ProductCategory>();
    const theirProduct = (await call('POST', '/api/stores/vizinha/products', stranger, { name: 'Deles', priceCents: 100 })).json<Product>();

    expect(errorOf(await invite({ commission: own({ categoryRates: [{ categoryId: theirs.id, rateBps: 1 }] }) }))).toBe('PRODUCT_CATEGORY_NOT_FOUND');
    expect(errorOf(await invite({ commission: own({ productRates: [{ productId: theirProduct.id, rateBps: 1 }] }) }))).toBe('PRODUCT_NOT_FOUND');
    expect(await prisma.affiliate.count()).toBe(0);
  });

  it("puts nobody else on someone's own table", async () => {
    const joao = await invited({ commission: own() });

    expect(errorOf(await invite({ tableId: joao.table.id }, 'Maria'))).toBe('COMMISSION_TABLE_PERSONAL');
    const maria = await invited({ tableId: defaultTable }, 'Maria');
    expect(errorOf(await call('PATCH', `${base}/${maria.id}`, owner, { tableId: joao.table.id }))).toBe('COMMISSION_TABLE_PERSONAL');
  });

  it('deletes the own table when the invite is cancelled', async () => {
    const joao = await invited({ commission: own() });

    expect((await call('DELETE', `${base}/${joao.id}`, owner)).statusCode).toBe(204);
    expect(await prisma.commissionTable.count({ where: { id: joao.table.id } })).toBe(0);
  });

  it('moves them to a shared table and deletes their own; and back, making a new one', async () => {
    const joao = await invited({ commission: own() });

    const shared = await call('PATCH', `${base}/${joao.id}`, owner, { tableId: defaultTable });
    expect(shared.json<ShopAffiliate>().table).toEqual({ id: defaultTable, name: 'Padrão', personal: false });
    expect(await prisma.commissionTable.count({ where: { id: joao.table.id } })).toBe(0);

    const back = (await call('PATCH', `${base}/${joao.id}`, owner, { commission: own({ defaultRateBps: 900, categoryRates: [] }) })).json<ShopAffiliate>();
    expect(back.table.personal).toBe(true);
    expect(await table(back.table.id)).toMatchObject({ defaultRateBps: 900, categoryRates: [], rates: [{ productId: whey.id, rateBps: 800 }] });
  });

  it('replaces the rates of the own table they have, rather than making another', async () => {
    const joao = await invited({ commission: own() });

    const again = (await call('PATCH', `${base}/${joao.id}`, owner, { commission: own({ defaultRateBps: 500, productRates: [] }) })).json<ShopAffiliate>();
    expect(again.table.id).toBe(joao.table.id);
    expect(await table(joao.table.id)).toMatchObject({ defaultRateBps: 500, rates: [], categoryRates: [{ categoryId: suplementos.id, rateBps: 1500 }] });
    expect(await prisma.commissionTable.count({ where: { affiliateId: joao.id } })).toBe(1);
    expect(errorOf(await call('PATCH', `${base}/${joao.id}`, owner, { tableId: defaultTable, commission: own() }))).toBe('AFFILIATE_INVALID');
  });

  it("keeps a table with its owner on it, and lets the owner's own table be renamed like any other", async () => {
    const joao = await invited({ commission: own() });

    expect(errorOf(await call('DELETE', `/api/stores/lessari/affiliate-program/tables/${joao.table.id}`, owner))).toBe('COMMISSION_TABLE_IN_USE');
    const renamed = await call('PUT', `/api/stores/lessari/affiliate-program/tables/${joao.table.id}`, owner, { name: 'Condição do João', defaultRateBps: 1300 });
    expect(renamed.json<CommissionTable>()).toMatchObject({ name: 'Condição do João', defaultRateBps: 1300, affiliate: { id: joao.id } });
  });
});
