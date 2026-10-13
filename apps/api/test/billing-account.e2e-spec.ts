// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, BillingAccount, BillingAccountAnswer } from '@harness-monorepo/contracts';

// App
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { AsaasOutcomeUnknown, AsaasRefused, AsaasThrottled, AsaasUnreachable } from '../src/shared/asaas/asaas-errors.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const PATH = '/api/billing/account';

/** Made up. The CPF is the textbook one; the CNPJ checks out and is nobody's. */
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };
const company = { name: 'Lessari Moda LTDA', document: '11.222.333/0001-81' };

const DOCUMENT_SENTENCE = 'CPF ou CNPJ inválido: confira os números digitados.';
const NAME_SENTENCE = 'Informe o nome completo ou a razão social, com 2 a 120 caracteres.';

describe("who bee-link charges for an account's pages, and the shopkeeper as its Asaas customer (BEELINK-291)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  const asaas = new FakePlatformAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(asaas));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    owner = await signUpAndSignIn(app, newEmail('dona'));
  });

  /** `session` omitted is an anonymous caller. */
  function call(method: 'GET' | 'PUT', session?: AuthSession, payload?: object) {
    return app.inject({ method, url: PATH, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const save = (payload: object = person, session: AuthSession = owner) => call('PUT', session, payload);
  const read = async (session: AuthSession = owner) => (await call('GET', session)).json<BillingAccountAnswer>();
  const rowOf = (session: AuthSession = owner) => prisma.billingAccount.findUnique({ where: { userId: session.user.id } });
  const referenceOf = (session: AuthSession = owner) => `beelink-account-${session.user.id}`;
  /** A claim or a hold that ran its time: what a request finds a while later. */
  const letTheClaimRunOut = () => prisma.billingAccount.updateMany({ data: { asaasCustomerClaimedUntil: new Date(Date.now() - 1_000) } });

  describe('reading and saving', () => {
    it('answers no account, and not an error, to one that never gave its billing data', async () => {
      const response = await call('GET', owner);

      expect(response.statusCode).toBe(200);
      expect(response.json<BillingAccountAnswer>()).toEqual({ account: null });
      expect(asaas.calls).toEqual([]);
    });

    it("keeps the name and the document, and registers the account at bee-link's Asaas under its reference, with the account's own e-mail", async () => {
      const response = await save(person);

      expect(response.statusCode).toBe(200);
      expect(response.json<BillingAccount>()).toEqual({ name: 'Zuleica Tavares', document: '***.982.247-**', documentType: 'CPF', customerReady: true });

      expect(asaas.calls).toEqual(['customers', 'createCustomer']);
      expect(asaas.standing).toEqual([{ id: expect.any(String), name: 'Zuleica Tavares', document: '52998224725', email: owner.user.email, externalReference: referenceOf(), deleted: false }]);

      const row = await rowOf();
      expect(row).toMatchObject({ name: 'Zuleica Tavares', document: '52998224725', asaasCustomerId: asaas.standing[0]!.id, asaasCustomerClaimedUntil: null });
      expect(row!.asaasCustomerSyncedAt).toBeInstanceOf(Date);
    });

    it('reads it back with the document masked, and with nothing of Asaas', async () => {
      await save(company);

      const response = await call('GET', owner);

      expect(response.statusCode).toBe(200);
      expect(response.json<BillingAccountAnswer>()).toEqual({ account: { name: 'Lessari Moda LTDA', document: '**.222.333/0001-**', documentType: 'CNPJ', customerReady: true } });
      expect(response.payload).not.toContain('11222333000181');
      expect(response.payload).not.toContain('cus_');
      expect(asaas.calls).toEqual(['customers', 'createCustomer']);
    });

    it('asks Asaas nothing for a second save of the same data, and keeps the same customer', async () => {
      await save(person);
      const first = await rowOf();
      asaas.calls.length = 0;

      // The same person, typed another way.
      const response = await save({ name: '  Zuleica   Tavares ', document: '52998224725' });

      expect(response.statusCode).toBe(200);
      expect(response.json<BillingAccount>()).toEqual({ name: 'Zuleica Tavares', document: '***.982.247-**', documentType: 'CPF', customerReady: true });
      expect(asaas.calls).toEqual([]);
      expect(asaas.held).toHaveLength(1);
      expect(await rowOf()).toEqual(first);
    });

    it('changes the same customer when the data changes, and makes no second one', async () => {
      await save(person);
      const { id } = asaas.standing[0]!;
      asaas.calls.length = 0;

      const response = await save(company);

      expect(response.statusCode).toBe(200);
      expect(response.json<BillingAccount>()).toEqual({ name: 'Lessari Moda LTDA', document: '**.222.333/0001-**', documentType: 'CNPJ', customerReady: true });
      expect(asaas.calls).toEqual(['customers', 'updateCustomer']);
      expect(asaas.held).toEqual([{ id, name: 'Lessari Moda LTDA', document: '11222333000181', email: owner.user.email, externalReference: referenceOf(), deleted: false }]);
      expect(await rowOf()).toMatchObject({ name: 'Lessari Moda LTDA', document: '11222333000181', asaasCustomerId: id, asaasCustomerClaimedUntil: null });
    });

    it('is the account\'s: another account has its own data and its own customer, and reads nothing of this one', async () => {
      const other = await signUpAndSignIn(app, newEmail('outra'));
      await save(person);

      expect(await read(other)).toEqual({ account: null });

      // The same document under another account is another customer: one per account.
      expect((await save(person, other)).statusCode).toBe(200);
      expect(asaas.standing.map((customer) => customer.externalReference).sort()).toEqual([referenceOf(owner), referenceOf(other)].sort());
      expect(new Set(asaas.standing.map((customer) => customer.id)).size).toBe(2);
      expect((await rowOf(other))!.asaasCustomerId).not.toBe((await rowOf(owner))!.asaasCustomerId);
    });

    it('is closed to a caller with no session', async () => {
      for (const response of [await call('GET'), await call('PUT', undefined, person)]) {
        expect(response.statusCode).toBe(401);
        expect(response.json<ApiErrorBody>().errorCode).toBe('AUTH_UNAUTHENTICATED');
      }
      expect(asaas.calls).toEqual([]);
      expect(await prisma.billingAccount.count()).toBe(0);
    });
  });

  describe('a body that does not check out', () => {
    it.each([
      ['a CPF with a wrong check digit', { document: '529.982.247-26' }],
      ['a CPF of one digit repeated', { document: '111.111.111-11' }],
      ['a CNPJ with a wrong check digit', { document: '11.222.333/0001-82' }],
      ['a document of twelve digits', { document: '529982247250' }],
      ['no document', { document: undefined }],
    ])('is refused for %s before a row is written or Asaas is asked — in Portuguese, with a code', async (_what, change) => {
      const response = await save({ ...person, ...change });

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>()).toEqual({ statusCode: 400, errorCode: 'BILLING_DOCUMENT_INVALID', message: DOCUMENT_SENTENCE });
      expect(asaas.calls).toEqual([]);
      expect(await prisma.billingAccount.count()).toBe(0);
    });

    it('is refused for a name of one letter, the same way', async () => {
      const response = await save({ ...person, name: ' Z ' });

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>()).toEqual({ statusCode: 400, errorCode: 'BILLING_NAME_INVALID', message: NAME_SENTENCE });
      expect(asaas.calls).toEqual([]);
      expect(await prisma.billingAccount.count()).toBe(0);
    });

    it('leaves what was kept before as it was', async () => {
      await save(person);
      const before = await rowOf();
      asaas.calls.length = 0;

      expect((await save({ ...company, document: '11.222.333/0001-82' })).statusCode).toBe(400);
      expect(await rowOf()).toEqual(before);
      expect(asaas.calls).toEqual([]);
    });

    it('refuses a body that names the e-mail or the customer: neither is the caller\'s to send', async () => {
      for (const extra of [{ email: 'outra@exemplo.test' }, { asaasCustomerId: 'cus_000000000001' }]) {
        expect((await save({ ...person, ...extra })).statusCode).toBe(400);
      }
      expect(asaas.calls).toEqual([]);
    });
  });

  describe('safe to repeat', () => {
    it('does not know what came of a creation Asaas left unanswered: the data is kept, nobody creates again at once, and the next try finds the customer that was made', async () => {
      asaas.unanswered = 1;

      const silent = await save(person);

      expect(silent.statusCode).toBe(503);
      expect(silent.json<ApiErrorBody>().errorCode).toBe('BILLING_UNREACHABLE');
      // Asaas made it; bee-link was never told.
      expect(asaas.standing).toHaveLength(1);
      const held = await rowOf();
      expect(held).toMatchObject({ name: 'Zuleica Tavares', document: '52998224725', asaasCustomerId: null, asaasCustomerSyncedAt: null });
      expect(held!.asaasCustomerClaimedUntil!.getTime()).toBeGreaterThan(Date.now() + 30_000);
      expect((await read()).account).toEqual({ name: 'Zuleica Tavares', document: '***.982.247-**', documentType: 'CPF', customerReady: false });

      // At once: turned away, with Asaas not asked and nothing written.
      asaas.calls.length = 0;
      const early = await save(person);
      expect(early.statusCode).toBe(409);
      expect(early.json<ApiErrorBody>().errorCode).toBe('BILLING_ACCOUNT_BUSY');
      expect(asaas.calls).toEqual([]);

      // Once the hold ran out: searched first, found, taken — not made again.
      await letTheClaimRunOut();
      const later = await save(person);
      expect(later.statusCode).toBe(200);
      expect(later.json<BillingAccount>().customerReady).toBe(true);
      expect(asaas.calls).toEqual(['customers']);
      expect(asaas.held).toHaveLength(1);
      expect(await rowOf()).toMatchObject({ asaasCustomerId: asaas.held[0]!.id, asaasCustomerClaimedUntil: null });
    });

    it('creates on the next try when the creation left unanswered was never made', async () => {
      asaas.failing('createCustomer', new AsaasOutcomeUnknown('Asaas did not answer (TypeError, ECONNRESET)'));

      expect((await save(person)).json<ApiErrorBody>().errorCode).toBe('BILLING_UNREACHABLE');
      expect(asaas.held).toHaveLength(0);

      await letTheClaimRunOut();
      asaas.calls.length = 0;
      expect((await save(person)).statusCode).toBe(200);
      expect(asaas.calls).toEqual(['customers', 'createCustomer']);
      expect(asaas.held).toHaveLength(1);
    });

    /** The row and its claim were committed, Asaas made the customer, and the process ended before the id was written. */
    it('takes the customer a request that died left at Asaas, once its claim ran out', async () => {
      const left = asaas.plant({ name: 'Zuleica Tavares', document: '52998224725', email: owner.user.email, externalReference: referenceOf() });
      await prisma.billingAccount.create({ data: { userId: owner.user.id, name: 'Zuleica Tavares', document: '52998224725', asaasCustomerClaimedUntil: new Date(Date.now() - 5_000) } });

      const response = await save(person);

      expect(response.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['customers']);
      expect(asaas.held).toHaveLength(1);
      expect(await rowOf()).toMatchObject({ asaasCustomerId: left, asaasCustomerClaimedUntil: null });
    });

    it('ends two saves at once with one customer: the second is turned away while the first talks to Asaas, and writes nothing', async () => {
      let release!: () => void;
      const reached = new Promise<void>((arrived) => {
        asaas.before('customers', () => {
          arrived();
          return new Promise<void>((free) => (release = free));
        });
      });

      const first = save(person);
      await reached;
      // The first holds its claim, committed, and no lock: the second gets its answer without waiting.
      const second = await save(company);

      expect(second.statusCode).toBe(409);
      expect(second.json<ApiErrorBody>().errorCode).toBe('BILLING_ACCOUNT_BUSY');
      expect(await rowOf()).toMatchObject({ name: 'Zuleica Tavares', document: '52998224725', asaasCustomerId: null });

      asaas.before('customers', null);
      release();
      expect((await first).statusCode).toBe(200);
      expect(asaas.count('createCustomer')).toBe(1);
      expect(asaas.held).toHaveLength(1);
      expect(asaas.held[0]).toMatchObject({ name: 'Zuleica Tavares', document: '52998224725' });
    });

    it('ends ten saves fired together with one customer', async () => {
      const answers = await Promise.all(Array.from({ length: 10 }, () => save(person)));
      const codes = answers.map((response) => response.statusCode);

      // Whoever lost the race was either turned away, or came after it was over and found nothing to do.
      expect(codes.filter((code) => code !== 200 && code !== 409)).toEqual([]);
      expect(codes).toContain(200);
      expect(asaas.count('createCustomer')).toBe(1);
      expect(asaas.held).toHaveLength(1);
      expect(await rowOf()).toMatchObject({ asaasCustomerId: asaas.held[0]!.id, asaasCustomerClaimedUntil: null });
    });

    /** Whoever lost its claim — it ran out, and another request took the talk — neither creates nor writes. */
    it('does not create, and does not write, once its claim is another request\'s', async () => {
      const theirs = new Date(Date.now() + 50_000);
      asaas.before('customers', async () => {
        await prisma.billingAccount.updateMany({ data: { asaasCustomerClaimedUntil: theirs } });
      });

      const response = await save(person);

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_ACCOUNT_BUSY');
      expect(asaas.calls).toEqual(['customers']);
      expect(asaas.held).toHaveLength(0);
      // The other request's claim stands as it wrote it.
      expect(await rowOf()).toMatchObject({ asaasCustomerId: null, asaasCustomerClaimedUntil: theirs });
    });

    it('does not write a customer it found, either, once its claim is another request\'s', async () => {
      asaas.plant({ name: 'Zuleica Tavares', document: '52998224725', email: owner.user.email, externalReference: referenceOf() });
      const theirs = new Date(Date.now() + 50_000);
      asaas.before('customers', async () => {
        await prisma.billingAccount.updateMany({ data: { asaasCustomerClaimedUntil: theirs } });
      });

      expect((await save(person)).statusCode).toBe(409);
      expect(await rowOf()).toMatchObject({ asaasCustomerId: null, asaasCustomerSyncedAt: null, asaasCustomerClaimedUntil: theirs });
    });
  });

  describe('when Asaas does not do what was asked', () => {
    it("keeps the data and says Asaas refused the customer, without Asaas's words — and lets the next save ask again at once", async () => {
      asaas.failing('createCustomer', new AsaasRefused(400, 'invalid_object', 'O CPF/CNPJ informado é inválido.'));

      const refused = await save(person);

      expect(refused.statusCode).toBe(502);
      expect(refused.json<ApiErrorBody>()).toMatchObject({ statusCode: 502, errorCode: 'BILLING_CUSTOMER_REFUSED' });
      expect(refused.payload).not.toContain('informado');
      expect(await rowOf()).toMatchObject({ name: 'Zuleica Tavares', document: '52998224725', asaasCustomerId: null, asaasCustomerSyncedAt: null, asaasCustomerClaimedUntil: null });
      expect((await read()).account).toMatchObject({ customerReady: false });

      expect((await save(company)).statusCode).toBe(200);
      expect(asaas.held).toHaveLength(1);
      expect(asaas.held[0]).toMatchObject({ name: 'Lessari Moda LTDA', document: '11222333000181' });
    });

    it.each([
      ['its own failure', new AsaasUnreachable('Asaas failed (503)')],
      ['a silence', new AsaasUnreachable('Asaas did not answer (TimeoutError)')],
      ['a wait asked for', new AsaasThrottled('Asaas failed (429)', new Date(Date.now() + 120_000))],
    ])('keeps the data and says Asaas did not answer, on %s while it was searched — nothing was created, and the next save asks again at once', async (_what, error) => {
      asaas.failing('customers', error);

      const response = await save(person);

      expect(response.statusCode).toBe(503);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_UNREACHABLE');
      expect(asaas.calls).toEqual(['customers']);
      expect(await rowOf()).toMatchObject({ name: 'Zuleica Tavares', asaasCustomerId: null, asaasCustomerSyncedAt: null, asaasCustomerClaimedUntil: null });

      expect((await save(person)).statusCode).toBe(200);
      expect(asaas.held).toHaveLength(1);
    });

    it('is not held back by a wait Asaas asked for on the creation: nothing was made, so there is nothing to wait for', async () => {
      asaas.failing('createCustomer', new AsaasThrottled('Asaas failed (429)', null));

      expect((await save(person)).json<ApiErrorBody>().errorCode).toBe('BILLING_UNREACHABLE');
      expect((await rowOf())!.asaasCustomerClaimedUntil).toBeNull();
    });

    it("says billing is unavailable when Asaas refuses bee-link's own key: no shopkeeper can mend that", async () => {
      asaas.failing('customers', new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida'));

      const response = await save(person);

      expect(response.statusCode).toBe(503);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_UNAVAILABLE');
      expect((await rowOf())!.asaasCustomerClaimedUntil).toBeNull();
    });

    it('marks changed data as not yet told to Asaas when the change does not get there, and tells it on the next save', async () => {
      await save(person);
      const { id } = asaas.standing[0]!;
      asaas.failing('updateCustomer', new AsaasUnreachable('Asaas failed (502)'));

      expect((await save(company)).statusCode).toBe(503);
      // bee-link holds the new data; Asaas still holds the old; and the row says so.
      expect(await rowOf()).toMatchObject({ name: 'Lessari Moda LTDA', document: '11222333000181', asaasCustomerId: id, asaasCustomerSyncedAt: null });
      expect(asaas.held[0]).toMatchObject({ name: 'Zuleica Tavares', document: '52998224725' });
      expect((await read()).account).toMatchObject({ name: 'Lessari Moda LTDA', customerReady: false });

      asaas.calls.length = 0;
      expect((await save(company)).statusCode).toBe(200);
      expect(asaas.calls).toEqual(['customers', 'updateCustomer']);
      expect(asaas.held).toEqual([expect.objectContaining({ id, name: 'Lessari Moda LTDA', document: '11222333000181' })]);
      expect((await rowOf())!.asaasCustomerSyncedAt).toBeInstanceOf(Date);
    });
  });

  describe("what stands at Asaas under the account's reference", () => {
    it('makes another customer when the one it had was removed there, and the data has something to tell', async () => {
      await save(person);
      const removed = asaas.standing[0]!.id;
      asaas.remove(removed);
      asaas.calls.length = 0;

      expect((await save(company)).statusCode).toBe(200);

      expect(asaas.calls).toEqual(['customers', 'createCustomer']);
      expect(asaas.standing).toHaveLength(1);
      expect(asaas.standing[0]!.id).not.toBe(removed);
      expect(await rowOf()).toMatchObject({ asaasCustomerId: asaas.standing[0]!.id, name: 'Lessari Moda LTDA' });
    });

    it('keeps the customer the row already names when two stand there, and the first listed when it names none', async () => {
      await save(person);
      const known = asaas.standing[0]!.id;
      // Somebody registered a second one by hand, under the same reference.
      const stray = asaas.plant({ name: 'Zuleica Tavares', document: '52998224725', email: owner.user.email, externalReference: referenceOf() });
      asaas.held.reverse();

      expect((await save(company)).statusCode).toBe(200);
      expect((await rowOf())!.asaasCustomerId).toBe(known);
      expect(asaas.held.find((customer) => customer.id === stray)).toMatchObject({ name: 'Zuleica Tavares' });
      expect(asaas.count('createCustomer')).toBe(1);

      const other = await signUpAndSignIn(app, newEmail('outra'));
      const first = asaas.plant({ name: 'A', document: '52998224725', email: other.user.email, externalReference: referenceOf(other) });
      asaas.plant({ name: 'B', document: '52998224725', email: other.user.email, externalReference: referenceOf(other) });
      expect((await save(person, other)).statusCode).toBe(200);
      expect((await rowOf(other))!.asaasCustomerId).toBe(first);
      expect(asaas.count('createCustomer')).toBe(1);
    });

    it('leaves alone a customer of another reference, whatever its document', async () => {
      asaas.plant({ name: 'Zuleica Tavares', document: '52998224725', email: 'outra@exemplo.test', externalReference: 'another-product-customer' });

      expect((await save(person)).statusCode).toBe(200);
      expect(asaas.calls).toEqual(['customers', 'createCustomer']);
      expect(asaas.held).toHaveLength(2);
    });
  });

  describe("an account that is deleted", () => {
    it('takes its billing data with it', async () => {
      await save(person);

      await prisma.user.delete({ where: { id: owner.user.id } });

      expect(await prisma.billingAccount.count()).toBe(0);
    });
  });
});
