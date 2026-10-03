// Libs
import { afterEach, describe, expect, it, vi } from 'vitest';

// App
import { MelhorEnvioClient, MelhorEnvioRefused, MelhorEnvioUnreachable, type MelhorEnvioConfig } from './melhor-envio.client.js';

const config: MelhorEnvioConfig = {
  environment: 'SANDBOX',
  baseUrl: 'https://sandbox.melhorenvio.com.br',
  clientId: '7777',
  clientSecret: 'the-secret',
  redirectUri: 'https://link.beecoders.net/api/integrations/melhor-envio/callback',
  userAgent: 'bee-link (contato@beecoders.net)',
  vaultKey: Buffer.alloc(32),
};
const client = new MelhorEnvioClient();
const tokens = { token_type: 'Bearer', expires_in: 2592000, access_token: 'eyJ.access', refresh_token: 'def.refresh' };

function answer(status: number, body: unknown) {
  const fetched = vi.fn(async (_url: URL, _init?: RequestInit) => Response.json(body, { status }));
  vi.stubGlobal('fetch', fetched);
  return fetched;
}
const sent = (fetched: ReturnType<typeof answer>) => ({
  url: String(fetched.mock.calls[0]?.[0]),
  headers: fetched.mock.calls[0]?.[1]?.headers as Record<string, string>,
  body: JSON.parse(String(fetched.mock.calls[0]?.[1]?.body ?? 'null')) as unknown,
});

afterEach(() => vi.unstubAllGlobals());

