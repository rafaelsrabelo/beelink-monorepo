// Node
import { readFileSync } from 'node:fs';
import { Writable } from 'node:stream';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { Logger, PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';

// Types
import type { AuthSession, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { requestLogOptions } from '../src/app.module.js';
import { BillingEvents } from '../src/modules/billing/billing-events.service.js';
import { BillingRoutine } from '../src/modules/billing/billing-routine.js';
import { PLATFORM_WEBHOOK_EVENTS } from '../src/modules/billing/billing.constants.js';
import { PlatformWebhookKeeper } from '../src/modules/billing/platform-webhook-keeper.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

/** Made up, in the shape of real ones — and set as this deployment's, before anything reads the environment. */
const { KEY, TOKEN } = vi.hoisted(() => {
  const secrets = {
    KEY: '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA6OiRhYWNoX2U5ZjM',
    TOKEN: 'nX0bq3l8V7mYkU2sA9cR4tE6wZ1pH5jD0fG8iK3oL2M=',
  };
  process.env.ASAAS_ENV = 'sandbox';
  process.env.ASAAS_PLATFORM_API_KEY = secrets.KEY;
  process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN = secrets.TOKEN;
  process.env.BILLING_ENFORCED = 'true';
  // A public https web, so the webhook has an address Asaas could reach.
  process.env.WEB_URL = 'https://beelink.test';
  return secrets;
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');
const SANDBOX = 'https://api-sandbox.asaas.com/v3';
const WEBHOOK = '/api/billing/asaas/webhook';
const SUBSCRIPTION = 'sub_cwtxq513jlpjfid1';
const CUSTOMER = 'cus_000009459220';
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };

/** What Asaas sends of a card beside its brand and last digits. No shape of bee-link's has a place for it. */
const CARD_TOKEN = 'a75a1d98-c52d-4a6b-a413-71e00b193c99';
const card = { creditCardNumber: '8829', creditCardBrand: 'MASTERCARD', creditCardToken: CARD_TOKEN };

const today = (): string => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

type Answer = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

describe("bee-link's own webhook and the read of a payment, with the real client and a log that is read (BEELINK-221)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let events: BillingEvents;
  let owner: AuthSession;
  let reference: string;

  /** What pino wrote, a line each: the application's own options, at every level. */
  const logged: string[] = [];
  /** What was sent to Asaas, and what this suite's Asaas answers next. */
  const sent: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  let answering: Answer[] = [];

  const json = (status: number, body: unknown): Answer => () => Response.json(body, { status });
  const list = (...data: unknown[]) => json(200, { object: 'list', hasMore: false, totalCount: data.length, data });
  /** As the sandbox answered on 14/10/2026, paid with a card at the invoice. */
  const subscriptionBody = { object: 'subscription', id: SUBSCRIPTION, customer: CUSTOMER, value: 59.9, nextDueDate: '2099-01-01', cycle: 'MONTHLY', billingType: 'CREDIT_CARD', deleted: false, status: 'ACTIVE', externalReference: '', creditCard: card };
  const chargeBody = (change: object = {}) => ({ object: 'payment', id: 'pay_bnngnr5rfx14wgvj', customer: CUSTOMER, subscription: SUBSCRIPTION, value: 59.9, billingType: 'CREDIT_CARD', status: 'CONFIRMED', dueDate: today(), paymentDate: today(), confirmedDate: today(), invoiceUrl: 'https://sandbox.asaas.com/i/bnngnr5rfx14wgvj', externalReference: reference, deleted: false, creditCard: card, ...change });

  /** Nothing written or answered holds the key or the token, in whole or in part. */
  function expectNoSecretIn(...texts: string[]) {
    const all = [logged.join(''), ...texts].join('\n');
    for (const secret of [KEY, KEY.slice('$aact_hmlg_'.length), KEY.slice(1, 40), TOKEN, TOKEN.slice(0, 24)]) expect(all).not.toContain(secret);
  }

  async function deliver(body: object, token: string | null) {
    const response = await app.inject({ method: 'POST', url: WEBHOOK, headers: { 'content-type': 'application/json', ...(token === null ? {} : { 'asaas-access-token': token }) }, payload: JSON.stringify(body) });
    await events.settled();
    return response;
  }

  beforeAll(async () => {
    const reach = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = input instanceof Request ? input.url : String(input);
      // Mailpit, which the sign-up reads, is reached as ever; nothing else leaves this machine.
      if (!/asaas\.com/i.test(url)) return reach(input, init);
      sent.push({ url, method: String(init?.method), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body ?? 'null')) as unknown });
      const next = answering.shift();
      if (!next) throw new Error(`This suite's Asaas was not expected to be asked for ${url}`);
      return next(url, init);
    });

    const sink = new Writable({
      write(chunk: Buffer, _encoding, done) {
        logged.push(chunk.toString());
        done();
      },
    });

    app = await createTestApp((builder) => builder.overrideProvider(PARAMS_PROVIDER_TOKEN).useValue({ pinoHttp: [{ ...requestLogOptions, level: 'trace' }, sink] }));
    app.useLogger(app.get(Logger));
    prisma = app.get(PrismaService);
    events = app.get(BillingEvents);
    await resetDatabase(prisma);
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    const authorization = { authorization: `Bearer ${owner.accessToken}` };
    await app.inject({ method: 'POST', url: '/api/stores', headers: authorization, payload: { name: 'Padaria da Lia', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } } });
    answering = [list(), json(200, { object: 'customer', id: CUSTOMER, deleted: false })];
    const saved = await app.inject({ method: 'PUT', url: '/api/billing/account', headers: authorization, payload: person });
    if (saved.statusCode !== 200) throw new Error(`PUT /billing/account answered ${saved.statusCode}: ${saved.payload}`);

    // The page chose the monthly plan, as BEELINK-292 writes it.
    const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: 'beelink' } });
    const row = await prisma.storeSubscription.findFirstOrThrow();
    reference = `beelink-subscription-${row.id}`;
    subscriptionBody.externalReference = reference;
    await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionId: SUBSCRIPTION, planId: plan.id, cycle: 'MONTHLY', priceCents: 5990, firstDueDate: new Date(`${today()}T00:00:00.000Z`), invoiceUrl: 'https://sandbox.asaas.com/i/bnngnr5rfx14wgvj' } });
  });

  afterAll(async () => {
    await events.settled();
    await app.close();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    logged.length = 0;
    sent.length = 0;
    answering = [];
  });

  it('refuses a delivery without the token, or with another — and neither is in the log or the answer', async () => {
    const event = { id: 'evt_refused', event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', subscription: SUBSCRIPTION, externalReference: reference } };
    const guessed = 'Z'.repeat(44);

    const responses = [await deliver(event, null), await deliver(event, guessed)];

    for (const response of responses) expect(response.statusCode).toBe(401);
    // The requests were logged, so the log was being written: its silence about the tokens is not an empty log's.
    expect(logged.join('')).toContain(WEBHOOK);
    expect(logged.join('')).not.toContain(guessed);
    expectNoSecretIn(...responses.map((response) => response.payload));
    expect(sent).toEqual([]);
  });

  it('reads a card payment at Asaas with the key, and keeps of the card its brand and last four digits alone', async () => {
    answering = [json(200, subscriptionBody), list(chargeBody())];

    const response = await deliver({ id: 'evt_paid', event: 'PAYMENT_CONFIRMED', payment: { object: 'payment', id: 'pay_bnngnr5rfx14wgvj', subscription: SUBSCRIPTION, externalReference: reference, creditCard: card } }, TOKEN);

    expect(response.json()).toEqual({ result: 'RECORDED' });
    expect(sent.map(({ method, url }) => [method, url])).toEqual([
      ['GET', `${SANDBOX}/subscriptions/${SUBSCRIPTION}`],
      ['GET', `${SANDBOX}/subscriptions/${SUBSCRIPTION}/payments?limit=100&offset=0`],
    ]);
    for (const request of sent) expect(request.headers).toMatchObject({ access_token: KEY });

    const row = await prisma.storeSubscription.findFirstOrThrow();
    expect(row).toMatchObject({ status: 'ACTIVE', paymentMethod: 'CREDIT_CARD', cardBrand: 'MASTERCARD', cardLast4: '8829', invoiceUrl: null });
    const read = await app.inject({ method: 'GET', url: '/api/stores/padaria/subscription', headers: { authorization: `Bearer ${owner.accessToken}` } });
    expect(read.json<StoreSubscriptionAnswer>().subscription!.card).toEqual({ brand: 'MASTERCARD', last4: '8829' });
    for (const text of [JSON.stringify(row), read.payload, response.payload, logged.join(''), JSON.stringify(await prisma.billingEvent.findMany())]) {
      expect(text).not.toContain(CARD_TOKEN);
    }
    expectNoSecretIn(read.payload, response.payload);
  });

  it('registers the webhook with the token — which goes to Asaas and nowhere else, though Asaas repeats it', async () => {
    answering = [list({ id: 'other', name: 'Another product', url: 'https://other.test/hook', enabled: true, interrupted: false, hasAuthToken: true }), json(200, { id: 'f9dbfd31', url: 'https://beelink.test/api/billing/asaas/webhook', enabled: true, interrupted: false, hasAuthToken: true, authToken: TOKEN })];

    expect(await app.get(PlatformWebhookKeeper).keep()).toBe('REGISTERED');

    expect(sent.map(({ method, url }) => [method, url])).toEqual([
      ['GET', `${SANDBOX}/webhooks?limit=100&offset=0`],
      ['POST', `${SANDBOX}/webhooks`],
    ]);
    expect(sent[1]!.body).toEqual({
      name: 'bee-link (assinaturas)',
      url: 'https://beelink.test/api/billing/asaas/webhook',
      email: 'contato@beecoders.net',
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: TOKEN,
      sendType: 'SEQUENTIALLY',
      events: [...PLATFORM_WEBHOOK_EVENTS],
    });
    expect(logged.join('')).toContain("bee-link's own Asaas webhook was registered");
    expectNoSecretIn();
  });

  it("logs a refusal that repeats the token and the key with neither, when the routine's look at the webhook fails", async () => {
    answering = [list(), json(400, { errors: [{ code: 'invalid_object', description: `O token ${TOKEN} da chave ${KEY} não serve` }] })];

    await app.get(BillingRoutine).pass(new Date());

    expect(sent.map(({ method }) => method)).toEqual(['GET', 'POST']);
    const failed = logged.join('');
    expect(failed).toContain("Could not keep bee-link's own Asaas webhook");
    expect(failed).toContain('[token]');
    expectNoSecretIn();
  });
});
