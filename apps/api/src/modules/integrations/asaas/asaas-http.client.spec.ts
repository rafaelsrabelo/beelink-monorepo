// Libs
import { afterEach, describe, expect, it, vi } from 'vitest';

// App
import { AsaasRefused, AsaasUnreachable } from './asaas.client.js';
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
});
