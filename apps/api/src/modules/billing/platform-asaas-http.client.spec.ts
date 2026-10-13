// Node
import { inspect } from 'node:util';

// Libs
import { afterEach, describe, expect, it, vi } from 'vitest';

// App
import { AsaasOutcomeUnknown, AsaasRefused, AsaasThrottled, AsaasUnreachable } from '../../shared/asaas/asaas-errors.js';
import { PlatformAsaasUnconfigured } from './platform-asaas.client.js';
import { PlatformAsaasHttpClient } from './platform-asaas-http.client.js';

/** Made up, in the shape of a real one. */
const KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';
const BASE = 'https://api-sandbox.asaas.com/v3';
const REFERENCE = 'beelink-account-0199a0f1-0000-7000-8000-000000000001';

const access = { baseUrl: BASE, userAgent: 'bee-link (contato@beecoders.net)', apiKey: KEY };
/** A client of its own for each test: one remembers a 429. */
const clientOf = () => new PlatformAsaasHttpClient(access);

function answer(status: number, body: unknown, headers: Record<string, string> = {}) {
  const fetched = vi.fn(async (_url: string, _init?: RequestInit) => (body === undefined ? new Response(null, { status, headers }) : Response.json(body, { status, headers })));
  vi.stubGlobal('fetch', fetched);
  return fetched;
}

/** One answer after another, the last one for every call past the list. */
function answers(...bodies: [number, unknown][]) {
  let call = 0;
  const fetched = vi.fn(async (_url: string, _init?: RequestInit) => {
    const [status, body] = bodies[Math.min(call, bodies.length - 1)]!;
    call += 1;
    return Response.json(body, { status });
  });
  vi.stubGlobal('fetch', fetched);
  return fetched;
}

function silence(error: unknown = new TypeError('fetch failed', { cause: Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }) })) {
  const fetched = vi.fn(async (_url: string, _init?: RequestInit) => Promise.reject(error));
  vi.stubGlobal('fetch', fetched);
  return fetched;
}

const sent = (fetched: ReturnType<typeof answer>, call = 0) => ({
  url: String(fetched.mock.calls[call]?.[0]),
  method: fetched.mock.calls[call]?.[1]?.method,
  headers: fetched.mock.calls[call]?.[1]?.headers as Record<string, string>,
  body: JSON.parse(String(fetched.mock.calls[call]?.[1]?.body ?? 'null')) as unknown,
});

const thrownBy = (work: Promise<unknown>) => work.then(
  () => {
    throw new Error('Expected the call to fail');
  },
  (error: unknown) => error,
);

const customer = { name: 'Maria Lessari', document: '52998224725', email: 'maria@lessari.test' };
const customerBody = { object: 'customer', id: 'cus_000009458155', name: 'Maria Lessari', email: 'maria@lessari.test', cpfCnpj: '52998224725', personType: 'FISICA', deleted: false, externalReference: REFERENCE, notificationDisabled: true, canDelete: true, aFieldAsaasAddsLater: { anything: true } };

