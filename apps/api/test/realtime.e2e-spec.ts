// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { io, type Socket } from 'socket.io-client';

// Types
import type { ApiErrorBody, AuthSession, RealtimeEvent, RealtimeTicket } from '@harness-monorepo/contracts';
import type { RealtimeAudienceOf } from '../src/modules/realtime/realtime-publisher.js';

// App
import { RealtimePublisher } from '../src/modules/realtime/realtime-publisher.js';
import { env } from '../src/shared/config/env.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

/** A socket that keeps every event it hears, and why it was let go, to wait on. */
interface Listening {
  socket: Socket;
  events: RealtimeEvent[];
  closed: Promise<string>;
}

/** Sent through the publisher after what is under test: a socket that heard it heard everything sent before. */
const MARKER = { type: 'conversation.closed', orderNumber: 999 } as const satisfies RealtimeEvent;

describe('the real-time channel', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let url: string;
  let owner: AuthSession;
  let shopper: AuthSession;
  let variant: string;
  const open: Socket[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
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

  afterEach(() => {
    for (const socket of open.splice(0)) socket.disconnect();
  });

  function call(method: 'GET' | 'POST' | 'PATCH', path: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url: path, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function shopperOf(slug: string, name: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  const shopTicket = async (session = owner, slug = 'lessari') => (await call('POST', `/api/stores/${slug}/realtime/ticket`, session)).json<RealtimeTicket>().ticket;
  const customerTicket = async (session = shopper, slug = 'lessari') => (await call('POST', `/api/stores/${slug}/customer/realtime/ticket`, session)).json<RealtimeTicket>().ticket;
  const placeOrder = (session = shopper) => call('POST', '/api/stores/lessari/customer/orders', session, { items: [{ variantId: variant, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
  const storeIdOf = async (slug: string) => (await prisma.store.findUniqueOrThrow({ where: { slug } })).id;
  const customerIdOf = async (session: AuthSession) => (await prisma.customer.findFirstOrThrow({ where: { userId: session.user.id } })).id;

  /** Connects with a ticket; resolves once in, rejects with the refusal's message. */
  function connect(ticket: string | undefined, transports: ('websocket' | 'polling')[] = ['websocket']): Promise<Listening> {
    return new Promise((resolve, reject) => {
      const socket = io(url, { path: '/api/socket.io', transports, auth: ticket === undefined ? {} : { ticket }, reconnection: false, forceNew: true });
      open.push(socket);
      const events: RealtimeEvent[] = [];
      const closed = new Promise<string>((settle) => socket.once('disconnect', (reason) => settle(reason)));
      socket.on('event', (event: RealtimeEvent) => events.push(event));
      socket.once('connect', () => resolve({ socket, events, closed }));
      socket.once('connect_error', (error) => reject(error));
    });
  }

  /** Waits until the socket heard an event like that one, and answers it. */
  async function heard(listening: Listening, like: Partial<RealtimeEvent> & Pick<RealtimeEvent, 'type'>): Promise<RealtimeEvent> {
    for (let tries = 0; tries < 50; tries += 1) {
      const event = listening.events.find((entry) => Object.entries(like).every(([key, value]) => (entry as Record<string, unknown>)[key] === value));
      if (event) return event;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Never heard ${JSON.stringify(like)}; heard ${JSON.stringify(listening.events)}`);
  }

  /** What each socket heard before the marker: all that reached it, with nothing left in flight. */
  async function settled(to: RealtimeAudienceOf, ...listening: Listening[]): Promise<RealtimeEvent[][]> {
    app.get(RealtimePublisher).publish(to, MARKER);
    for (const each of listening) await heard(each, MARKER);
    return listening.map((each) => each.events.slice(0, each.events.findIndex((event) => event.orderNumber === MARKER.orderNumber)));
  }

  it("tells the shop's room and the shopper's room what changed on the shopper's order and conversation", async () => {
    const panel = await connect(await shopTicket());
    const window = await connect(await customerTicket());

    await placeOrder();
    expect(await heard(panel, { type: 'order.created' })).toEqual({ type: 'order.created', orderNumber: 1 });
    await heard(window, { type: 'order.created', orderNumber: 1 });

    await call('POST', '/api/stores/lessari/customer/orders/1/conversation/messages', shopper, { body: 'Oi' });
    expect(await heard(panel, { type: 'conversation.message' })).toEqual({ type: 'conversation.message', orderNumber: 1, author: 'CUSTOMER' });
    await call('POST', '/api/stores/lessari/orders/1/conversation/read', owner);
    await heard(window, { type: 'conversation.read', reader: 'SHOP' });
    await call('POST', '/api/stores/lessari/orders/1/conversation/messages', owner, { body: 'Olá!' });
    await heard(window, { type: 'conversation.message', author: 'SHOP' });
    await call('POST', '/api/stores/lessari/customer/orders/1/conversation/read', shopper);
    await heard(panel, { type: 'conversation.read', reader: 'CUSTOMER' });

    // A read of nothing new tells nobody.
    await call('POST', '/api/stores/lessari/orders/1/conversation/read', owner);
    const [beforeMarker] = await settled({ storeId: await storeIdOf('lessari'), customerId: null }, panel);
    expect(beforeMarker?.filter((event) => event.type === 'conversation.read' && event.reader === 'SHOP')).toHaveLength(1);

    await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'DELIVERED' });
    await heard(window, { type: 'order.status', orderNumber: 1, status: 'DELIVERED' });
    await heard(panel, { type: 'conversation.closed', orderNumber: 1 });
    await heard(window, { type: 'conversation.closed', orderNumber: 1 });
  });

  it("tells both rooms the shopper's cancel, and the conversation it closes", async () => {
    const panel = await connect(await shopTicket());
    const window = await connect(await customerTicket());
    await placeOrder();
    await call('POST', '/api/stores/lessari/customer/orders/1/conversation/messages', shopper, { body: 'Posso cancelar?' });

    expect((await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper)).statusCode).toBe(200);
    for (const room of [panel, window]) {
      await heard(room, { type: 'order.status', orderNumber: 1, status: 'CANCELLED' });
      await heard(room, { type: 'conversation.closed', orderNumber: 1 });
    }
  });

  it('tells the shopper of an order the panel took for them', async () => {
    const window = await connect(await customerTicket());
    const customer = { id: await customerIdOf(shopper) };
    await call('POST', '/api/stores/lessari/orders', owner, { customer, items: [{ variantId: variant, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
    await heard(window, { type: 'order.created', orderNumber: 1 });
  });

  it('keeps each room its own: another shop and another shopper hear nothing', async () => {
    const neighbour = await connect(await shopTicket(owner, 'outra'));
    const other = await shopperOf('lessari', 'Outra Pessoa');
    const stranger = await connect(await customerTicket(other));
    const panel = await connect(await shopTicket());

    await placeOrder();
    await heard(panel, { type: 'order.created' });

    const heardBefore = await settled({ storeId: await storeIdOf('outra'), customerId: await customerIdOf(other) }, neighbour, stranger);
    expect(heardBefore).toEqual([[], []]);
  });

  it('lets a ticket in once, and none that is unknown, missing or past its minute', async () => {
    const ticket = await shopTicket();
    await connect(ticket);
    await expect(connect(ticket)).rejects.toThrow('REALTIME_TICKET_INVALID');
    await expect(connect('x'.repeat(43))).rejects.toThrow('REALTIME_TICKET_INVALID');
    await expect(connect(undefined)).rejects.toThrow('REALTIME_TICKET_INVALID');

    const late = await customerTicket();
    await prisma.realtimeTicket.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(connect(late)).rejects.toThrow('REALTIME_TICKET_INVALID');
  });

  it('lets one socket in when two race for the same ticket', async () => {
    const ticket = await shopTicket();
    const raced = await Promise.allSettled([connect(ticket), connect(ticket)]);
    expect(raced.map((attempt) => attempt.status).sort()).toEqual(['fulfilled', 'rejected']);
  });

  it('gives each side its own ticket, and no other', async () => {
    expect((await call('POST', '/api/stores/lessari/realtime/ticket', shopper)).statusCode).toBe(401);
    expect((await call('POST', '/api/stores/lessari/customer/realtime/ticket', owner)).statusCode).toBe(401);
    const neighbour = await signUpAndSignIn(app, newEmail('vizinha'));
    expect((await call('POST', '/api/stores/lessari/realtime/ticket', neighbour)).json<ApiErrorBody>()).toMatchObject({ errorCode: 'STORE_FORBIDDEN' });

    const issued = (await call('POST', '/api/stores/lessari/realtime/ticket', owner)).json<RealtimeTicket>();
    expect(issued.ticket).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // Stored by its hash: the ticket itself is nowhere in the database.
    expect(JSON.stringify(await prisma.realtimeTicket.findMany())).not.toContain(issued.ticket);
  });

  it('closes the sockets of a session that ends, and takes no ticket it had asked for', async () => {
    const panel = await connect(await shopTicket());
    const unused = await shopTicket();
    const window = await connect(await customerTicket());

    expect((await call('POST', '/api/auth/logout', undefined, { refreshToken: owner.refreshToken })).statusCode).toBe(204);
    expect(await panel.closed).toBe('io server disconnect');
    await expect(connect(unused)).rejects.toThrow('REALTIME_TICKET_INVALID');
    // Another session's socket stays.
    expect(window.socket.connected).toBe(true);
  });

  it('answers long-polling too, and its CORS names the web alone', async () => {
    const polling = await connect(await shopTicket(), ['polling']);
    await placeOrder();
    await heard(polling, { type: 'order.created' });

    const handshake = (origin: string) => fetch(`${url}/api/socket.io/?EIO=4&transport=polling`, { headers: { origin } });
    const [web = ''] = env.CORS_ORIGINS;
    expect((await handshake(web)).headers.get('access-control-allow-origin')).toBe(web);
    expect((await handshake('https://outro-site.example')).headers.get('access-control-allow-origin')).toBeNull();
  });
});
