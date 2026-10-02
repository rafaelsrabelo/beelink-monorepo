// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, Order, ProductDetail } from '@harness-monorepo/contracts';

// App
import { FavoriteNoticeMailer } from '../src/modules/favorites/favorite-notice-mailer.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY_MS = 24 * 60 * 60_000;

describe("a favourite's notice by e-mail", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let email: string;

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
    await call('POST', '/api/stores', owner, shopBody('lessari'));

    email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    await clearInbox();
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function addProduct(body: object): Promise<ProductDetail> {
    const response = await call('POST', '/api/stores/lessari/products', owner, body);
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  /** Haze in Uva and Maçã verde, R$ 239,90 each, five of each counted. */
  async function hazeInTwoFlavours(): Promise<ProductDetail> {
    const product = await addProduct({ name: 'Pré-Treino Haze', slug: 'haze', priceCents: 23990 });
    const options = await call('PUT', `/api/stores/lessari/products/${product.id}/options`, owner, { options: [{ name: 'Sabor', values: [{ name: 'Uva' }, { name: 'Maçã verde' }] }] });
    const [grape, apple] = options.json<ProductDetail>().variants;
    return (
      await call('PUT', `/api/stores/lessari/products/${product.id}/variants`, owner, {
        variants: [
          { id: grape!.id, priceCents: 23990, trackStock: true, stockQuantity: 5 },
          { id: apple!.id, priceCents: 23990, trackStock: true, stockQuantity: 5 },
        ],
      })
    ).json<ProductDetail>();
  }

  const like = (productId: string, variantId: string | null = null) => call('PUT', `/api/stores/lessari/customer/favorites/${productId}`, shopper, { variantId });
  const edit = (productId: string, body: object) => call('PUT', `/api/stores/lessari/products/${productId}`, owner, body);
  const notices = () => prisma.favoriteNotice.findMany({ orderBy: { createdAt: 'asc' } });
  const flush = () => app.get(FavoriteNoticeMailer).flush();

  it('tells a product liked as a whole that got cheaper, in the shop’s name, with the way to it', async () => {
    const whey = await addProduct({ name: 'Whey Isolado', slug: 'whey', priceCents: 18990 });
    await like(whey.id);

    expect((await edit(whey.id, { priceCents: 15990 })).statusCode).toBe(200);
    expect(await notices()).toMatchObject([{ priceCents: 15990, previousPriceCents: 18990, backInStock: false, sentAt: null }]);

    expect(await flush()).toBe(1);
    const message = await waitForMessage(email, 10_000, 'baixou de preço');
    expect(message.Subject).toBe('lessari — Whey Isolado baixou de preço');
    expect(message.From.Name).toBe('lessari');
    expect(message.Text).toMatch(/Whey Isolado, que você curtiu em lessari, agora sai por R\$\s159,90 \(antes R\$\s189,90\)\./);
    expect(message.Text).toContain('/lessari/produtos/whey');
    expect(message.Text).toContain('/lessari/conta/perfil#avisos');
    expect((await notices())[0]!.sentAt).not.toBeNull();
  });

  it('tells a combination liked on its page, and not another combination of the product', async () => {
    const haze = await hazeInTwoFlavours();
    const [grape, apple] = haze.variants;
    await like(haze.id, grape!.id);

    await call('PUT', `/api/stores/lessari/products/${haze.id}/variants`, owner, { variants: [{ id: apple!.id, priceCents: 19990 }] });
    expect(await notices()).toEqual([]);

    await call('PUT', `/api/stores/lessari/products/${haze.id}/variants`, owner, { variants: [{ id: grape!.id, priceCents: 20990 }] });
    await flush();
    const message = await waitForMessage(email, 10_000, 'baixou de preço');
    expect(message.Text).toMatch(/Pré-Treino Haze \(Sabor: Uva\), que você curtiu em lessari, agora sai por R\$\s209,90 \(antes R\$\s239,90\)/);
    expect(message.Text).toContain(`/lessari/produtos/haze?variant=${grape!.id}`);
  });

  it('tells a sold-out favourite that came back — by the panel, or by a cancelled order giving the last one back', async () => {
    const whey = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 8990, trackStock: true, stockQuantity: 1 });
    const [variant] = (await prisma.productVariant.findMany({ where: { productId: whey.id } })).map((row) => row.id);
    await like(whey.id);

    // A sale takes the last one: sold out, which the favourite sees, and nothing to tell yet.
    const record = (await call('POST', '/api/stores/lessari/customers', owner, { name: 'Balcão', phone: '11977776666' })).json<{ id: string }>();
    const sale = (await call('POST', '/api/stores/lessari/orders', owner, { customer: { id: record.id }, items: [{ variantId: variant, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' })).json<Order>();
    expect(await prisma.customerFavorite.findFirst({ select: { seenSoldOut: true } })).toEqual({ seenSoldOut: true });
    expect(await notices()).toEqual([]);

    // The order is cancelled and the unit comes back: back in stock.
    expect((await call('PATCH', `/api/stores/lessari/orders/${sale.number}/status`, owner, { status: 'CANCELLED' })).statusCode).toBe(200);
    expect(await notices()).toMatchObject([{ backInStock: true, previousPriceCents: null, priceCents: 8990 }]);
    await flush();
    const message = await waitForMessage(email, 10_000, 'voltou ao estoque');
    expect(message.Subject).toBe('lessari — Whey voltou ao estoque');
    expect(message.Text).toMatch(/Whey, que você curtiu em lessari, voltou ao estoque e sai por R\$\s89,90\./);
  });

  it('says both in one e-mail when it came back cheaper: a drop while sold out waits for the return', async () => {
    const whey = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 10000, trackStock: true, stockQuantity: 0 });
    await like(whey.id);

    await edit(whey.id, { priceCents: 9000 });
    expect(await notices()).toEqual([]);

    // Only the stock moves now: the drop told is from the price before it sold out.
    await edit(whey.id, { stockQuantity: 3 });
    expect(await notices()).toMatchObject([{ backInStock: true, priceCents: 9000, previousPriceCents: 10000 }]);
    await flush();
    expect((await waitForMessage(email, 10_000, 'voltou ao estoque')).Subject).toBe('lessari — Whey baixou de preço e voltou ao estoque');
  });

  it('sends at most one per product in 7 days, and a rise is the new mark', async () => {
    const whey = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 10000 });
    await like(whey.id);

    await edit(whey.id, { priceCents: 9000 });
    await edit(whey.id, { priceCents: 8000 });
    expect(await notices()).toHaveLength(1);
    expect(await prisma.customerFavorite.findFirst({ select: { seenPriceCents: true } })).toEqual({ seenPriceCents: 8000 });

    // A week later a rise, then a drop back: a drop from the risen price is a real one.
    await prisma.favoriteNotice.updateMany({ data: { createdAt: new Date(Date.now() - 8 * DAY_MS) } });
    await edit(whey.id, { priceCents: 9500 });
    expect(await notices()).toHaveLength(1);
    await edit(whey.id, { priceCents: 8500 });
    expect((await notices()).at(-1)).toMatchObject({ priceCents: 8500, previousPriceCents: 9500 });
  });

  it('tells no one who turned the notice off, and what changed while a draft once it is published', async () => {
    const whey = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 10000 });
    await like(whey.id);

    await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: true, favorites: false, cashback: true, offers: false });
    await edit(whey.id, { priceCents: 9000 });
    expect(await notices()).toEqual([]);
    expect(await prisma.customerFavorite.findFirst({ select: { seenPriceCents: true } })).toEqual({ seenPriceCents: 9000 });

    await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: true, favorites: true, cashback: true, offers: false });
    await edit(whey.id, { status: 'DRAFT', priceCents: 8000 });
    expect(await notices()).toEqual([]);
    expect(await prisma.customerFavorite.findFirst({ select: { seenPriceCents: true } })).toEqual({ seenPriceCents: 9000 });

    // Published again, with nothing else in the save: the drop it had meanwhile is news now.
    await edit(whey.id, { status: 'ACTIVE' });
    expect(await notices()).toMatchObject([{ priceCents: 8000, previousPriceCents: 9000 }]);
  });

  it('reads everything again before sending: unliked or sold out again since, nothing goes, and it is done', async () => {
    const whey = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 10000 });
    const beta = await addProduct({ name: 'Beta', slug: 'beta', priceCents: 5000 });
    const coco = await addProduct({ name: 'Coco', slug: 'coco', priceCents: 3000, trackStock: true, stockQuantity: 2 });
    for (const product of [whey, beta, coco]) await like(product.id);
    await edit(whey.id, { priceCents: 9000 });
    await edit(beta.id, { priceCents: 4000 });
    await edit(coco.id, { priceCents: 2500 });
    expect(await notices()).toHaveLength(3);

    await call('DELETE', `/api/stores/lessari/customer/favorites/${whey.id}`, shopper);
    await edit(coco.id, { stockQuantity: 0 });
    expect(await flush()).toBe(1);
    const all = await notices();
    expect(all.every((notice) => notice.sentAt !== null)).toBe(true);
    expect((await waitForMessage(email, 10_000, 'baixou de preço')).Subject).toBe('lessari — Beta baixou de preço');
  });
});
