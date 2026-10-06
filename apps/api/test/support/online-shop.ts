// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AsaasConnection, AuthSession, CustomerOrder, CustomerOrderPaymentAnswer, Order, ProductDetail } from '@harness-monorepo/contracts';

// App
import { open, vaultKeyOf } from '../../src/modules/integrations/secret-vault.js';
import { env } from '../../src/shared/config/env.js';
import type { PrismaService } from '../../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './auth-flow.js';

/** Not a key of anyone: the fake Asaas takes whatever it is handed. */
export const ASAAS_KEY = '$aact_hmlg_e2e-online-shop-key-00000000000000000000';
const CPF = '52998224725';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * A shop that charges online, its owner and one shopper with a CPF, for the suites about what Asaas
 * tells of a payment (BEELINK-206): made through the routes, as a person would, and connected to
 * the suite's fake Asaas. Answers what a suite does next — place, read, post a webhook event.
 */
export async function openOnlineShop(app: NestFastifyApplication, prisma: PrismaService, slug: string) {
  const call = (method: Method, url: string, session?: AuthSession, payload?: object, headers: Record<string, string> = {}) =>
    app.inject({ method, url, headers: { ...(session ? { authorization: `Bearer ${session.accessToken}` } : {}), ...headers }, ...(payload ? { payload } : {}) });

  const owner = await signUpAndSignIn(app, newEmail('dona'));
  await call('POST', '/api/stores', owner, { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } });
  const variantId = (await call('POST', `/api/stores/${slug}/products`, owner, { name: 'Blusa', priceCents: 5990 })).json<ProductDetail>().variants[0]!.id;
  const connect = () => call('POST', `/api/stores/${slug}/integrations/asaas`, owner, { apiKey: ASAAS_KEY });
  expect((await connect()).json<AsaasConnection>().status).toBe('CONNECTED');
  await call('PUT', `/api/stores/${slug}/integrations/asaas/settings`, owner, { pix: true, card: true, maxInstallments: 6, offline: true });

  const email = newEmail('cliente');
  await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name: 'Bia Cliente', email, password: PASSWORD });
  await verifyEmailOf(app, email);
  const shopper = (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  await call('PATCH', `/api/stores/${slug}/customer/me`, shopper, { phone: '(11) 98888-7777', cpf: CPF });

  const storeId = (await prisma.store.findUniqueOrThrow({ where: { slug } })).id;

  /** The token Asaas would send back: sealed at the connection, opened here as the receiver opens it. */
  async function webhookToken(): Promise<string> {
    const row = await prisma.storeIntegration.findUniqueOrThrow({ where: { storeId_provider: { storeId, provider: 'ASAAS' } } });
    return (JSON.parse(open(row.secretSealed, vaultKeyOf(env.INTEGRATIONS_SECRET_KEY!), { storeId, provider: 'ASAAS' })) as { webhookToken: string }).webhookToken;
  }

  return {
    slug,
    storeId,
    owner,
    shopper,
    variantId,
    call,
    connect,
    webhookToken,
    async place(body: object = {}): Promise<CustomerOrder> {
      const response = await call('POST', `/api/stores/${slug}/customer/orders`, shopper, { items: [{ variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', paymentChannel: 'ONLINE', ...body });
      expect(response.statusCode).toBe(201);
      return response.json<CustomerOrder>();
    },
    /** One event of the shop's webhook, posted as Asaas posts it. */
    async event(body: object | string, token?: string) {
      return app.inject({ method: 'POST', url: '/api/integrations/asaas/webhook', headers: { 'content-type': 'application/json', 'asaas-access-token': token ?? (await webhookToken()) }, payload: typeof body === 'string' ? body : JSON.stringify(body) });
    },
    readPayment: async (number = 1) => (await call('GET', `/api/stores/${slug}/customer/orders/${number}/payment`, shopper)).json<CustomerOrderPaymentAnswer>().payment,
    panelOrder: async (number = 1) => (await call('GET', `/api/stores/${slug}/orders/${number}`, owner)).json<Order>(),
    orderId: async (number = 1) => (await prisma.order.findFirstOrThrow({ where: { storeId, number } })).id,
    rows: () => prisma.orderPayment.findMany({ where: { storeId }, orderBy: { createdAt: 'asc' } }),
    cancel: (number = 1) => call('POST', `/api/stores/${slug}/customer/orders/${number}/cancel`, shopper),
  };
}

export type OnlineShop = Awaited<ReturnType<typeof openOnlineShop>>;