/** As the sandbox answered on 13/10/2026, with the token Asaas sends beside the card's brand and last digits. */
const cardBody = { creditCardNumber: '8829', creditCardBrand: 'MASTERCARD', creditCardToken: 'a75a1d98-c52d-4a6b-a413-71e00b193c99' };
const subscriptionBody = { object: 'subscription', id: 'sub_0idkyaerpc1r1tmt', dateCreated: '2026-10-13', customer: 'cus_000009458155', paymentLink: null, value: 59.9, nextDueDate: '2026-11-14', cycle: 'MONTHLY', description: 'Beelink', billingType: 'CREDIT_CARD', deleted: false, status: 'ACTIVE', externalReference: 'a-subscription', checkoutSession: null, creditCard: cardBody, fine: { value: 0, type: 'FIXED' }, split: null };
const chargeBody = { object: 'payment', id: 'pay_bnngnr5rfx14wgvj', customer: 'cus_000009458155', subscription: 'sub_0idkyaerpc1r1tmt', value: 59.9, netValue: 57.62, billingType: 'CREDIT_CARD', confirmedDate: null, creditCard: cardBody, status: 'PENDING', dueDate: '2026-10-14', originalDueDate: '2026-10-14', paymentDate: null, clientPaymentDate: null, invoiceUrl: 'https://sandbox.asaas.com/i/bnngnr5rfx14wgvj', externalReference: 'a-subscription', deleted: false, refunds: null };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("PlatformAsaasHttpClient — bee-link's own Asaas account (BEELINK-291)", () => {
  it("asks with bee-link's key in access_token, the User-Agent Asaas requires, and JSON — at the address it was given", async () => {
    const fetched = answer(200, { object: 'list', hasMore: false, data: [] });

    await clientOf().customers(REFERENCE);
    expect(sent(fetched).headers).toMatchObject({ access_token: KEY, 'user-agent': 'bee-link (contato@beecoders.net)', 'content-type': 'application/json', accept: 'application/json' });
    expect(sent(fetched).url.startsWith(`${BASE}/`)).toBe(true);

    const production = answer(200, { object: 'list', hasMore: false, data: [] });
    await new PlatformAsaasHttpClient({ ...access, baseUrl: 'https://api.asaas.com/v3', apiKey: '$aact_prod_x' }).customers(REFERENCE);
    expect(sent(production).url).toBe(`https://api.asaas.com/v3/customers?externalReference=${REFERENCE}&limit=100`);
    expect(sent(production).headers).toMatchObject({ access_token: '$aact_prod_x' });
  });

  describe('the customer', () => {
    it('is looked for by the reference, and found as Asaas holds it: the document bare, the e-mail lower-cased', async () => {
      const fetched = answer(200, { object: 'list', hasMore: false, totalCount: 1, data: [{ ...customerBody, cpfCnpj: '529.982.247-25', email: ' Maria@Lessari.TEST ' }] });

      expect(await clientOf().customers(REFERENCE)).toEqual([{ id: 'cus_000009458155', ...customer }]);
      expect([sent(fetched).url, sent(fetched).method]).toEqual([`${BASE}/customers?externalReference=${REFERENCE}&limit=100`, 'GET']);

      answer(200, { object: 'list', hasMore: false, data: [{ ...customerBody, cpfCnpj: '12.abc.345/01de-35' }] });
      expect((await clientOf().customers(REFERENCE))[0]?.document).toBe('12ABC34501DE35');
    });

    it('sends a reference with characters of its own as one value', async () => {
      const fetched = answer(200, { object: 'list', hasMore: false, data: [] });

      await clientOf().customers('a b&limit=1#x');
      expect(sent(fetched).url).toBe(`${BASE}/customers?externalReference=a%20b%26limit%3D1%23x&limit=100`);
    });

    /** Seen at the sandbox: the search ignores case, and a removed customer still answers by its id. */
    it('passes over one removed, one with no id, and one whose reference is the same but for its case', async () => {
      answer(200, {
        object: 'list',
        hasMore: false,
        data: [
          { ...customerBody, id: 'cus_removed', deleted: true },
          { ...customerBody, id: 'cus_shouting', externalReference: REFERENCE.toUpperCase() },
          { ...customerBody, id: null },
          { ...customerBody, id: 'cus_no_reference', externalReference: null },
          null,
          { ...customerBody, id: 'cus_first' },
          { ...customerBody, id: 'cus_second' },
        ],
      });

      expect((await clientOf().customers(REFERENCE)).map((found) => found.id)).toEqual(['cus_first', 'cus_second']);

      answer(200, { object: 'list', hasMore: false, data: [] });
      expect(await clientOf().customers(REFERENCE)).toEqual([]);
    });

    /** "None" is what a second customer is made on: only a list says it. */
    it.each([[{}], [null], [{ data: null }], [{ data: 'none' }], [{ errors: [] }]])('does not take %j for no customer', async (body) => {
      answer(200, body);

      await expect(clientOf().customers(REFERENCE)).rejects.toBeInstanceOf(AsaasUnreachable);
    });

    it("is registered with the name, the document, the e-mail and bee-link's reference — Asaas's own notifications off", async () => {
      const fetched = answer(200, customerBody);

      expect(await clientOf().createCustomer({ ...customer, externalReference: REFERENCE })).toBe('cus_000009458155');
      const { url, method, body } = sent(fetched);
      expect([url, method]).toEqual([`${BASE}/customers`, 'POST']);
      expect(body).toEqual({ name: 'Maria Lessari', cpfCnpj: '52998224725', email: 'maria@lessari.test', externalReference: REFERENCE, notificationDisabled: true });
    });

    it('has its name, document and e-mail changed by its id, and nothing else sent', async () => {
      const fetched = answer(200, { ...customerBody, name: 'Lessari LTDA', cpfCnpj: '11222333000181', personType: 'JURIDICA' });

      await expect(clientOf().updateCustomer('cus_000009458155', { name: 'Lessari LTDA', document: '11222333000181', email: 'maria@lessari.test' })).resolves.toBeUndefined();
      const { url, method, body } = sent(fetched);
      expect([url, method]).toEqual([`${BASE}/customers/cus_000009458155`, 'PUT']);
      expect(body).toEqual({ name: 'Lessari LTDA', cpfCnpj: '11222333000181', email: 'maria@lessari.test' });
    });
  });

  describe('what Asaas answers when it does not do what was asked', () => {
    /** As the sandbox refused a CPF with a wrong check digit, on 13/10/2026. */
    it("keeps a refusal as a refusal, with Asaas's code and words", async () => {
      answer(400, { errors: [{ code: 'invalid_object', description: 'O CPF/CNPJ informado é inválido.' }] });
      const refused = await thrownBy(clientOf().createCustomer({ ...customer, externalReference: REFERENCE }));

      expect(refused).toBeInstanceOf(AsaasRefused);
      expect(refused).not.toBeInstanceOf(AsaasUnreachable);
      expect(refused).toMatchObject({ status: 400, code: 'invalid_object', reason: 'O CPF/CNPJ informado é inválido.' });

      // A customer removed at Asaas is refused with a 400 too, not a 404.
      answer(400, { errors: [{ code: 'invalid_object', description: 'O cliente [9458155] não pode ser atualizado: Cliente excluído, não é possível fazer alterações.' }] });
      await expect(clientOf().updateCustomer('cus_000009458155', customer)).rejects.toMatchObject({ status: 400, code: 'invalid_object' });

      answer(404, undefined);
      await expect(clientOf().updateCustomer('cus_never', customer)).rejects.toMatchObject({ status: 404, code: null, reason: 'no reason given' });

      answer(401, { errors: [{ code: 'invalid_access_token', description: 'A chave de API fornecida é inválida' }] });
      await expect(clientOf().customers(REFERENCE)).rejects.toMatchObject({ status: 401, code: 'invalid_access_token' });
    });

    it('takes a 429 for a wait and not for a creation that may have happened — with the time Asaas named', async () => {
      answer(429, { errors: [{ code: 'too_many_requests', description: 'Limite excedido' }] }, { 'RateLimit-Reset': '120' });
      const before = Date.now();
      const throttled = (await thrownBy(clientOf().createCustomer({ ...customer, externalReference: REFERENCE }))) as AsaasThrottled;

      expect(throttled).toBeInstanceOf(AsaasThrottled);
      expect(throttled).not.toBeInstanceOf(AsaasOutcomeUnknown);
      expect(throttled.retryAt!.getTime()).toBeGreaterThanOrEqual(before + 120_000);
      expect(throttled.retryAt!.getTime()).toBeLessThan(before + 125_000);
    });

    it("takes Asaas's own failure for not knowing — and, on a read, for nothing more than that", async () => {
      for (const status of [500, 502, 503]) {
        answer(status, { message: 'down' });
        const failed = await thrownBy(clientOf().customers(REFERENCE));
        expect(failed).toBeInstanceOf(AsaasUnreachable);
        expect(failed).not.toBeInstanceOf(AsaasOutcomeUnknown);
        expect(String(failed)).toContain(`Asaas failed (${status})`);
      }

      answer(503, { message: 'down' });
      const update = await thrownBy(clientOf().updateCustomer('cus_1', customer));
      expect(update).toBeInstanceOf(AsaasUnreachable);
      expect(update).not.toBeInstanceOf(AsaasOutcomeUnknown);
    });

    /** The one call that cannot be asked again blindly: Asaas takes duplicates. */
    it('does not know what came of a creation that Asaas failed, never answered, timed out on, or answered without an id', async () => {
      const create = () => clientOf().createCustomer({ ...customer, externalReference: REFERENCE });

      answer(500, { message: 'down' });
      expect(await thrownBy(create())).toBeInstanceOf(AsaasOutcomeUnknown);

      silence();
      const unanswered = await thrownBy(create());
      expect(unanswered).toBeInstanceOf(AsaasOutcomeUnknown);
      expect(String(unanswered)).toContain('TypeError, ECONNREFUSED');

      silence(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
      const timedOut = await thrownBy(create());
      expect(timedOut).toBeInstanceOf(AsaasOutcomeUnknown);
      expect(String(timedOut)).toContain('TimeoutError');

      for (const body of [{}, { id: '' }, { id: 42 }, null]) {
        answer(200, body);
        expect(await thrownBy(create())).toBeInstanceOf(AsaasOutcomeUnknown);
      }
    });

    it('gives every request ten seconds, and no more', async () => {
      const timeout = vi.spyOn(AbortSignal, 'timeout');
      const fetched = answer(200, { object: 'list', hasMore: false, data: [] });

      await clientOf().customers(REFERENCE);
      expect(timeout).toHaveBeenCalledWith(10_000);
      expect(fetched.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
      timeout.mockRestore();
    });
  });

  describe('a 429, remembered', () => {
    it('leaves the account alone until the time Asaas named, then asks again', async () => {
      vi.useFakeTimers({ now: new Date('2026-10-13T15:00:00Z'), toFake: ['Date'] });
      const client = clientOf();
      const throttling = answer(429, {}, { 'RateLimit-Reset': '120' });
      await expect(client.customers(REFERENCE)).rejects.toBeInstanceOf(AsaasThrottled);
      expect(throttling).toHaveBeenCalledTimes(1);

      // Whatever is asked meanwhile, and whatever Asaas would have said.
      const quiet = answer(200, { object: 'list', hasMore: false, data: [] });
      const waiting = (await thrownBy(client.subscription('sub_1'))) as AsaasThrottled;
      expect(waiting).toBeInstanceOf(AsaasThrottled);
      expect(waiting.retryAt).toEqual(new Date('2026-10-13T15:02:00Z'));
      // Turned away here, a creation was not sent: there is nothing of it to look for.
      const creation = await thrownBy(client.createCustomer({ ...customer, externalReference: REFERENCE }));
      expect(creation).toBeInstanceOf(AsaasThrottled);
      expect(creation).not.toBeInstanceOf(AsaasOutcomeUnknown);
      expect(quiet).not.toHaveBeenCalled();

      vi.setSystemTime(new Date('2026-10-13T15:02:01Z'));
      expect(await client.customers(REFERENCE)).toEqual([]);
      expect(quiet).toHaveBeenCalledTimes(1);
    });

    it('waits five minutes when Asaas named no time', async () => {
      vi.useFakeTimers({ now: new Date('2026-10-13T15:00:00Z'), toFake: ['Date'] });
      const client = clientOf();
      answer(429, {});
      await expect(client.customers(REFERENCE)).rejects.toMatchObject({ retryAt: null });

      const quiet = answer(200, { object: 'list', hasMore: false, data: [] });
      vi.setSystemTime(new Date('2026-10-13T15:04:59Z'));
      await expect(client.customers(REFERENCE)).rejects.toMatchObject({ retryAt: new Date('2026-10-13T15:05:00Z') });
      expect(quiet).not.toHaveBeenCalled();

      vi.setSystemTime(new Date('2026-10-13T15:05:01Z'));
      await expect(client.customers(REFERENCE)).resolves.toEqual([]);
    });

    it('is one client\'s memory: another is not held back by it', async () => {
      answer(429, {}, { 'RateLimit-Reset': '120' });
      await expect(clientOf().customers(REFERENCE)).rejects.toBeInstanceOf(AsaasThrottled);

      const fetched = answer(200, { object: 'list', hasMore: false, data: [] });
      await expect(clientOf().customers(REFERENCE)).resolves.toEqual([]);
      expect(fetched).toHaveBeenCalledTimes(1);
    });
  });

  describe('a subscription and its charges', () => {
    it('reads a subscription by its id, in cents and days — and of its card the brand and the last four digits alone', async () => {
      const fetched = answer(200, subscriptionBody);
      const read = await clientOf().subscription('sub_0idkyaerpc1r1tmt');

      expect(read).toEqual({
        id: 'sub_0idkyaerpc1r1tmt',
        status: 'ACTIVE',
        deleted: false,
        customerId: 'cus_000009458155',
        valueCents: 5990,
        cycle: 'MONTHLY',
        billingType: 'CREDIT_CARD',
        nextDueDate: '2026-11-14',
        externalReference: 'a-subscription',
        card: { brand: 'MASTERCARD', last4: '8829' },
      });
      expect([sent(fetched).url, sent(fetched).method]).toEqual([`${BASE}/subscriptions/sub_0idkyaerpc1r1tmt`, 'GET']);
      expect(JSON.stringify(read)).not.toContain(cardBody.creditCardToken);
    });

    it('reads one with no method chosen yet, one cancelled, and what Asaas leaves out', async () => {
      answer(200, { id: 'sub_1', status: 'ACTIVE', value: 323.4, cycle: 'SEMIANNUALLY', billingType: 'UNDEFINED', nextDueDate: '2026-10-31', creditCard: null, deleted: false });
      expect(await clientOf().subscription('sub_1')).toMatchObject({ valueCents: 32340, cycle: 'SEMIANNUALLY', billingType: 'UNDEFINED', card: null, customerId: null, externalReference: null });

      answer(200, { id: 'sub_1', status: 'INACTIVE', deleted: true });
      expect(await clientOf().subscription('sub_1')).toEqual({ id: 'sub_1', status: 'INACTIVE', deleted: true, customerId: null, valueCents: 0, cycle: 'UNKNOWN', billingType: 'UNDEFINED', nextDueDate: '', externalReference: null, card: null });

      // A card whose digits are not four digits is not a card bee-link keeps anything of.
      answer(200, { ...subscriptionBody, creditCard: { creditCardBrand: 'VISA', creditCardNumber: '4111111111111111', creditCardToken: 't' } });
      expect((await clientOf().subscription('sub_1'))?.card).toBeNull();
    });

    /** Seen at the sandbox: a 404 with no body. */
    it('answers none for an id the account does not hold, and does not take an answer with no id for one', async () => {
      answer(404, undefined);
      expect(await clientOf().subscription('sub_none')).toBeNull();

      answer(200, {});
      await expect(clientOf().subscription('sub_1')).rejects.toBeInstanceOf(AsaasUnreachable);
      answer(503, {});
      await expect(clientOf().subscription('sub_1')).rejects.toBeInstanceOf(AsaasUnreachable);
      answer(401, { errors: [{ code: 'invalid_access_token', description: 'A chave de API fornecida é inválida' }] });
      await expect(clientOf().subscription('sub_1')).rejects.toMatchObject({ status: 401 });
    });

    it("lists a subscription's charges, page after page, without those removed", async () => {
      const paid = { ...chargeBody, id: 'pay_paid', status: 'CONFIRMED', paymentDate: '2026-10-14', confirmedDate: '2026-10-14 10:20:30' };
      const fetched = answers(
        [200, { object: 'list', hasMore: true, data: [chargeBody, { ...chargeBody, id: 'pay_removed', deleted: true }] }],
        [200, { object: 'list', hasMore: false, data: [paid, { id: null }, null] }],
      );

      const charges = await clientOf().subscriptionCharges('sub_0idkyaerpc1r1tmt');

      expect(charges).toEqual([
        { id: 'pay_bnngnr5rfx14wgvj', status: 'PENDING', billingType: 'CREDIT_CARD', valueCents: 5990, dueDate: '2026-10-14', paymentDate: null, confirmedDate: null, invoiceUrl: 'https://sandbox.asaas.com/i/bnngnr5rfx14wgvj', subscriptionId: 'sub_0idkyaerpc1r1tmt', externalReference: 'a-subscription', card: { brand: 'MASTERCARD', last4: '8829' } },
        { id: 'pay_paid', status: 'CONFIRMED', billingType: 'CREDIT_CARD', valueCents: 5990, dueDate: '2026-10-14', paymentDate: '2026-10-14', confirmedDate: '2026-10-14', invoiceUrl: 'https://sandbox.asaas.com/i/bnngnr5rfx14wgvj', subscriptionId: 'sub_0idkyaerpc1r1tmt', externalReference: 'a-subscription', card: { brand: 'MASTERCARD', last4: '8829' } },
      ]);
      expect(fetched.mock.calls.map((call) => String(call[0]))).toEqual([
        `${BASE}/subscriptions/sub_0idkyaerpc1r1tmt/payments?limit=100&offset=0`,
        `${BASE}/subscriptions/sub_0idkyaerpc1r1tmt/payments?limit=100&offset=100`,
      ]);
      expect(JSON.stringify(charges)).not.toContain(cardBody.creditCardToken);
    });

    it('keeps only an https invoice link, stops at five pages, and does not take an answer with no list for no charge', async () => {
      answer(200, { object: 'list', hasMore: false, data: [{ ...chargeBody, invoiceUrl: 'javascript:alert(1)' }, { id: 'pay_bare' }] });
      const [unsafe, bare] = await clientOf().subscriptionCharges('sub_1');
      expect(unsafe?.invoiceUrl).toBeNull();
      expect(bare).toEqual({ id: 'pay_bare', status: 'UNKNOWN', billingType: 'UNDEFINED', valueCents: 0, dueDate: '', paymentDate: null, confirmedDate: null, invoiceUrl: null, subscriptionId: null, externalReference: null, card: null });

      const endless = answer(200, { object: 'list', hasMore: true, data: [chargeBody] });
      expect(await clientOf().subscriptionCharges('sub_1')).toHaveLength(5);
      expect(endless).toHaveBeenCalledTimes(5);

      answer(200, { object: 'list' });
      await expect(clientOf().subscriptionCharges('sub_1')).rejects.toBeInstanceOf(AsaasUnreachable);
    });
  });

  describe("bee-link's key", () => {
    const calls = (client: PlatformAsaasHttpClient): [string, () => Promise<unknown>][] => [
      ['customers', () => client.customers(REFERENCE)],
      ['createCustomer', () => client.createCustomer({ ...customer, externalReference: REFERENCE })],
      ['updateCustomer', () => client.updateCustomer('cus_1', customer)],
      ['subscription', () => client.subscription('sub_1')],
      ['subscriptionCharges', () => client.subscriptionCharges('sub_1')],
    ];

    /** Everything an error can be printed as: its text, its fields, and what a logger would walk through. */
    const printed = (error: unknown) => [String(error), JSON.stringify(error, Object.getOwnPropertyNames(error as object)), inspect(error, { depth: 10, showHidden: true })].join('\n');

    it('is never repeated in what a call throws — not when Asaas echoes it, not when fetch names the header it could not send', async () => {
      for (const [name, call] of calls(clientOf())) {
        answer(401, { errors: [{ code: 'invalid_environment', description: `A chave ${KEY} não pertence a este ambiente (${KEY})` }] });
        const refused = await thrownBy(call());
        expect(refused, name).toBeInstanceOf(AsaasRefused);
        expect(printed(refused), name).not.toContain(KEY);
        expect(printed(refused), name).toContain('[key]');
      }

      for (const [name, call] of calls(clientOf())) {
        silence(new TypeError(`Headers.append: "${KEY}" is an invalid header value.`, { cause: new Error(`invalid header ${KEY}`) }));
        const unsent = await thrownBy(call());
        expect(unsent, name).toBeInstanceOf(AsaasUnreachable);
        expect(printed(unsent), name).not.toContain(KEY);
        // The failure it came from is not carried along, where a logger would find it.
        expect((unsent as Error).cause, name).toBeUndefined();
      }

      for (const [name, call] of calls(clientOf())) {
        answer(500, { message: `internal error while handling ${KEY}` });
        expect(printed(await thrownBy(call())), name).not.toContain(KEY);
      }
    });

    it('is nowhere a log, a JSON or an inspection of the client reaches', async () => {
      const client = clientOf();
      answer(429, {}, { 'RateLimit-Reset': '120' });
      await thrownBy(client.customers(REFERENCE));

      expect(JSON.stringify(client)).toBe('{}');
      expect(JSON.stringify({ client })).not.toContain('aact');
      expect(inspect(client, { depth: 10, showHidden: true, getters: true })).not.toContain('aact');
      expect(Object.getOwnPropertyNames(client)).toEqual([]);
      expect(Reflect.ownKeys(client)).toEqual([]);
      expect(`${String(client)}`).not.toContain('aact');
    });
  });

  describe('with no key in this deployment', () => {
    it('says so, asks Asaas nothing, and fails every call the same way', async () => {
      const fetched = answer(200, { object: 'list', hasMore: false, data: [] });
      const client = new PlatformAsaasHttpClient(null);

      expect(client.configured).toBe(false);
      expect(clientOf().configured).toBe(true);

      for (const call of [
        () => client.customers(REFERENCE),
        () => client.createCustomer({ ...customer, externalReference: REFERENCE }),
        () => client.updateCustomer('cus_1', customer),
        () => client.subscription('sub_1'),
        () => client.subscriptionCharges('sub_1'),
      ]) {
        const failed = await thrownBy(call());
        expect(failed).toBeInstanceOf(PlatformAsaasUnconfigured);
        // Not a creation that may have happened: nothing was sent.
        expect(failed).not.toBeInstanceOf(AsaasUnreachable);
      }
      expect(fetched).not.toHaveBeenCalled();
    });
  });
});
