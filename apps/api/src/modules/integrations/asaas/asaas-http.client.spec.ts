// Libs
import { afterEach, describe, expect, it, vi } from 'vitest';

// App
import { AsaasOutcomeUnknown, AsaasRefused, AsaasUnreachable } from './asaas.client.js';
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

      expect(await client.createCharge(config, KEY, request)).toEqual({ id: 'pay_080225913252', status: 'PENDING', deleted: false, billingType: 'PIX', valueCents: 5990, dueDate: '2026-10-07', invoiceUrl: 'https://sandbox.asaas.com/i/080225913252', installmentId: null, installmentNumber: null, externalReference: 'order-1' });
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
    });

    it('keeps only an https invoice link, and does not break on what Asaas leaves out', async () => {
      answer(200, { id: 'pay_1', invoiceUrl: 'javascript:alert(1)' });
      expect(await client.charge(config, KEY, 'pay_1')).toEqual({ id: 'pay_1', status: 'UNKNOWN', deleted: false, billingType: 'UNDEFINED', valueCents: 0, dueDate: '', invoiceUrl: null, installmentId: null, installmentNumber: null, externalReference: null });
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
});