describe('MelhorEnvioClient', () => {
  it('builds the authorization address with the app, the fixed return, the state and the scopes, space-separated', () => {
    const url = new URL(client.authorizationUrl(config, 'the-state'));

    expect(url.origin + url.pathname).toBe('https://sandbox.melhorenvio.com.br/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: '7777', redirect_uri: config.redirectUri, response_type: 'code', state: 'the-state' });
    expect(url.searchParams.get('scope')?.split(' ')).toEqual(expect.arrayContaining(['users-read', 'shipping-calculate', 'shipping-checkout', 'shipping-tracking']));
  });

  it('trades the code for the tokens, as JSON, with the app and the User-Agent Melhor Envio requires', async () => {
    const fetched = answer(200, tokens);

    expect(await client.exchange(config, 'the-code')).toEqual({ accessToken: 'eyJ.access', refreshToken: 'def.refresh', expiresInSeconds: 2592000 });
    const { url, headers, body } = sent(fetched);
    expect(url).toBe('https://sandbox.melhorenvio.com.br/oauth/token');
    expect(headers).toMatchObject({ accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'bee-link (contato@beecoders.net)' });
    expect(body).toEqual({ grant_type: 'authorization_code', client_id: '7777', client_secret: 'the-secret', redirect_uri: config.redirectUri, code: 'the-code' });
  });

  it('trades the refresh token for new ones', async () => {
    const fetched = answer(200, { ...tokens, refresh_token: 'def.next' });

    expect(await client.refresh(config, 'def.refresh')).toMatchObject({ refreshToken: 'def.next' });
    expect(sent(fetched).body).toEqual({ grant_type: 'refresh_token', client_id: '7777', client_secret: 'the-secret', refresh_token: 'def.refresh' });
  });

  /** A no decides something — reconnect; no answer decides nothing — try again later. The two are kept apart. */
  it('tells a refusal from no answer, and keeps the request out of the refusal', async () => {
    answer(401, { error: 'invalid_grant', message: 'The refresh token is invalid.' });
    const refused = await client.refresh(config, 'def.refresh').catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(MelhorEnvioRefused);
    expect(String(refused)).not.toContain('the-secret');

    answer(503, { message: 'down' });
    await expect(client.refresh(config, 'def.refresh')).rejects.toBeInstanceOf(MelhorEnvioUnreachable);

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    await expect(client.exchange(config, 'the-code')).rejects.toBeInstanceOf(MelhorEnvioUnreachable);

    answer(200, { token_type: 'Bearer' });
    await expect(client.exchange(config, 'the-code')).rejects.toBeInstanceOf(MelhorEnvioUnreachable);
  });

  it("reads the wallet's balance in cents, and the services by carrier then name, dropping a malformed one", async () => {
    let fetched = answer(200, { balance: 1624.9, reserved: 0, debts: 87 });
    expect(await client.balanceCents(config, 'eyJ.access')).toBe(162490);
    expect(sent(fetched).url).toBe('https://sandbox.melhorenvio.com.br/api/v2/me/balance');

    fetched = answer(200, [
      { id: 2, name: 'SEDEX', company: { id: 1, name: 'Correios' } },
      { id: 3, name: '.Package', company: { id: 2, name: 'Jadlog' } },
      { id: 1, name: 'PAC', company: { id: 1, name: 'Correios' } },
      { id: 'x', name: 'Broken' },
    ]);
    expect(await client.services(config, 'eyJ.access')).toEqual([
      { id: 1, name: 'PAC', company: 'Correios' },
      { id: 2, name: 'SEDEX', company: 'Correios' },
      { id: 3, name: '.Package', company: 'Jadlog' },
    ]);
    expect(sent(fetched).url).toBe('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/services');
  });

  it("reads whose account it is, with the shop's bearer token", async () => {
    const fetched = answer(200, { id: '779f4d62', firstname: 'Rafael', lastname: 'Rabelo', email: 'loja@exemplo.com', document: '12345678900' });

    expect(await client.account(config, 'eyJ.access')).toEqual({ id: '779f4d62', name: 'Rafael Rabelo', email: 'loja@exemplo.com' });
    const { url, headers } = sent(fetched);
    expect(url).toBe('https://sandbox.melhorenvio.com.br/api/v2/me');
    expect(headers).toMatchObject({ authorization: 'Bearer eyJ.access', 'user-agent': 'bee-link (contato@beecoders.net)' });
  });

  describe('the quote of a cart (BEELINK-185)', () => {
    const cart = { fromZipCode: '01310930', toZipCode: '30140071', products: [{ id: 'v1', lengthCm: 26, widthCm: 20, heightCm: 4, weightKg: 0.3, insuranceReais: 59.9, quantity: 2 }], serviceIds: [1, 2] };
    const sedex = {
      id: 2,
      name: 'SEDEX',
      price: '31.90',
      custom_price: '27.45',
      delivery_time: 3,
      delivery_range: { min: 2, max: 3 },
      custom_delivery_time: 4,
      custom_delivery_range: { min: 3, max: 4 },
      packages: [{ dimensions: { height: 8, width: 20, length: 26 }, weight: '0.60' }],
      company: { id: 1, name: 'Correios' },
    };

    it("sends the products for Melhor Envio to pack, the services asked for, with the shop's token", async () => {
      const fetched = answer(200, [sedex]);

      await client.quote(config, 'eyJ.access', cart);

      const { url, headers, body } = sent(fetched);
      expect(url).toBe('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate');
      expect(headers).toMatchObject({ authorization: 'Bearer eyJ.access', 'content-type': 'application/json' });
      expect(body).toEqual({
        from: { postal_code: '01310930' },
        to: { postal_code: '30140071' },
        products: [{ id: 'v1', width: 20, height: 4, length: 26, weight: 0.3, insurance_value: 59.9, quantity: 2 }],
        options: { receipt: false, own_hand: false },
        services: '1,2',
      });
    });

    it('asks about every service when the shop never chose', async () => {
      const fetched = answer(200, [sedex]);

      await client.quote(config, 'eyJ.access', { ...cart, serviceIds: null });

      expect(sent(fetched).body).not.toHaveProperty('services');
    });

    it("reads the account's own price and time, in cents and business days", async () => {
      answer(200, [sedex]);

      expect(await client.quote(config, 'eyJ.access', cart)).toEqual([
        // The box Melhor Envio packed the cart in, in grams and millimetres (BEELINK-187).
        { serviceId: 2, service: 'SEDEX', company: 'Correios', priceCents: 2745, daysFrom: 3, daysTo: 4, packages: [{ weightGrams: 600, lengthMm: 260, widthMm: 200, heightMm: 80 }] },
      ]);
    });

    it("falls back to Melhor Envio's general price and single time where the account has none of its own", async () => {
      answer(200, [{ id: 1, name: 'PAC', price: '18.20', delivery_time: 7, company: { name: 'Correios' } }]);

      expect(await client.quote(config, 'eyJ.access', cart)).toEqual([{ serviceId: 1, service: 'PAC', company: 'Correios', priceCents: 1820, daysFrom: 7, daysTo: 7, packages: [] }]);
    });

    it('leaves out a service that refuses the cart, and one sent with no price, without failing the others', async () => {
      answer(200, [sedex, { id: 3, name: '.Package', error: 'Transportadora não atende este trecho.', company: { name: 'Jadlog' } }, { id: 4, name: '.Com', company: { name: 'Jadlog' } }]);

      expect((await client.quote(config, 'eyJ.access', cart)).map((service) => service.service)).toEqual(['SEDEX']);
    });

    it('reads one service answered alone rather than in a list', async () => {
      answer(200, sedex);

      expect(await client.quote(config, 'eyJ.access', { ...cart, serviceIds: [2] })).toHaveLength(1);
    });

    it('tells no answer from a no', async () => {
      answer(503, null);
      await expect(client.quote(config, 'eyJ.access', cart)).rejects.toBeInstanceOf(MelhorEnvioUnreachable);

      answer(401, { message: 'Unauthenticated.' });
      await expect(client.quote(config, 'eyJ.access', cart)).rejects.toBeInstanceOf(MelhorEnvioRefused);
    });
  });

  describe('the label (BEELINK-187)', () => {
    const party = { name: 'Loja Lessari', phone: '11999998888', email: 'loja@lessari.com.br', document: '11222333000181', stateRegister: null, street: 'Rua Augusta', number: '1500', complement: null, district: 'Consolação', city: 'São Paulo', state: 'SP', zipCode: '01310930' };
    const request = {
      serviceId: 2,
      from: party,
      to: { ...party, name: 'Bia Cliente', document: '52998224725', email: null, complement: 'apto 12', zipCode: '30140071' },
      products: [{ name: 'Blusa', quantity: 2, unitReais: 59.9 }],
      volume: { lengthCm: 26, widthCm: 20, heightCm: 8, weightKg: 0.6 },
      insuranceReais: 119.8,
      invoiceKey: null,
      tag: '#12',
    };
    const ID = '9b5c4ad3-6f0e-4b7a-9d4c-0d6a4b0c8f11';

    it('puts the label in the cart: the shop as a company, the customer as a person, one box, a declaration of contents', async () => {
      const fetched = answer(201, { id: ID, protocol: 'ORD-202610020001', price: 27.45, status: 'pending' });

      expect(await client.addToCart(config, 'eyJ.access', request)).toEqual({ id: ID, protocol: 'ORD-202610020001', priceCents: 2745 });
      const { url, body } = sent(fetched);
      expect(url).toBe('https://sandbox.melhorenvio.com.br/api/v2/me/cart');
      expect(body).toMatchObject({
        service: 2,
        from: { name: 'Loja Lessari', company_document: '11222333000181', address: 'Rua Augusta', number: '1500', district: 'Consolação', city: 'São Paulo', state_abbr: 'SP', country_id: 'BR', postal_code: '01310930' },
        to: { name: 'Bia Cliente', document: '52998224725', complement: 'apto 12', postal_code: '30140071' },
        products: [{ name: 'Blusa', quantity: 2, unitary_value: 59.9 }],
        volumes: [{ height: 8, width: 20, length: 26, weight: 0.6 }],
        options: { insurance_value: 119.8, non_commercial: true, receipt: false, own_hand: false, tags: [{ tag: '#12', url: null }] },
      });
      expect((body as { to: object }).to).not.toHaveProperty('company_document');
      expect((body as { options: object }).options).not.toHaveProperty('invoice');
    });

    it('sends the invoice on a commercial shipment', async () => {
      const fetched = answer(201, { id: ID, protocol: null, price: '27.45' });

      await client.addToCart(config, 'eyJ.access', { ...request, invoiceKey: '3'.repeat(44) });

      expect(sent(fetched).body).toMatchObject({ options: { non_commercial: false, invoice: { key: '3'.repeat(44) } } });
    });

    it("says Melhor Envio's own words when it refuses a label", async () => {
      answer(422, { message: 'The given data was invalid.', errors: { 'to.document': ['O campo to.document é obrigatório.'] } });

      await expect(client.addToCart(config, 'eyJ.access', request)).rejects.toMatchObject({ status: 422, reason: 'O campo to.document é obrigatório.' });
    });

    it('pays, generates, prints at a public address, tracks and cancels — each by the label id', async () => {
      let fetched = answer(200, { purchase: { id: 'p1', status: 'paid' } });
      await client.checkout(config, 'eyJ.access', ID);
      expect(sent(fetched)).toMatchObject({ url: 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/checkout', body: { orders: [ID] } });

      fetched = answer(200, { [ID]: { status: true, message: 'Envio gerado com sucesso' } });
      expect(await client.generate(config, 'eyJ.access', ID)).toEqual({ generated: true, message: 'Envio gerado com sucesso' });

      fetched = answer(200, { url: 'https://sandbox.melhorenvio.com.br/imprimir/ixQLaqqjmb2E' });
      expect(await client.print(config, 'eyJ.access', ID)).toBe('https://sandbox.melhorenvio.com.br/imprimir/ixQLaqqjmb2E');
      expect(sent(fetched).body).toEqual({ mode: 'public', orders: [ID] });

      answer(200, { [ID]: { id: ID, status: 'released', tracking: null, melhorenvio_tracking: 'ME23002OWZ7BR' } });
      expect(await client.tracking(config, 'eyJ.access', ID)).toEqual({ status: 'released', trackingCode: 'ME23002OWZ7BR' });

      answer(200, { [ID]: { cancellable: true, time: 0 } });
      expect(await client.cancellable(config, 'eyJ.access', ID)).toBe(true);

      fetched = answer(200, { [ID]: { canceled: true } });
      expect(await client.cancel(config, 'eyJ.access', ID, 'Pedido cancelado')).toBe(true);
      expect(sent(fetched).body).toEqual({ order: { id: ID, reason_id: '2', description: 'Pedido cancelado' } });
    });

    it('takes a label out of the cart, which answers with nothing', async () => {
      const fetched = vi.fn(async (_url: URL, _init?: RequestInit) => new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetched);

      await client.removeFromCart(config, 'eyJ.access', ID);

      expect(String(fetched.mock.calls[0]?.[0])).toBe(`https://sandbox.melhorenvio.com.br/api/v2/me/cart/${ID}`);
    });
  });
});
