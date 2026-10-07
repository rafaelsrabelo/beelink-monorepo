// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, OrderPage, OrderStatus, PanelCounts, ShopConversationUnread, StoreReviewsUnseen } from '@harness-monorepo/contracts';

// App
import { RealtimePublisher } from '../src/modules/realtime/realtime-publisher.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const NOTHING: PanelCounts = { openOrders: 0, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 };

describe("the panel menu's counts (BEELINK-309)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  const variants: Record<string, string> = {};

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
    for (const slug of ['lessari', 'outra']) {
      await call('POST', '/api/stores', owner, shopBody(slug));
      const product = (await call('POST', `/api/stores/${slug}/products`, owner, { name: 'Whey', priceCents: 8990 })).json<{ id: string }>();
      variants[slug] = (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
    }
    shopper = await shopperOf('lessari');
  });

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function shopperOf(slug: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name: 'Bia Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  /** A pick-up from the cart: received. Answers its number in the shop. */
  async function place(slug = 'lessari', session: AuthSession = shopper): Promise<number> {
    const response = await call('POST', `/api/stores/${slug}/customer/orders`, session, { items: [{ variantId: variants[slug], quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
    expect(response.statusCode).toBe(201);
    return response.json<{ number: number }>().number;
  }

  const move = (number: number, status: OrderStatus, slug = 'lessari') => call('PATCH', `/api/stores/${slug}/orders/${number}/status`, owner, { status });
  const counts = async (slug = 'lessari') => (await call('GET', `/api/stores/${slug}/panel-counts`, owner)).json<PanelCounts>();

  it('answers nothing waiting for a shop with nothing in it', async () => {
    const response = await call('GET', '/api/stores/lessari/panel-counts', owner);

    expect(response.statusCode).toBe(200);
    expect(response.json<PanelCounts>()).toEqual(NOTHING);
  });

  it('is the owner’s alone: no session, a stranger, a shopper and a shop that is not there are all refused', async () => {
    await place();
    const stranger = await signUpAndSignIn(app, newEmail('estranho'));

    expect((await call('GET', '/api/stores/lessari/panel-counts')).json<ApiErrorBody>()).toMatchObject({ statusCode: 401, errorCode: 'AUTH_UNAUTHENTICATED' });
    expect((await call('GET', '/api/stores/lessari/panel-counts', stranger)).json<ApiErrorBody>()).toMatchObject({ statusCode: 403, errorCode: 'STORE_FORBIDDEN' });
    // A shopper's token opens no panel route, not even at the shop it was given by.
    expect((await call('GET', '/api/stores/lessari/panel-counts', shopper)).statusCode).toBe(401);
    expect((await call('GET', '/api/stores/nenhuma/panel-counts', owner)).json<ApiErrorBody>()).toMatchObject({ statusCode: 404, errorCode: 'STORE_NOT_FOUND' });
  });

  it.each<[OrderStatus, number]>([
    ['RECEIVED', 1],
    ['ACCEPTED', 1],
    ['PREPARING', 1],
    ['OUT_FOR_DELIVERY', 1],
    ['DELIVERED', 0],
    ['CANCELLED', 0],
  ])('counts an order that is %s as %i open', async (status, open) => {
    const number = await place();
    if (status !== 'RECEIVED') expect((await move(number, status)).statusCode).toBe(200);

    expect((await counts()).openOrders).toBe(open);
  });

  it('goes up with each order placed, down as one is delivered or cancelled — by the shop or by its customer', async () => {
    const [first, second, third] = [await place(), await place(), await place()];
    expect((await counts()).openOrders).toBe(3);

    await move(first, 'ACCEPTED');
    await move(first, 'OUT_FOR_DELIVERY');
    expect((await counts()).openOrders).toBe(3);

    await move(first, 'DELIVERED');
    expect((await counts()).openOrders).toBe(2);

    await move(second, 'CANCELLED');
    expect((await counts()).openOrders).toBe(1);

    expect((await call('POST', `/api/stores/lessari/customer/orders/${third}/cancel`, shopper, {})).statusCode).toBeLessThan(300);
    expect((await counts()).openOrders).toBe(0);

    // A delivered order the shop takes back is on its hands again.
    await move(first, 'PREPARING');
    expect((await counts()).openOrders).toBe(1);
  });

  it('counts an order the shop registered itself: it starts accepted, and is still to be handed over', async () => {
    const registered = await call('POST', '/api/stores/lessari/orders', owner, {
      customer: { name: 'Caio Balcão', phone: '(11) 97777-6666' },
      items: [{ variantId: variants.lessari, quantity: 1 }],
      fulfillment: 'PICKUP',
      paymentMethod: 'PIX',
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json<{ status: OrderStatus }>().status).toBe('ACCEPTED');

    expect((await counts()).openOrders).toBe(1);
  });

  it('never counts another shop’s orders, messages or reviews — not even its own owner’s other shop', async () => {
    const neighbour = await shopperOf('outra');
    const number = await place('outra', neighbour);
    await call('POST', `/api/stores/outra/customer/orders/${number}/conversation/messages`, neighbour, { body: 'Oi' });

    expect(await counts('outra')).toEqual({ ...NOTHING, openOrders: 1, unreadConversations: 1, unreadMessages: 1 });
    expect(await counts('lessari')).toEqual(NOTHING);
  });

  it('is the total of the list filtered by OPEN: one rule for the number and for the list that explains it', async () => {
    const numbers = [await place(), await place(), await place(), await place()];
    await move(numbers[0]!, 'PREPARING');
    await move(numbers[1]!, 'DELIVERED');
    await move(numbers[2]!, 'CANCELLED');

    const open = (await call('GET', '/api/stores/lessari/orders?status=OPEN', owner)).json<OrderPage>();
    expect(open.orders.map((order) => order.number).sort()).toEqual([numbers[0], numbers[3]]);
    expect(open.orders.map((order) => order.status).sort()).toEqual(['PREPARING', 'RECEIVED']);
    expect((await counts()).openOrders).toBe(open.total);

    // A single status still filters as it did, and a word that is neither is refused.
    expect((await call('GET', '/api/stores/lessari/orders?status=DELIVERED', owner)).json<OrderPage>().total).toBe(1);
    expect((await call('GET', '/api/stores/lessari/orders?status=CLOSED', owner)).statusCode).toBe(400);
  });

  it('counts unread conversations and their messages exactly as the conversations’ own count does', async () => {
    const [first, second] = [await place(), await place()];
    const say = (number: number, body: string) => call('POST', `/api/stores/lessari/customer/orders/${number}/conversation/messages`, shopper, { body });
    await say(first, 'Posso trocar o sabor?');
    await say(first, 'Alô?');
    await say(second, 'Que horas abre?');

    const unread = (await call('GET', '/api/stores/lessari/conversations/unread', owner)).json<ShopConversationUnread>();
    expect(unread).toEqual({ messages: 3, conversations: 2 });
    expect(await counts()).toMatchObject({ unreadConversations: unread.conversations, unreadMessages: unread.messages });

    // Opening one — the panel marks it read — takes it, and its messages, off the count.
    await call('POST', `/api/stores/lessari/orders/${first}/conversation/read`, owner);
    expect(await counts()).toMatchObject({ unreadConversations: 1, unreadMessages: 1 });

    // The shop's own answer and the order's moves add nothing: unread for the shop is what a customer wrote.
    await call('POST', `/api/stores/lessari/orders/${second}/conversation/messages`, owner, { body: 'Às 9h.' });
    await move(second, 'ACCEPTED');
    expect(await counts()).toMatchObject({ unreadConversations: 1, unreadMessages: 1 });

    await call('POST', `/api/stores/lessari/orders/${second}/conversation/read`, owner);
    expect(await counts()).toMatchObject({ unreadConversations: 0, unreadMessages: 0 });
  });

  it('counts the reviews written since the owner last opened their list, as the reviews’ own count does', async () => {
    const number = await place();
    await move(number, 'DELIVERED');
    const productId = (await prisma.product.findFirstOrThrow({ where: { store: { slug: 'lessari' } } })).id;
    expect((await call('POST', '/api/stores/lessari/customer/reviews', shopper, { productId, rating: 5 })).statusCode).toBe(201);

    expect((await call('GET', '/api/stores/lessari/reviews/unseen', owner)).json<StoreReviewsUnseen>()).toEqual({ count: 1 });
    expect(await counts()).toEqual({ ...NOTHING, unseenReviews: 1 });

    await call('POST', '/api/stores/lessari/reviews/seen', owner, {});
    expect(await counts()).toEqual(NOTHING);
  });

  it('has an event told to the shop for every change of the open count, each after its write', async () => {
    const told = vi.spyOn(app.get(RealtimePublisher), 'publish');
    const events = () => told.mock.calls.map(([, event]) => event).filter((event) => event.type === 'order.created' || event.type === 'order.status');

    const [first, second] = [await place(), await place()];
    await move(first, 'ACCEPTED');
    await move(first, 'DELIVERED');
    await call('POST', `/api/stores/lessari/customer/orders/${second}/cancel`, shopper, {});
    await call('POST', '/api/stores/lessari/orders', owner, { customer: { name: 'Caio Balcão', phone: '(11) 97777-6666' }, items: [{ variantId: variants.lessari, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });

    expect(events()).toEqual([
      { type: 'order.created', orderNumber: first, placedBy: 'CUSTOMER' },
      { type: 'order.created', orderNumber: second, placedBy: 'CUSTOMER' },
      { type: 'order.status', orderNumber: first, status: 'ACCEPTED' },
      { type: 'order.status', orderNumber: first, status: 'DELIVERED' },
      { type: 'order.status', orderNumber: second, status: 'CANCELLED' },
      { type: 'order.created', orderNumber: 3, placedBy: 'SHOP' },
    ]);
    // By the time the shop is told, the count already reads the write.
    expect((await counts()).openOrders).toBe(1);
    // A move the API refuses tells nobody: out of cancelled there is no way.
    told.mockClear();
    expect((await move(second, 'ACCEPTED')).statusCode).toBe(409);
    expect(events()).toEqual([]);
    told.mockRestore();
  });
});
