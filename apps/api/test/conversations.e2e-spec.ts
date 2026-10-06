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

  it('is born with the order, and either side writes in it; each counts what it has not read', async () => {
    await place();

    // The order's first status is its first line — already read: the shopper placed it themselves.
    const born = await call('GET', mine(), shopper);
    expect(born.statusCode).toBe(200);
    expect(born.json<CustomerConversation>()).toEqual({
      order: { number: 1, status: 'RECEIVED', fulfillment: 'PICKUP', open: true },
      messages: [{ kind: 'STATUS', id: expect.any(String), status: 'RECEIVED', unpaid: false, cashbackCents: null, createdAt: expect.any(String), readAt: expect.any(String) }],
      unread: 0,
    });

    const sent = await call('POST', `${mine()}/messages`, shopper, { body: '  Posso trocar o sabor?  ' });
    expect(sent.statusCode).toBe(201);
    expect(sent.json<CustomerConversation>().messages[1]).toEqual({ kind: 'MESSAGE', id: expect.any(String), author: 'CUSTOMER', body: 'Posso trocar o sabor?', createdAt: expect.any(String), readAt: null });

    expect((await call('GET', '/api/stores/lessari/conversations/unread', owner)).json<ShopConversationUnread>()).toEqual({ messages: 1, conversations: 1 });
    const panel = await call('GET', shops(), owner);
    expect(panel.json<ShopConversation>()).toMatchObject({ customer: { name: 'Bia Cliente' }, unread: 1 });

    const answered = await call('POST', `${shops()}/messages`, owner, { body: 'Pode sim.' });
    expect(answered.statusCode).toBe(201);
    expect((await call('POST', `${shops()}/read`, owner)).json<ShopConversation>().unread).toBe(0);
    expect((await call('GET', '/api/stores/lessari/conversations/unread', owner)).json<ShopConversationUnread>()).toEqual({ messages: 0, conversations: 0 });

    const read = await call('GET', mine(), shopper);
    expect(read.json<CustomerConversation>()).toMatchObject({
      unread: 1,
      messages: [{ kind: 'STATUS' }, { author: 'CUSTOMER', readAt: expect.any(String) }, { author: 'SHOP', body: 'Pode sim.', readAt: null }],
    });
    // Reading writes nothing: marking as read is its own call.
    expect((await call('GET', mine(), shopper)).json<CustomerConversation>().unread).toBe(1);
    expect((await call('POST', `${mine()}/read`, shopper)).json<CustomerConversation>().unread).toBe(0);
    // The shopper never learns which account at the shop answered.
    expect(JSON.stringify(read.json())).not.toContain(owner.user.id);
  });

  it('takes no message on a cancelled order either, and a cancel of their own is not news to the shopper', async () => {
    await place();
    await call('POST', `${mine()}/messages`, shopper, { body: 'Mudei de ideia' });
    await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper, {});

    expect((await call('POST', `${mine()}/messages`, shopper, { body: 'Ainda aí?' })).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_CONVERSATION_CLOSED' });
    expect((await call('GET', mine(), shopper)).json<CustomerConversation>()).toMatchObject({
      order: { status: 'CANCELLED', open: false },
      messages: [{ status: 'RECEIVED' }, { body: 'Mudei de ideia' }, { kind: 'STATUS', status: 'CANCELLED', readAt: expect.any(String) }],
      unread: 0,
    });
  });

  it("tells each move of the order in its conversation: news to the shopper, never to the shop", async () => {
    await place();
    const move = (status: string) => call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status });
    await move('ACCEPTED');
    await move('PREPARING');

    const read = (await call('GET', mine(), shopper)).json<CustomerConversation>();
    expect(read.messages.map((line) => (line.kind === 'STATUS' ? line.status : line.kind === 'MESSAGE' ? line.body : line.kind))).toEqual(['RECEIVED', 'ACCEPTED', 'PREPARING']);
    expect(read.unread).toBe(2);
    // The header's balloon counts them from the list.
    const [row] = (await call('GET', '/api/stores/lessari/customer/conversations', shopper)).json<CustomerConversationSummary[]>();
    expect(row).toMatchObject({ unread: 2, lastMessage: { kind: 'STATUS', status: 'PREPARING' } });

    // The shop moved it itself: nothing unread, and no row in its list until someone writes.
    expect((await call('GET', '/api/stores/lessari/conversations/unread', owner)).json<ShopConversationUnread>()).toEqual({ messages: 0, conversations: 0 });
    expect((await call('GET', '/api/stores/lessari/conversations', owner)).json<ShopConversationPage>().total).toBe(0);
    expect((await call('GET', shops(), owner)).json<ShopConversation>().unread).toBe(0);

    expect((await call('POST', `${mine()}/read`, shopper)).json<CustomerConversation>().unread).toBe(0);
    // The conversation exists from the order: the shop may write first, and then it is listed.
    expect((await call('POST', `${shops()}/messages`, owner, { body: 'Já está saindo!' })).statusCode).toBe(201);
    expect((await call('GET', '/api/stores/lessari/conversations', owner)).json<ShopConversationPage>().total).toBe(1);

    // The move that closes it is its last line.
    await move('DELIVERED');
    const closed = (await call('GET', mine(), shopper)).json<CustomerConversation>();
    expect(closed.order).toEqual({ number: 1, status: 'DELIVERED', fulfillment: 'PICKUP', open: false });
    expect(closed.messages.at(-1)).toMatchObject({ kind: 'STATUS', status: 'DELIVERED', readAt: null });
    // The shop's message and the move, both after the shopper last read.
    expect(closed.unread).toBe(2);
  });

  it('tells nothing to a customer with no account, and gives an older order its conversation at its next move', async () => {
    const registered = await call('POST', '/api/stores/lessari/orders', owner, {
      customer: { name: 'Caio Balcão', phone: '11977776666' },
      items: [{ variantId: variant, quantity: 1 }],
      fulfillment: 'PICKUP',
      paymentMethod: 'PIX',
    });
    expect(registered.statusCode).toBe(201);
    // No account to read it: no conversation, and nothing the shop can write in.
    expect((await call('GET', shops(1), owner)).json<ShopConversation>().messages).toEqual([]);
    expect((await call('POST', `${shops(1)}/messages`, owner, { body: 'Oi' })).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_CONVERSATION_NOT_FOUND' });
    expect(await prisma.orderConversation.count()).toBe(0);

    // An order placed before conversations were born with it.
    await place();
    await prisma.orderConversation.deleteMany({ where: { order: { number: 2 } } });
    await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'ACCEPTED' });
    const later = (await call('GET', mine(2), shopper)).json<CustomerConversation>();
    expect(later.messages).toEqual([{ kind: 'STATUS', id: expect.any(String), status: 'ACCEPTED', unpaid: false, cashbackCents: null, createdAt: expect.any(String), readAt: null }]);
  });

  it('closes when the order is over, and stays readable to both sides', async () => {
    await place();
    await call('POST', `${mine()}/messages`, shopper, { body: 'Chega hoje?' });
    await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'DELIVERED' });

    const closedForShopper = await call('POST', `${mine()}/messages`, shopper, { body: 'Obrigada!' });
    expect(closedForShopper.statusCode).toBe(409);
    expect(closedForShopper.json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_CONVERSATION_CLOSED' });
    expect((await call('POST', `${shops()}/messages`, owner, { body: 'De nada' })).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_CONVERSATION_CLOSED' });

    expect((await call('GET', mine(), shopper)).json<CustomerConversation>()).toMatchObject({
      order: { status: 'DELIVERED', open: false },
      messages: [{ status: 'RECEIVED' }, { body: 'Chega hoje?' }, { status: 'DELIVERED' }],
    });
    expect((await call('GET', shops(), owner)).json<ShopConversation>().order.open).toBe(false);
  });

  it('lists the shopper’s conversations open first, and the shop’s by filter and search', async () => {
    await place();
    await place();
    await call('POST', `${mine(1)}/messages`, shopper, { body: 'Sobre o primeiro' });
    await call('POST', `${mine(2)}/messages`, shopper, { body: 'Sobre o segundo' });
    await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'CANCELLED' });
    await call('POST', `${shops(1)}/read`, owner);

    await call('POST', `${shops(1)}/messages`, owner, { body: 'Resposta um' });
    await call('POST', `${shops(1)}/messages`, owner, { body: 'Resposta dois' });

    const list = (await call('GET', '/api/stores/lessari/customer/conversations', shopper)).json<CustomerConversationSummary[]>();
    const last = (row: CustomerConversationSummary) => (row.lastMessage.kind === 'STATUS' ? row.lastMessage.status : row.lastMessage.kind === 'MESSAGE' ? `${row.lastMessage.author}: ${row.lastMessage.body}` : row.lastMessage.kind);
    // Order 2 is newer, but over: the open one comes first. Each row counts what the shopper has not
    // read — the shop's answers, and the shop's cancel of order 2.
    expect(list.map((row) => [row.order.number, row.order.open, last(row), row.unread])).toEqual([
      [1, true, 'SHOP: Resposta dois', 2],
      [2, false, 'CANCELLED', 1],
    ]);

    const whole = (await call('GET', '/api/stores/lessari/conversations', owner)).json<ShopConversationPage>();
    // The shop answered order 1 last; its customer's message there is read, order 2's is not.
    expect(whole).toMatchObject({ total: 2, page: 1, pageSize: 20 });
    expect(whole.conversations.map((row) => [row.order.number, row.customer.name, row.unread])).toEqual([
      [1, 'Bia Cliente', 0],
      [2, 'Bia Cliente', 1],
    ]);

    const page = (query: string) => call('GET', `/api/stores/lessari/conversations${query}`, owner).then((response) => response.json<ShopConversationPage>().conversations.map((row) => row.order.number));
    expect(await page('')).toEqual([1, 2]);
    expect(await page('?filter=OPEN')).toEqual([1]);
    expect(await page('?filter=UNREAD')).toEqual([2]);
    expect(await page('?q=2')).toEqual([2]);
    expect(await page('?q=bia')).toEqual([1, 2]);
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

    // A shopper's token opens no panel route, a shopkeeper's none of the shopper's, and no token neither.
    expect((await call('GET', shops(), shopper)).statusCode).toBe(401);
    expect((await call('GET', mine(), owner)).statusCode).toBe(401);
    expect((await call('GET', mine())).statusCode).toBe(401);
    // A shopper of another shop is a stranger here.
    expect((await call('GET', mine(), await shopperOf('outra', 'De Outra'))).statusCode).toBe(401);
    // Another shop's owner is refused as on every panel route of a shop not theirs.
    const neighbour = await signUpAndSignIn(app, newEmail('vizinha'));
    expect((await call('GET', shops(), neighbour)).json<ApiErrorBody>()).toMatchObject({ errorCode: 'STORE_FORBIDDEN' });
    // The order's first status, and the one message that fit.
    expect(await prisma.orderMessage.count()).toBe(2);
  });
});
