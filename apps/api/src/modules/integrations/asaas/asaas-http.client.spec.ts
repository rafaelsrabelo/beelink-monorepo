// Libs
import { afterEach, describe, expect, it, vi } from 'vitest';

// App
import { ASAAS_WEBHOOK_EVENTS, AsaasOutcomeUnknown, AsaasRefused, AsaasThrottled, AsaasUnreachable } from './asaas.client.js';
import type { AsaasConfig } from './asaas.config.js';
import { AsaasHttpClient } from './asaas-http.client.js';

const KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';

const config: AsaasConfig = {
  environment: 'SANDBOX',
  baseUrl: 'https://api-sandbox.asaas.com/v3',
  userAgent: 'bee-link (contato@beecoders.net)',
  contactEmail: 'contato@beecoders.net',
  webhookUrl: 'https://beelink.biz/api/integrations/asaas/webhook',
  vaultKey: Buffer.alloc(32),
};
const client = new AsaasHttpClient();

function answer(status: number, body: unknown) {
  const fetched = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body, { status }));
  vi.stubGlobal('fetch', fetched);
  return fetched;
}
const sent = (fetched: ReturnType<typeof answer>) => ({
  url: String(fetched.mock.calls[0]?.[0]),
  method: fetched.mock.calls[0]?.[1]?.method,
  headers: fetched.mock.calls[0]?.[1]?.headers as Record<string, string>,
  body: JSON.parse(String(fetched.mock.calls[0]?.[1]?.body ?? 'null')) as unknown,
});

afterEach(() => vi.unstubAllGlobals());

