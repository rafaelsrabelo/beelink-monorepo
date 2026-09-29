// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { io, type Socket } from 'socket.io-client';

// Types
import type { ApiErrorBody, AuthSession, RealtimeEvent, RealtimeTicket } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

/** A socket that keeps every event it hears, to wait on. */
interface Listening {
  socket: Socket;
  events: RealtimeEvent[];
}

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

  /** Connects with a ticket; resolves once in, rejects with the refusal's message. */
  function connect(ticket: string | undefined): Promise<Listening> {
    return new Promise((resolve, reject) => {
      const socket = io(url, { path: '/api/socket.io', transports: ['websocket'], auth: ticket === undefined ? {} : { ticket }, reconnection: false, forceNew: true });
      open.push(socket);
      const events: RealtimeEvent[] = [];
      socket.on('event', (event: RealtimeEvent) => events.push(event));
      socket.once('connect', () => resolve({ socket, events }));
      socket.once('connect_error', (error) => reject(error));
    });
  }

  /** Waits until the socket heard an event of that type, and answers it. */
  async function heard(listening: Listening, type: RealtimeEvent['type']): Promise<RealtimeEvent> {
    for (let tries = 0; tries < 50; tries += 1) {
      const event = listening.events.find((entry) => entry.type === type);
      if (event) return event;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Never heard ${type}; heard ${JSON.stringify(listening.events)}`);
  }

  it("tells the shop's room and the shopper's room what changed on the shopper's order and conversation", async () => {
    const panel = await connect(await shopTicket());
    const window = await connect(await customerTicket());

    await call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId: variant, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
    expect(await heard(panel, 'order.created')).toEqual({ type: 'order.created', orderNumber: 1 });
    expect(await heard(window, 'order.created')).toEqual({ type: 'order.created', orderNumber: 1 });

    await call('POST', '/api/stores/lessari/customer/orders/1/conversation/messages', shopper, { body: 'Oi' });
    expect(await heard(panel, 'conversation.message')).toEqual({ type: 'conversation.message', orderNumber: 1, author: 'CUSTOMER' });
    await call('POST', '/api/stores/lessari/orders/1/conversation/read', owner);
    expect(await heard(window, 'conversation.read')).toEqual({ type: 'conversation.read', orderNumber: 1, reader: 'SHOP' });

    await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'DELIVERED' });
    expect(await heard(window, 'order.status')).toEqual({ type: 'order.status', orderNumber: 1, status: 'DELIVERED' });
    expect(await heard(panel, 'conversation.closed')).toEqual({ type: 'conversation.closed', orderNumber: 1 });
  });

  it('keeps each room its own: another shop and another shopper hear nothing', async () => {
    const neighbour = await connect(await shopTicket(owner, 'outra'));
    const stranger = await connect(await customerTicket(await shopperOf('lessari', 'Outra Pessoa')));
    const panel = await connect(await shopTicket());

    await call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId: variant, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
    await heard(panel, 'order.created');

    expect(neighbour.events).toEqual([]);
    expect(stranger.events).toEqual([]);
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
});
