// Node
import { Writable } from 'node:stream';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { Logger, PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';

// Types
import type { ApiErrorBody, AuthSession, BillingAccount } from '@harness-monorepo/contracts';

// App
import { requestLogOptions } from '../src/app.module.js';
import { BillingModule } from '../src/modules/billing/billing.module.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

/** Made up, in the shape of a real one — and set as this deployment's, before anything reads the environment. */
const KEY = vi.hoisted(() => {
  const key = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA6OiRhYWNoX2U5ZjM';
  process.env.ASAAS_ENV = 'sandbox';
  process.env.ASAAS_PLATFORM_API_KEY = key;
  return key;
});

const PATH = '/api/billing/account';
const SANDBOX = 'https://api-sandbox.asaas.com/v3';

/** A body the route takes. Every value is made up; the CPF is the textbook one. */
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };

/** Every way what says who that person is could show up in a line of the log. */
const PERSONAL = /Zuleica|Tavares|529\.982\.247|52998224725|exemplo\.test/i;

/** The key whole, and the part of it that is the secret — in case something printed it without its first characters. */
const SECRET = [KEY, KEY.slice('$aact_hmlg_'.length), KEY.slice(1, 40)];

type Answer = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

describe("bee-link's own Asaas key, with the real client and a log that is read (BEELINK-291)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;

  /** What pino wrote, a line each. The application's own options; only the destination is this, and the level — everything. */
  const logged: string[] = [];
  /** What was sent to Asaas, and what this suite's Asaas answers next. */
  const sent: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  let answering: Answer[] = [];

  const lines = () => logged.flatMap((chunk) => chunk.split('\n')).filter(Boolean).map((line) => JSON.parse(line) as { level: number; msg?: string; reason?: string; context?: string; req?: { url?: string; headers?: Record<string, string> } });

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
    owner = await signUpAndSignIn(app, newEmail('dona'));
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    await prisma.billingAccount.deleteMany();
    logged.length = 0;
    sent.length = 0;
    answering = [];
  });

  const save = (payload: object = person) => app.inject({ method: 'PUT', url: PATH, headers: { authorization: `Bearer ${owner.accessToken}` }, payload });
  const json = (status: number, body: unknown, headers: Record<string, string> = {}): Answer => () => Response.json(body, { status, headers });
  const none = json(200, { object: 'list', hasMore: false, totalCount: 0, data: [] });

  /** Nothing that was written or answered holds the key, in whole or in part. */
  function expectNoKeyIn(...texts: string[]) {
    const all = [logged.join(''), ...texts].join('\n');
    for (const secret of SECRET) expect(all).not.toContain(secret);
    expect(all).not.toContain('aact_');
  }

  it('is what the client of this deployment asks Asaas with — at the sandbox, by ASAAS_ENV', async () => {
    expect(app.get(PlatformAsaas).configured).toBe(true);
    answering = [none, json(200, { object: 'customer', id: 'cus_000009458155', deleted: false })];

    const response = await save();

    expect(response.statusCode).toBe(200);
    expect(response.json<BillingAccount>()).toEqual({ name: 'Zuleica Tavares', document: '***.982.247-**', documentType: 'CPF', customerReady: true });
    expect(sent.map(({ url, method }) => [method, url])).toEqual([
      ['GET', `${SANDBOX}/customers?externalReference=beelink-account-${owner.user.id}&limit=100`],
      ['POST', `${SANDBOX}/customers`],
    ]);
    for (const request of sent) expect(request.headers).toMatchObject({ access_token: KEY, 'user-agent': 'bee-link (contato@beecoders.net)' });
    expect(sent[1]!.body).toEqual({ name: 'Zuleica Tavares', cpfCnpj: '52998224725', email: owner.user.email, externalReference: `beelink-account-${owner.user.id}`, notificationDisabled: true });
    expect((await prisma.billingAccount.findUniqueOrThrow({ where: { userId: owner.user.id } })).asaasCustomerId).toBe('cus_000009458155');
  });

  describe('is in no line of the log, and in no answer', () => {
    it('when everything goes well — and nothing of who was saved is there either', async () => {
      answering = [none, json(200, { object: 'customer', id: 'cus_000009458155', deleted: false })];

      const response = await save();

      expect(response.statusCode).toBe(200);
      // The request was logged, so the log was being written: its silence about the key is not an empty log's.
      expect(lines().some((line) => line.req?.url === PATH)).toBe(true);
      expectNoKeyIn(response.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);
    });

    it('when Asaas refuses the customer, repeating the key and all of who it was', async () => {
      answering = [
        none,
        json(400, { errors: [{ code: 'invalid_object', description: `Requisição ${KEY} recusada: o CPF 529.982.247-25 de Zuleica Tavares (${owner.user.email}) é inválido.` }] }),
      ];

      const response = await save();

      expect(response.statusCode).toBe(502);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_CUSTOMER_REFUSED');
      const refusal = lines().find((line) => line.msg === "Asaas refused a shopkeeper's customer");
      expect(refusal).toMatchObject({ level: 40, userId: owner.user.id, status: 400, code: 'invalid_object', reason: 'Requisição [key] recusada: o CPF [document] de [name] ([e-mail]) é inválido.' });
      expectNoKeyIn(response.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);
      expect(response.payload).not.toMatch(PERSONAL);
    });

    it("when Asaas refuses the key itself, repeating it", async () => {
      answering = [json(401, { errors: [{ code: 'invalid_access_token', description: `A chave de API ${KEY} é inválida` }] })];

      const response = await save();

      expect(response.statusCode).toBe(503);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_UNAVAILABLE');
      expect(lines().find((line) => line.msg === "Asaas refused the key of bee-link's own account")).toMatchObject({ level: 50, status: 401, code: 'invalid_access_token', reason: 'A chave de API [key] é inválida' });
      expectNoKeyIn(response.payload);
    });

    it('when fetch fails naming the header it could not send, value and all', async () => {
      answering = [
        () => {
          throw new TypeError(`Headers.append: "${KEY}" is an invalid header value.`, { cause: new Error(`invalid header value ${KEY}`) });
        },
      ];

      const response = await save();

      expect(response.statusCode).toBe(503);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_UNREACHABLE');
      expect(lines().find((line) => line.msg === "Asaas did not answer about a shopkeeper's customer")).toMatchObject({ level: 40, reason: 'Asaas did not answer (TypeError)' });
      expectNoKeyIn(response.payload);
    });

    it("when Asaas fails with a body that repeats it, on the search and on the creation", async () => {
      answering = [json(500, { message: `internal error while handling ${KEY}` })];
      const searching = await save();
      expect(searching.statusCode).toBe(503);

      await prisma.billingAccount.deleteMany();
      answering = [none, json(502, { message: `bad gateway for ${KEY}` })];
      const creating = await save();
      expect(creating.statusCode).toBe(503);
      expect(creating.json<ApiErrorBody>().errorCode).toBe('BILLING_UNREACHABLE');

      expectNoKeyIn(searching.payload, creating.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);
    });

    it('when Asaas asks to wait, and when the wait is remembered without asking again', async () => {
      answering = [json(429, { errors: [{ code: 'too_many_requests', description: `Limite excedido para ${KEY}` }] }, { 'RateLimit-Reset': '1' })];
      const throttled = await save();
      expect(throttled.statusCode).toBe(503);

      const remembered = await save();
      expect(remembered.statusCode).toBe(503);
      // The second was answered from memory: Asaas was asked once.
      expect(sent).toHaveLength(1);
      expectNoKeyIn(throttled.payload, remembered.payload);

      // The wait Asaas named is over before the next test asks.
      await new Promise((resolve) => setTimeout(resolve, 1_100));
    });

    it('when the read answers, and when the body is refused before Asaas is asked', async () => {
      answering = [none, json(200, { object: 'customer', id: 'cus_000009458155', deleted: false })];
      await save();

      const read = await app.inject({ method: 'GET', url: PATH, headers: { authorization: `Bearer ${owner.accessToken}` } });
      const invalid = await save({ ...person, document: '529.982.247-26' });

      expect(read.statusCode).toBe(200);
      expect(invalid.statusCode).toBe(400);
      expect(sent).toHaveLength(2);
      expectNoKeyIn(read.payload, invalid.payload);
      expect(logged.join('')).not.toMatch(PERSONAL);
    });

    it('in the line the boot writes to say the account is set up', () => {
      app.get(BillingModule).onModuleInit();

      expect(lines().find((line) => line.msg === "bee-link's own Asaas account is set up (SANDBOX)")).toMatchObject({ level: 30, context: 'BillingModule' });
      expectNoKeyIn();
    });
  });
});