describe('AsaasHttpClient', () => {
  it("reads the account with the shop's key in access_token, the User-Agent Asaas requires, and JSON", async () => {
    const fetched = answer(200, { personType: 'JURIDICA', cpfCnpj: '11.222.333/0001-81', name: 'Maria Lessari', companyName: 'Lessari Moda LTDA', tradingName: 'Lessari', email: 'maria@lessari.test' });

    expect(await client.account(config, KEY)).toEqual({ name: 'Lessari', document: '11222333000181' });
    const { url, method, headers } = sent(fetched);
    expect(url).toBe('https://api-sandbox.asaas.com/v3/myAccount/commercialInfo/');
    expect(method).toBe('GET');
    expect(headers).toMatchObject({ access_token: KEY, 'user-agent': 'bee-link (contato@beecoders.net)', 'content-type': 'application/json', accept: 'application/json' });
  });

  it('names a person by the name on file, and leaves the document out when Asaas sent none', async () => {
    answer(200, { personType: 'FISICA', name: 'Maria Lessari', companyName: null, tradingName: ' ', cpfCnpj: null });

    expect(await client.account(config, KEY)).toEqual({ name: 'Maria Lessari', document: null });
  });

  /** A CNPJ issued since July 2026 may hold letters: dropped with the punctuation, the account would read as having no document. */
  it('keeps the letters of a newer CNPJ, capital, whichever way Asaas writes it', async () => {
    answer(200, { personType: 'JURIDICA', name: 'Lessari', cpfCnpj: '12.abc.345/01de-35' });
    expect((await client.account(config, KEY)).document).toBe('12ABC34501DE35');

    answer(200, { personType: 'JURIDICA', name: 'Lessari', cpfCnpj: '12ABC34501DE35' });
    expect((await client.account(config, KEY)).document).toBe('12ABC34501DE35');
  });

  it('registers the webhook, active and in order, with the token and the payment events, and answers its id', async () => {
    const fetched = answer(200, { id: 'wh_01', hasAuthToken: true });
    const webhook = { name: 'bee-link (lessari)', url: config.webhookUrl!, email: 'contato@beecoders.net', authToken: 'a'.repeat(43) };

    expect(await client.createWebhook(config, KEY, webhook)).toBe('wh_01');
    const { url, method, headers, body } = sent(fetched);
    expect([url, method]).toEqual(['https://api-sandbox.asaas.com/v3/webhooks', 'POST']);
    expect(headers).toMatchObject({ access_token: KEY });
    expect(body).toMatchObject({ ...webhook, enabled: true, interrupted: false, apiVersion: 3, sendType: 'SEQUENTIALLY' });
    expect((body as { events: string[] }).events).toEqual(expect.arrayContaining(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_DELETED', 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED']));
  });

  it('takes a webhook out by its id, and takes one already gone as gone', async () => {
    const fetched = answer(200, { deleted: true, id: 'wh_01' });
    await client.deleteWebhook(config, KEY, 'wh_01');
    expect([sent(fetched).url, sent(fetched).method]).toEqual(['https://api-sandbox.asaas.com/v3/webhooks/wh_01', 'DELETE']);

    answer(404, { errors: [{ code: 'not_found', description: 'Webhook não encontrado.' }] });
    await expect(client.deleteWebhook(config, KEY, 'wh_01')).resolves.toBeUndefined();
  });

  /** One webhook takes any event: the charge's own, and those of the account's keys (BEELINK-206). */
  it('asks for every event the receiver reads — the risk review, the capture, a change, a receipt undone, and a key that stopped working', async () => {
    const fetched = answer(200, { id: 'wh_01' });
    await client.createWebhook(config, KEY, { name: 'n', url: 'u', email: 'e', authToken: 'a'.repeat(43) });

    const { events } = sent(fetched).body as { events: string[] };
    expect(events).toEqual([...ASAAS_WEBHOOK_EVENTS]);
    expect(events).toEqual(expect.arrayContaining(['PAYMENT_AWAITING_RISK_ANALYSIS', 'PAYMENT_APPROVED_BY_RISK_ANALYSIS', 'PAYMENT_AUTHORIZED', 'PAYMENT_RECEIVED_IN_CASH_UNDONE', 'PAYMENT_UPDATED', 'ACCESS_TOKEN_DISABLED', 'ACCESS_TOKEN_DELETED', 'ACCESS_TOKEN_EXPIRED']));
    expect(new Set(events).size).toBe(events.length);
  });

  it('reads where a webhook stands, answers none for one the account does not hold, and sets one going again', async () => {
    const read = answer(200, { id: 'wh_01', enabled: true, interrupted: true, penalizedRequestsCount: 15, somethingNew: 1 });
    expect(await client.webhook(config, KEY, 'wh_01')).toEqual({ enabled: true, interrupted: true });
    expect([sent(read).url, sent(read).method]).toEqual(['https://api-sandbox.asaas.com/v3/webhooks/wh_01', 'GET']);

    answer(200, { id: 'wh_01' });
    expect(await client.webhook(config, KEY, 'wh_01')).toEqual({ enabled: true, interrupted: false });
    answer(404, { errors: [{ code: 'not_found', description: 'Webhook não encontrado.' }] });
    expect(await client.webhook(config, KEY, 'wh_01')).toBeNull();
    answer(401, { errors: [{ code: 'invalid_access_token', description: 'A chave de API fornecida é inválida' }] });
    await expect(client.webhook(config, KEY, 'wh_01')).rejects.toMatchObject({ status: 401 });

    const resumed = answer(200, { id: 'wh_01', interrupted: false });
    await client.resumeWebhook(config, KEY, 'wh_01');
    expect([sent(resumed).url, sent(resumed).method, sent(resumed).body]).toEqual(['https://api-sandbox.asaas.com/v3/webhooks/wh_01', 'PUT', { enabled: true, interrupted: false }]);
  });

  it('says when Asaas asked to wait, by the seconds in RateLimit-Reset — and leaves the time out when it names none it can read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ errors: [] }, { status: 429, headers: { 'RateLimit-Reset': '120' } })));
    const before = Date.now();
    const throttled = (await client.account(config, KEY).catch((error: unknown) => error)) as AsaasThrottled;
    expect(throttled).toBeInstanceOf(AsaasThrottled);
    expect(throttled).toBeInstanceOf(AsaasUnreachable);
    expect(throttled.retryAt!.getTime()).toBeGreaterThanOrEqual(before + 120_000);
    expect(throttled.retryAt!.getTime()).toBeLessThan(before + 125_000);

    for (const header of [{}, { 'RateLimit-Reset': 'soon' }, { 'RateLimit-Reset': '-5' }] as Record<string, string>[]) {
      vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status: 429, headers: header })));
      expect(((await client.account(config, KEY).catch((error: unknown) => error)) as AsaasThrottled).retryAt).toBeNull();
    }
  });

  it('talks to production at its own address', async () => {
    const fetched = answer(200, { name: 'Lessari' });

    await client.account({ ...config, environment: 'PRODUCTION', baseUrl: 'https://api.asaas.com/v3' }, '$aact_prod_x');
    expect(sent(fetched).url).toBe('https://api.asaas.com/v3/myAccount/commercialInfo/');
  });

  /** A no decides something — another key; no answer decides nothing — try again. The two are kept apart, and neither carries the key. */
  it("tells Asaas's refusal, with its code, from no answer — and never repeats the key", async () => {
    answer(401, { errors: [{ code: 'invalid_environment', description: `A chave ${KEY} não pertence a este ambiente` }] });
    const refused = await client.account(config, KEY).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(AsaasRefused);
    expect(refused).toMatchObject({ status: 401, code: 'invalid_environment' });
    expect(String(refused)).not.toContain(KEY);

    answer(400, null);
    await expect(client.createWebhook(config, KEY, { name: 'n', url: 'u', email: 'e', authToken: 't' })).rejects.toMatchObject({ status: 400, code: null });

    answer(503, { message: 'down' });
    await expect(client.account(config, KEY)).rejects.toBeInstanceOf(AsaasUnreachable);
    answer(429, { errors: [{ code: 'too_many_requests', description: 'Limite excedido' }] });
    await expect(client.account(config, KEY)).rejects.toBeInstanceOf(AsaasUnreachable);

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed', { cause: Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }) }))));
    const unanswered = await client.deleteWebhook(config, KEY, 'wh_01').catch((error: unknown) => error);
    expect(unanswered).toBeInstanceOf(AsaasUnreachable);
    expect(String(unanswered)).toContain('TypeError, ECONNREFUSED');

    // fetch names a header it cannot send, value and all: only the failure's name is kept.
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError(`Headers.append: "${KEY}" is an invalid header value.`))));
    const unsent = await client.account(config, KEY).catch((error: unknown) => error);
    expect(unsent).toBeInstanceOf(AsaasUnreachable);
    expect(String(unsent)).not.toContain(KEY);

    answer(200, {});
    await expect(client.account(config, KEY)).rejects.toBeInstanceOf(AsaasUnreachable);
    await expect(client.createWebhook(config, KEY, { name: 'n', url: 'u', email: 'e', authToken: 't' })).rejects.toBeInstanceOf(AsaasUnreachable);
  });

  describe('charging (BEELINK-204)', () => {
    const paymentBody = { object: 'payment', id: 'pay_080225913252', status: 'PENDING', deleted: false, billingType: 'PIX', value: 59.9, netValue: 58.91, dueDate: '2026-10-07', invoiceUrl: 'https://sandbox.asaas.com/i/080225913252', installment: null, externalReference: 'order-1', aFieldAsaasAddsLater: { anything: true } };
    const request = { customerId: 'cus_1', billingType: 'PIX' as const, totalCents: 5990, installments: 1, dueDate: '2026-10-07', description: 'Pedido nº 1 — Lessari', externalReference: 'order-1' };

    it('looks a customer up by CPF, passing over one removed from the account', async () => {
      const fetched = answer(200, { object: 'list', hasMore: false, data: [{ id: 'cus_old', deleted: true }, { id: 'cus_1', deleted: false }] });

      expect(await client.findCustomer(config, KEY, '52998224725')).toBe('cus_1');
      const { url, method, headers } = sent(fetched);
      expect([url, method]).toEqual(['https://api-sandbox.asaas.com/v3/customers?cpfCnpj=52998224725&limit=100', 'GET']);
      expect(headers).toMatchObject({ access_token: KEY });

      answer(200, { object: 'list', hasMore: false, data: [] });
      expect(await client.findCustomer(config, KEY, '52998224725')).toBeNull();
    });

    it("registers a customer with Asaas's own notifications off, under bee-link's id of them", async () => {
      const fetched = answer(200, { id: 'cus_000005219613', deleted: false });

      expect(await client.createCustomer(config, KEY, { name: 'Bia Cliente', cpf: '52998224725', externalReference: 'customer-1' })).toBe('cus_000005219613');
      const { url, method, body } = sent(fetched);
      expect([url, method]).toEqual(['https://api-sandbox.asaas.com/v3/customers', 'POST']);
      expect(body).toEqual({ name: 'Bia Cliente', cpfCnpj: '52998224725', externalReference: 'customer-1', notificationDisabled: true });

      answer(200, {});
      await expect(client.createCustomer(config, KEY, { name: 'Bia', cpf: '52998224725', externalReference: 'c' })).rejects.toBeInstanceOf(AsaasUnreachable);
    });

    it('creates a charge in full with the value in reais, the due day and the order as its reference — and no callback', async () => {
      const fetched = answer(200, paymentBody);

      expect(await client.createCharge(config, KEY, request)).toEqual({ id: 'pay_080225913252', status: 'PENDING', deleted: false, billingType: 'PIX', valueCents: 5990, dueDate: '2026-10-07', invoiceUrl: 'https://sandbox.asaas.com/i/080225913252', installmentId: null, installmentNumber: null, externalReference: 'order-1', refunds: [] });
      const { url, method, headers, body } = sent(fetched);
      expect([url, method]).toEqual(['https://api-sandbox.asaas.com/v3/payments', 'POST']);
      expect(headers).toMatchObject({ access_token: KEY });
      expect(body).toEqual({ customer: 'cus_1', billingType: 'PIX', value: 59.9, dueDate: '2026-10-07', description: 'Pedido nº 1 — Lessari', externalReference: 'order-1' });
    });

    it('creates a card in instalments with the count and the total, never a value of its own', async () => {
      const fetched = answer(200, { ...paymentBody, billingType: 'CREDIT_CARD', value: 19.96, installment: 'ins_000000001', installmentNumber: 1 });

      expect(await client.createCharge(config, KEY, { ...request, billingType: 'CREDIT_CARD', installments: 3 })).toMatchObject({ valueCents: 1996, installmentId: 'ins_000000001', installmentNumber: 1 });
      expect(sent(fetched).body).toEqual({ customer: 'cus_1', billingType: 'CREDIT_CARD', installmentCount: 3, totalValue: 59.9, dueDate: '2026-10-07', description: 'Pedido nº 1 — Lessari', externalReference: 'order-1' });
    });

    /** A creation nobody answered may have been carried out: told apart from every other silence, so nobody asks again blind. */
    it('tells a creation left unanswered from one refused', async () => {
      answer(503, null);
      await expect(client.createCharge(config, KEY, request)).rejects.toBeInstanceOf(AsaasOutcomeUnknown);
      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'))));
      await expect(client.createCharge(config, KEY, request)).rejects.toBeInstanceOf(AsaasOutcomeUnknown);
      answer(200, {});
      await expect(client.createCharge(config, KEY, request)).rejects.toBeInstanceOf(AsaasOutcomeUnknown);

      // A 429 is turned away before anything is done: nothing was made, and the wait is told.
      answer(429, { errors: [] });
      const throttled = await client.createCharge(config, KEY, request).catch((error: unknown) => error);
      expect(throttled).toBeInstanceOf(AsaasThrottled);
      expect(throttled).not.toBeInstanceOf(AsaasOutcomeUnknown);

      answer(400, { errors: [{ code: 'invalid_customer', description: `Customer inválido para a chave ${KEY}.` }] });
      const refused = await client.createCharge(config, KEY, request).catch((error: unknown) => error);
      expect(refused).toBeInstanceOf(AsaasRefused);
      expect(refused).toMatchObject({ status: 400, code: 'invalid_customer' });
      expect(String(refused)).not.toContain(KEY);
    });

    it("lists an order's charges by its reference, page after page, without those removed", async () => {
      const pages = [
        { object: 'list', hasMore: true, data: [paymentBody, { ...paymentBody, id: 'pay_gone', deleted: true }] },
        { object: 'list', hasMore: false, data: [{ ...paymentBody, id: 'pay_2', status: 'OVERDUE' }, { noId: true }] },
      ];
      const fetched = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(pages.shift(), { status: 200 }));
      vi.stubGlobal('fetch', fetched);

      expect((await client.charges(config, KEY, 'order 1')).map((charge) => [charge.id, charge.status])).toEqual([['pay_080225913252', 'PENDING'], ['pay_2', 'OVERDUE']]);
      expect(fetched.mock.calls.map((call) => [String(call[0]), call[1]?.method])).toEqual([
        ['https://api-sandbox.asaas.com/v3/payments?externalReference=order%201&limit=100&offset=0', 'GET'],
        ['https://api-sandbox.asaas.com/v3/payments?externalReference=order%201&limit=100&offset=100', 'GET'],
      ]);

      answer(200, { unexpected: true });
      await expect(client.charges(config, KEY, 'order-1')).rejects.toBeInstanceOf(AsaasUnreachable);
    });

    it('reads one charge, removed or not, and answers none for an id the account does not hold', async () => {
      const fetched = answer(200, { ...paymentBody, status: 'RECEIVED', deleted: true });
      expect(await client.charge(config, KEY, 'pay_080225913252')).toMatchObject({ id: 'pay_080225913252', status: 'RECEIVED', deleted: true });
      expect([sent(fetched).url, sent(fetched).method]).toEqual(['https://api-sandbox.asaas.com/v3/payments/pay_080225913252', 'GET']);

      answer(404, { errors: [{ code: 'not_found', description: 'Cobrança não encontrada.' }] });
      expect(await client.charge(config, KEY, 'pay_x')).toBeNull();
      // Only a 404 is "none such": an answer nobody can read is not a charge that is gone.
      answer(200, { unexpected: true });
      await expect(client.charge(config, KEY, 'pay_x')).rejects.toBeInstanceOf(AsaasUnreachable);
    });

    it('keeps only an https invoice link, and does not break on what Asaas leaves out', async () => {
      answer(200, { id: 'pay_1', invoiceUrl: 'javascript:alert(1)' });
      expect(await client.charge(config, KEY, 'pay_1')).toEqual({ id: 'pay_1', status: 'UNKNOWN', deleted: false, billingType: 'UNDEFINED', valueCents: 0, dueDate: '', invoiceUrl: null, installmentId: null, installmentNumber: null, externalReference: null, refunds: [] });
    });

    it('removes a charge, and a whole plan, taking one already gone as gone and a refusal as a refusal', async () => {
      let fetched = answer(200, { deleted: true, id: 'pay_1' });
      await client.deleteCharge(config, KEY, 'pay_1');
      expect([sent(fetched).url, sent(fetched).method]).toEqual(['https://api-sandbox.asaas.com/v3/payments/pay_1', 'DELETE']);

      fetched = answer(200, { deleted: true, id: 'ins_1' });
      await client.deleteInstallment(config, KEY, 'ins_1');
      expect([sent(fetched).url, sent(fetched).method]).toEqual(['https://api-sandbox.asaas.com/v3/installments/ins_1', 'DELETE']);

      answer(404, { errors: [{ code: 'not_found', description: 'Não encontrada.' }] });
      await expect(client.deleteCharge(config, KEY, 'pay_1')).resolves.toBeUndefined();
      await expect(client.deleteInstallment(config, KEY, 'ins_1')).resolves.toBeUndefined();

      answer(400, { errors: [{ code: 'invalid_action', description: 'Cobrança já recebida.' }] });
      await expect(client.deleteCharge(config, KEY, 'pay_1')).rejects.toMatchObject({ status: 400, reason: 'Cobrança já recebida.' });
      await expect(client.deleteInstallment(config, KEY, 'ins_1')).rejects.toBeInstanceOf(AsaasRefused);
    });

    it("reads a Pix charge's code and QR, and when the code ends by Brasília's clock", async () => {
      const fetched = answer(200, { encodedImage: 'iVBORw0KGgo=', payload: '00020126580014br.gov.bcb.pix', expirationDate: '2026-10-07 23:59:59', description: 'Pedido nº 1' });

      expect(await client.pixQrCode(config, KEY, 'pay_1')).toEqual({ payload: '00020126580014br.gov.bcb.pix', encodedImage: 'iVBORw0KGgo=', expiresAt: new Date('2026-10-08T02:59:59.000Z') });
      expect([sent(fetched).url, sent(fetched).method]).toEqual(['https://api-sandbox.asaas.com/v3/payments/pay_1/pixQrCode', 'GET']);

      answer(200, { encodedImage: 'iVBORw0KGgo=', payload: '000201' });
      expect((await client.pixQrCode(config, KEY, 'pay_1')).expiresAt).toBeNull();
      answer(200, { payload: '000201' });
      await expect(client.pixQrCode(config, KEY, 'pay_1')).rejects.toBeInstanceOf(AsaasUnreachable);
    });

    it('never repeats the key in what any of these calls throws', async () => {
      const calls = [
        () => client.findCustomer(config, KEY, '52998224725'),
        () => client.createCustomer(config, KEY, { name: 'Bia', cpf: '52998224725', externalReference: 'c' }),
        () => client.charges(config, KEY, 'order-1'),
        () => client.charge(config, KEY, 'pay_1'),
        () => client.createCharge(config, KEY, request),
        () => client.deleteCharge(config, KEY, 'pay_1'),
        () => client.deleteInstallment(config, KEY, 'ins_1'),
        () => client.pixQrCode(config, KEY, 'pay_1'),
        () => client.refund(config, KEY, { id: 'pay_1', installmentId: null }, { valueCents: 1000, description: 'Defeito' }),
        () => client.refundsOf(config, KEY, { id: 'pay_1', installmentId: 'ins_1' }),
      ];
      for (const call of calls) {
        answer(401, { errors: [{ code: 'invalid_access_token', description: `A chave ${KEY} é inválida` }] });
        const refused = await call().catch((error: unknown) => error);
        expect(refused).toBeInstanceOf(AsaasRefused);
        expect(String(refused)).not.toContain(KEY);

        vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError(`Headers.append: "${KEY}" is an invalid header value.`))));
        const unsent = await call().catch((error: unknown) => error);
        expect(unsent).toBeInstanceOf(AsaasUnreachable);
        expect(String(unsent)).not.toContain(KEY);
      }
    });
  });

  describe('refunding (BEELINK-208)', () => {
    const paid = { object: 'payment', id: 'pay_1', status: 'RECEIVED', value: 59.9, billingType: 'PIX' };

    it('refunds a charge with the amount in reais and the reason, and answers its refunds as Asaas lists them', async () => {
      const fetched = answer(200, { ...paid, refunds: [{ dateCreated: '2026-10-06 10:00:00', status: 'DONE', value: 19.9, description: 'Defeito' }, { status: 'CANCELLED', value: 5 }, { value: 1.1 }, { status: 'PENDING' }] });

      expect(await client.refund(config, KEY, { id: 'pay_1', installmentId: null }, { valueCents: 1990, description: 'Defeito' })).toEqual({
        whole: false,
        // One with no status is not money back; one with no amount is nothing to count.
        refunds: [{ status: 'DONE', valueCents: 1990 }, { status: 'CANCELLED', valueCents: 500 }, { status: 'UNKNOWN', valueCents: 110 }],
      });
      const { url, method, body } = sent(fetched);
      expect([url, method]).toEqual(['https://api-sandbox.asaas.com/v3/payments/pay_1/refund', 'POST']);
      expect(body).toEqual({ value: 19.9, description: 'Defeito' });
    });

    it('refunds a plan as the one thing it is: by the plan, with the amount and no description', async () => {
      const fetched = answer(200, { object: 'installment', id: 'ins_1', refunds: [{ status: 'PENDING', value: 30, paymentId: 'pay_1' }] });

      expect(await client.refund(config, KEY, { id: 'pay_1', installmentId: 'ins_1' }, { valueCents: 3000, description: 'Defeito' })).toEqual({ whole: false, refunds: [{ status: 'PENDING', valueCents: 3000 }] });
      const { url, method, body } = sent(fetched);
      expect([url, method]).toEqual(['https://api-sandbox.asaas.com/v3/installments/ins_1/refund', 'POST']);
      expect(body).toEqual({ value: 30 });
    });

    it('says a charge Asaas calls refunded is whole, and reads `refunds: null` as none', async () => {
      answer(200, { ...paid, status: 'REFUNDED', refunds: null });

      expect(await client.refund(config, KEY, { id: 'pay_1', installmentId: null }, { valueCents: 5990, description: 'Defeito' })).toEqual({ whole: true, refunds: [] });
    });

    it("keeps Asaas's refusal — the balance — and does not know what a silence did", async () => {
      answer(400, { errors: [{ code: 'invalid_action', description: 'Saldo insuficiente para realizar o estorno.' }] });
      const refused = await client.refund(config, KEY, { id: 'pay_1', installmentId: null }, { valueCents: 5990, description: 'x' }).catch((error: unknown) => error);
      expect(refused).toMatchObject({ status: 400, code: 'invalid_action', reason: 'Saldo insuficiente para realizar o estorno.' });
      expect(refused).toBeInstanceOf(AsaasRefused);

      answer(502, {});
      await expect(client.refund(config, KEY, { id: 'pay_1', installmentId: null }, { valueCents: 5990, description: 'x' })).rejects.toBeInstanceOf(AsaasOutcomeUnknown);
      // A 429 turned the request away before anything was done.
      answer(429, {});
      const throttled = await client.refund(config, KEY, { id: 'pay_1', installmentId: null }, { valueCents: 5990, description: 'x' }).catch((error: unknown) => error);
      expect(throttled).toBeInstanceOf(AsaasThrottled);
      expect(throttled).not.toBeInstanceOf(AsaasOutcomeUnknown);
    });

    it("reads a charge's refunds, and a plan's, by its id; none such is null, and an answer with no id is not an answer", async () => {
      const one = answer(200, { ...paid, refunds: [{ status: 'DONE', value: 10 }] });
      expect(await client.refundsOf(config, KEY, { id: 'pay_1', installmentId: null })).toEqual({ whole: false, refunds: [{ status: 'DONE', valueCents: 1000 }] });
      expect([sent(one).url, sent(one).method]).toEqual(['https://api-sandbox.asaas.com/v3/payments/pay_1', 'GET']);

      const plan = answer(200, { object: 'installment', id: 'ins_1', refunds: [] });
      expect(await client.refundsOf(config, KEY, { id: 'pay_1', installmentId: 'ins_1' })).toEqual({ whole: false, refunds: [] });
      expect(sent(plan).url).toBe('https://api-sandbox.asaas.com/v3/installments/ins_1');

      answer(404, { errors: [{ code: 'not_found', description: 'Not found' }] });
      expect(await client.refundsOf(config, KEY, { id: 'pay_9', installmentId: null })).toBeNull();
      answer(200, {});
      await expect(client.refundsOf(config, KEY, { id: 'pay_1', installmentId: null })).rejects.toBeInstanceOf(AsaasUnreachable);
    });
  });
});
