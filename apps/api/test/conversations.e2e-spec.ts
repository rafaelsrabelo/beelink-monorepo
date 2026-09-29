// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, CustomerConversation, CustomerConversationSummary, ShopConversation, ShopConversationPage, ShopConversationUnread } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("an order's conversation", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let variant: string;

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
    const product = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey', priceCents: 8990 })).json<{ id: string }>();
    variant = (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
    shopper = await shopperOf('lessari', 'Bia Cliente');
  });

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function shopperOf(slug: string, name: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  /** A pick-up from the cart: received, and the shopper's own. */
  function place(session: AuthSession = shopper) {
    return call('POST', '/api/stores/lessari/customer/orders', session, { items: [{ variantId: variant, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
  }

  const mine = (number = 1) => `/api/stores/lessari/customer/orders/${number}/conversation`;
  const shops = (number = 1) => `/api/stores/lessari/orders/${number}/conversation`;

  it('opens with the shopper’s first message, and the shop answers; each side counts what it has not read', async () => {
    await place();

    const empty = await call('GET', mine(), shopper);
    expect(empty.statusCode).toBe(200);
    expect(empty.json<CustomerConversation>()).toEqual({ order: { number: 1, status: 'RECEIVED', open: true }, messages: [], unread: 0 });
    // The shop cannot open one: the customer does.
    expect((await call('POST', `${shops()}/messages`, owner, { body: 'Oi!' })).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_CONVERSATION_NOT_FOUND' });

    const sent = await call('POST', `${mine()}/messages`, shopper, { body: '  Posso trocar o sabor?  ' });
    expect(sent.statusCode).toBe(201);
    expect(sent.json<CustomerConversation>().messages).toEqual([{ id: expect.any(String), author: 'CUSTOMER', body: 'Posso trocar o sabor?', createdAt: expect.any(String), readAt: null }]);

    expect((await call('GET', '/api/stores/lessari/conversations/unread', owner)).json<ShopConversationUnread>()).toEqual({ messages: 1, conversations: 1 });
    const panel = await call('GET', shops(), owner);
    expect(panel.json<ShopConversation>()).toMatchObject({ customer: { name: 'Bia Cliente' }, unread: 1 });

    const answered = await call('POST', `${shops()}/messages`, owner, { body: 'Pode sim.' });
    expect(answered.statusCode).toBe(201);
    expect((await call('POST', `${shops()}/read`, owner)).json<ShopConversation>().unread).toBe(0);
    expect((await call('GET', '/api/stores/lessari/conversations/unread', owner)).json<ShopConversationUnread>()).toEqual({ messages: 0, conversations: 0 });

    const read = await call('GET', mine(), shopper);
    expect(read.json<CustomerConversation>()).toMatchObject({ unread: 1, messages: [{ author: 'CUSTOMER', readAt: expect.any(String) }, { author: 'SHOP', body: 'Pode sim.', readAt: null }] });
    // Reading writes nothing: marking as read is its own call.
    expect((await call('GET', mine(), shopper)).json<CustomerConversation>().unread).toBe(1);
    expect((await call('POST', `${mine()}/read`, shopper)).json<CustomerConversation>().unread).toBe(0);
    // The shopper never learns which account at the shop answered.
    expect(JSON.stringify(read.json())).not.toContain(owner.user.id);
  });

  it('closes when the order is over, and stays readable to both sides', async () => {
    await place();
    await call('POST', `${mine()}/messages`, shopper, { body: 'Chega hoje?' });
    await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'DELIVERED' });

    const closedForShopper = await call('POST', `${mine()}/messages`, shopper, { body: 'Obrigada!' });
    expect(closedForShopper.statusCode).toBe(409);
    expect(closedForShopper.json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_CONVERSATION_CLOSED' });
    expect((await call('POST', `${shops()}/messages`, owner, { body: 'De nada' })).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_CONVERSATION_CLOSED' });

    expect((await call('GET', mine(), shopper)).json<CustomerConversation>()).toMatchObject({ order: { status: 'DELIVERED', open: false }, messages: [{ body: 'Chega hoje?' }] });
    expect((await call('GET', shops(), owner)).json<ShopConversation>().order.open).toBe(false);
  });

  it('lists the shopper’s conversations open first, and the shop’s by filter and search', async () => {
    await place();
    await place();
    await call('POST', `${mine(1)}/messages`, shopper, { body: 'Sobre o primeiro' });
    await call('POST', `${mine(2)}/messages`, shopper, { body: 'Sobre o segundo' });
    await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'CANCELLED' });
    await call('POST', `${shops(1)}/read`, owner);

    const list = (await call('GET', '/api/stores/lessari/customer/conversations', shopper)).json<CustomerConversationSummary[]>();
    // Order 2 is newer, but over: the open one comes first.
    expect(list.map((row) => [row.order.number, row.order.open, row.lastMessage.body])).toEqual([
      [1, true, 'Sobre o primeiro'],
      [2, false, 'Sobre o segundo'],
    ]);

    const page = (query: string) => call('GET', `/api/stores/lessari/conversations${query}`, owner).then((response) => response.json<ShopConversationPage>().conversations.map((row) => row.order.number));
    expect(await page('')).toEqual([2, 1]);
    expect(await page('?filter=OPEN')).toEqual([1]);
    expect(await page('?filter=UNREAD')).toEqual([2]);
    expect(await page('?q=2')).toEqual([2]);
    expect(await page('?q=bia')).toEqual([2, 1]);
    expect(await page('?q=ninguem')).toEqual([]);
    expect((await call('GET', '/api/stores/lessari/conversations?filter=TODAS', owner)).statusCode).toBe(400);
  });

  it("answers another customer's order, another shop's, a blank message and a long one as they deserve", async () => {
    await place();
    const other = await shopperOf('lessari', 'Outra Pessoa');

    const stranger = await call('GET', mine(1), other);
    expect(stranger.statusCode).toBe(404);
    expect(stranger.json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_NOT_FOUND' });
    expect((await call('POST', `${mine(1)}/messages`, other, { body: 'Oi' })).statusCode).toBe(404);
    expect((await call('GET', '/api/stores/outra/orders/1/conversation', owner)).statusCode).toBe(404);

    expect((await call('POST', `${mine()}/messages`, shopper, { body: '   ' })).statusCode).toBe(400);
    expect((await call('POST', `${mine()}/messages`, shopper, { body: 'a'.repeat(2001) })).statusCode).toBe(400);
    // Counted as the column counts: an emoji with its variation selector is two.
    expect((await call('POST', `${mine()}/messages`, shopper, { body: '❤️'.repeat(1001) })).statusCode).toBe(400);
    expect((await call('POST', `${mine()}/messages`, shopper, { body: 'a'.repeat(2000) })).statusCode).toBe(201);

    // A shopper's token opens no panel route, and no token opens the shopper's.
    expect((await call('GET', shops(), shopper)).statusCode).toBe(401);
    expect((await call('GET', mine())).statusCode).toBe(401);
    expect(await prisma.orderMessage.count()).toBe(1);
  });
});
