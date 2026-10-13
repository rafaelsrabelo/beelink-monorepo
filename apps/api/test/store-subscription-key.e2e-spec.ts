// Node
import { readFileSync } from 'node:fs';
import { Writable } from 'node:stream';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { Logger, PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';

// Types
import type { ApiErrorBody, AuthSession, SubscriptionChoice } from '@harness-monorepo/contracts';

// App
import { requestLogOptions } from '../src/app.module.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

/** Made up, in the shape of a real one — and set as this deployment's, before anything reads the environment. */
const KEY = vi.hoisted(() => {
  const key = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA6OiRhYWNoX2U5ZjM';
  process.env.ASAAS_ENV = 'sandbox';
  process.env.ASAAS_PLATFORM_API_KEY = key;
  process.env.BILLING_ENFORCED = 'true';
  return key;
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');
const PATH = '/api/stores/padaria/subscription';
const SANDBOX = 'https://api-sandbox.asaas.com/v3';
const CUSTOMER = 'cus_000009459220';

/** Every value is made up; the CPF is the textbook one. */
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };

/** Every way what says who that person is could show up in a line of the log. */
const PERSONAL = /Zuleica|Tavares|529\.982\.247|52998224725|exemplo\.test/i;

/** The key whole, and the part of it that is the secret — in case something printed it without its first characters. */
const SECRET = [KEY, KEY.slice('$aact_hmlg_'.length), KEY.slice(1, 40)];

/** What Asaas sends of a card beside its brand and last digits. No shape of bee-link's has a place for it. */
const CARD_TOKEN = 'a75a1d98-c52d-4a6b-a413-71e00b193c99';
const card = { creditCardNumber: '8829', creditCardBrand: 'MASTERCARD', creditCardToken: CARD_TOKEN };

const today = (): string => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

type Answer = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

describe("a page's subscription asked of Asaas with the real client, and a log that is read (BEELINK-292)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let reference: string;

  /** What pino wrote, a line each. The application's own options; only the destination is this, and the level — everything. */
  const logged: string[] = [];
  /** What was sent to Asaas, and what this suite's Asaas answers next. */
  const sent: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  let answering: Answer[] = [];

  const lines = () => logged.flatMap((chunk) => chunk.split('\n')).filter(Boolean).map((line) => JSON.parse(line) as { level: number; msg?: string; reason?: string; req?: { url?: string } });
  const json = (status: number, body: unknown, headers: Record<string, string> = {}): Answer => () => Response.json(body, { status, headers });
  const list = (...data: unknown[]) => json(200, { object: 'list', hasMore: false, totalCount: data.length, data });

  /** As the sandbox answered on 13/10/2026 — with a card on them, which a subscription paid by card comes to have. */
  const subscriptionBody = (change: object = {}) => ({ object: 'subscription', id: 'sub_cwtxq513jlpjfid1', dateCreated: today(), customer: CUSTOMER, value: 59.9, nextDueDate: '2099-01-01', cycle: 'MONTHLY', description: 'Plano Beelink mensal — página "Padaria da Lia"', billingType: 'UNDEFINED', deleted: false, status: 'ACTIVE', externalReference: reference, creditCard: card, ...change });
  const chargeBody = (change: object = {}) => ({ object: 'payment', id: 'pay_5l0awjywsem91403', customer: CUSTOMER, subscription: 'sub_cwtxq513jlpjfid1', value: 59.9, billingType: 'UNDEFINED', status: 'PENDING', dueDate: today(), originalDueDate: today(), paymentDate: null, invoiceUrl: 'https://sandbox.asaas.com/i/5l0awjywsem91403', externalReference: reference, deleted: false, creditCard: card, ...change });

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
    // As main.ts does: what a service or the exception filter logs goes through pino too.
    app.useLogger(app.get(Logger));
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));

    const authorization = { authorization: `Bearer ${owner.accessToken}` };
    await app.inject({ method: 'POST', url: '/api/stores', headers: authorization, payload: { name: 'Padaria da Lia', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } } });
    reference = `beelink-subscription-${(await prisma.storeSubscription.findFirstOrThrow()).id}`;

    // The account in good standing, its customer made at this suite's Asaas.
    answering = [list(), json(200, { object: 'customer', id: CUSTOMER, deleted: false })];
    const saved = await app.inject({ method: 'PUT', url: '/api/billing/account', headers: authorization, payload: person });
    if (saved.statusCode !== 200) throw new Error(`PUT /billing/account answered ${saved.statusCode}: ${saved.payload}`);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionId: null, planId: null, cycle: null, priceCents: null, firstDueDate: null, invoiceUrl: null, asaasSubscriptionClaimedUntil: null } });
    logged.length = 0;
    sent.length = 0;
    answering = [];
  });

  const choose = (cycle = 'MONTHLY') => app.inject({ method: 'PUT', url: PATH, headers: { authorization: `Bearer ${owner.accessToken}` }, payload: { cycle } });
  const row = () => prisma.storeSubscription.findFirstOrThrow();

  /** Nothing that was written or answered holds the key, in whole or in part. */
  function expectNoKeyIn(...texts: string[]) {
    const all = [logged.join(''), ...texts].join('\n');
    for (const secret of SECRET) expect(all).not.toContain(secret);
    expect(all).not.toContain('aact_');
  }

  it("asks Asaas, with bee-link's key at the sandbox, for what stands under the page's reference, then for the subscription, then for its charges", async () => {
    answering = [list(), json(200, subscriptionBody()), list(chargeBody())];

    const response = await choose('MONTHLY');

    expect(response.statusCode).toBe(200);
    expect(response.json<SubscriptionChoice>().invoiceUrl).toBe('https://sandbox.asaas.com/i/5l0awjywsem91403');
    expect(sent.map(({ method, url }) => [method, url])).toEqual([
      ['GET', `${SANDBOX}/subscriptions?externalReference=${reference}&limit=100`],
      ['POST', `${SANDBOX}/subscriptions`],
      ['GET', `${SANDBOX}/subscriptions/sub_cwtxq513jlpjfid1/payments?limit=100&offset=0`],
    ]);
    for (const request of sent) expect(request.headers).toMatchObject({ access_token: KEY, 'user-agent': 'bee-link (contato@beecoders.net)' });
    // The whole body: no card, no callback, no way of paying, and the price as the plan's row holds it.
    expect(sent[1]!.body).toEqual({ customer: CUSTOMER, billingType: 'UNDEFINED', value: 59.9, nextDueDate: today(), cycle: 'MONTHLY', description: 'Plano Beelink mensal — página "Padaria da Lia"', externalReference: reference });
    expect(await row()).toMatchObject({ asaasSubscriptionId: 'sub_cwtxq513jlpjfid1', cycle: 'MONTHLY', priceCents: 5990, invoiceUrl: 'https://sandbox.asaas.com/i/5l0awjywsem91403', status: 'TRIALING' });
  });

  it('removes the one that stands unpaid in another cycle before it asks for the new, and reads the removed one again', async () => {
    answering = [
      list(subscriptionBody({ id: 'sub_old', cycle: 'MONTHLY' })),
      list(chargeBody({ id: 'pay_old', subscription: 'sub_old' })),
      json(200, { deleted: true, id: 'sub_old' }),
      list(),
      json(200, subscriptionBody({ id: 'sub_new', cycle: 'YEARLY', value: 574.8 })),
      list(chargeBody({ id: 'pay_new', subscription: 'sub_new', value: 574.8, invoiceUrl: 'https://sandbox.asaas.com/i/new' })),
    ];

    const response = await choose('ANNUAL');

    expect(response.statusCode).toBe(200);
    expect(sent.map(({ method, url }) => [method, url.replace(SANDBOX, '')])).toEqual([
      ['GET', `/subscriptions?externalReference=${reference}&limit=100`],
      ['GET', '/subscriptions/sub_old/payments?limit=100&offset=0'],
      ['DELETE', '/subscriptions/sub_old'],
      ['GET', '/subscriptions/sub_old/payments?limit=100&offset=0'],
      ['POST', '/subscriptions'],
      ['GET', '/subscriptions/sub_new/payments?limit=100&offset=0'],
    ]);
    expect(sent[4]!.body).toMatchObject({ value: 574.8, cycle: 'YEARLY', billingType: 'UNDEFINED' });
    expect(await row()).toMatchObject({ asaasSubscriptionId: 'sub_new', cycle: 'ANNUAL', priceCents: 57480, invoiceUrl: 'https://sandbox.asaas.com/i/new' });
  });

  describe('keeps nothing of a card, and the key in no line of the log and in no answer', () => {
    it('when everything goes well — though Asaas sends a card and its token beside the charge', async () => {
      answering = [list(), json(200, subscriptionBody()), list(chargeBody())];

      const response = await choose('MONTHLY');
      const read = await app.inject({ method: 'GET', url: PATH, headers: { authorization: `Bearer ${owner.accessToken}` } });

      expect(response.statusCode).toBe(200);
      // The request was logged, so the log was being written: its silence about the key is not an empty log's.
      expect(lines().some((line) => line.req?.url === PATH)).toBe(true);
      expectNoKeyIn(response.payload, read.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);

      // Choosing writes no card at all — not the token, and not the two things that may be kept, which are a payment's to tell.
      const kept = await row();
      expect(kept).toMatchObject({ cardBrand: null, cardLast4: null, paymentMethod: null });
      for (const text of [JSON.stringify(kept), response.payload, read.payload, logged.join('')]) {
        expect(text).not.toContain(CARD_TOKEN);
        expect(text).not.toContain('creditCard');
      }
    });

    it('when Asaas refuses the subscription, repeating the key and all of who is charged', async () => {
      answering = [
        list(),
        json(400, { errors: [{ code: 'invalid_object', description: `Requisição ${KEY} recusada: o CPF 529.982.247-25 de Zuleica Tavares (${owner.user.email}) não pode assinar.` }] }),
        // The customer, asked for anew, stands as it stood: the refusal was not about it.
        list({ object: 'customer', id: CUSTOMER, name: 'Zuleica Tavares', cpfCnpj: '52998224725', email: owner.user.email, externalReference: `beelink-account-${owner.user.id}`, deleted: false }),
      ];

      const response = await choose('MONTHLY');

      expect(response.statusCode).toBe(502);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_SUBSCRIPTION_REFUSED');
      const refusal = lines().find((line) => line.msg === "Asaas refused a page's subscription");
      expect(refusal).toMatchObject({ level: 40, status: 400, code: 'invalid_object', reason: 'Requisição [key] recusada: o CPF [document] de [name] ([e-mail]) não pode assinar.' });
      expect(sent).toHaveLength(3);
      expectNoKeyIn(response.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);
      expect(response.payload).not.toMatch(PERSONAL);
    });

    it('when Asaas refuses the key itself, repeating it', async () => {
      answering = [json(401, { errors: [{ code: 'invalid_access_token', description: `A chave de API ${KEY} é inválida` }] })];

      const response = await choose('MONTHLY');

      expect(response.statusCode).toBe(503);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_UNAVAILABLE');
      expect(lines().find((line) => line.msg === "Asaas refused the key of bee-link's own account")).toMatchObject({ level: 50, status: 401, code: 'invalid_access_token', reason: 'A chave de API [key] é inválida' });
      expectNoKeyIn(response.payload);
    });

    it('when fetch fails naming the header it could not send, value and all — on the search and on the creation', async () => {
      const unsent: Answer = () => {
        throw new TypeError(`Headers.append: "${KEY}" is an invalid header value.`, { cause: new Error(`invalid header value ${KEY}`) });
      };
      answering = [unsent];
      const searching = await choose('MONTHLY');
      expect(searching.statusCode).toBe(503);
      expect(lines().find((line) => line.msg === "Asaas did not answer about a page's subscription")).toMatchObject({ level: 40, reason: 'Asaas did not answer (TypeError)' });

      answering = [list(), unsent];
      const creating = await choose('MONTHLY');
      expect(creating.statusCode).toBe(503);
      expect(creating.json<ApiErrorBody>().errorCode).toBe('BILLING_UNREACHABLE');
      // The creation's outcome is not known: the page is held, and nobody creates again at once.
      expect((await row()).asaasSubscriptionClaimedUntil!.getTime()).toBeGreaterThan(Date.now() + 30_000);

      expectNoKeyIn(searching.payload, creating.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);
    });

    it('when Asaas fails with a body that repeats it — on the removal, and on the reading of the charges', async () => {
      answering = [list(subscriptionBody({ id: 'sub_old', cycle: 'YEARLY', value: 574.8 })), list(chargeBody({ subscription: 'sub_old' })), json(502, { message: `bad gateway for ${KEY}` })];
      const removing = await choose('MONTHLY');
      expect(removing.statusCode).toBe(503);
      expect(sent.at(-1)).toMatchObject({ method: 'DELETE' });

      answering = [list(), json(200, subscriptionBody()), json(500, { message: `internal error while handling ${KEY}` })];
      const reading = await choose('MONTHLY');
      expect(reading.statusCode).toBe(503);
      expect(reading.json<ApiErrorBody>().errorCode).toBe('BILLING_UNREACHABLE');

      expectNoKeyIn(removing.payload, reading.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);
    });

    it("when the account's customer was removed at Asaas: said with the account's id, and with nothing of who it is", async () => {
      answering = [
        list(),
        // As the sandbox refused it on 13/10/2026: by its catch-all code, the reason only in the words.
        json(400, { errors: [{ code: 'invalid_object', description: 'Não é possível criar uma cobrança para um cliente removido.' }] }),
        list(),
        json(200, { object: 'customer', id: 'cus_000009459592', deleted: false }),
        json(200, subscriptionBody({ customer: 'cus_000009459592' })),
        list(chargeBody({ customer: 'cus_000009459592' })),
      ];

      const response = await choose('MONTHLY');
      const account = await prisma.billingAccount.findUniqueOrThrow({ where: { userId: owner.user.id } });
      await prisma.billingAccount.update({ where: { userId: owner.user.id }, data: { asaasCustomerId: CUSTOMER } });

      expect(response.statusCode).toBe(200);
      expect(account.asaasCustomerId).toBe('cus_000009459592');
      expect(sent.map(({ method, url }) => [method, url.replace(SANDBOX, '').split('?')[0]])).toEqual([['GET', '/subscriptions'], ['POST', '/subscriptions'], ['GET', '/customers'], ['POST', '/customers'], ['POST', '/subscriptions'], ['GET', '/subscriptions/sub_cwtxq513jlpjfid1/payments']]);
      expect(sent[4]!.body).toMatchObject({ customer: 'cus_000009459592', value: 59.9 });
      expect(lines().find((line) => line.msg === "Asaas no longer held an account's customer: another was made, and the page's subscription asked for again")).toMatchObject({ level: 40, userId: owner.user.id });
      expectNoKeyIn(response.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);
    });

    it('when the choice is refused before Asaas is asked', async () => {
      const invalid = await app.inject({ method: 'PUT', url: PATH, headers: { authorization: `Bearer ${owner.accessToken}` }, payload: { cycle: 'WEEKLY' } });
      await prisma.storeSubscription.updateMany({ data: { status: 'EXEMPT' } });
      const exempt = await choose('MONTHLY');
      await prisma.storeSubscription.updateMany({ data: { status: 'TRIALING' } });

      expect([invalid.statusCode, exempt.statusCode]).toEqual([400, 409]);
      expect(sent).toHaveLength(0);
      expectNoKeyIn(invalid.payload, exempt.payload);
    });
  });
});
