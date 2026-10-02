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

      expect(await client.quote(config, 'eyJ.access', cart)).toEqual([{ serviceId: 2, service: 'SEDEX', company: 'Correios', priceCents: 2745, daysFrom: 3, daysTo: 4 }]);
    });

    it("falls back to Melhor Envio's general price and single time where the account has none of its own", async () => {
      answer(200, [{ id: 1, name: 'PAC', price: '18.20', delivery_time: 7, company: { name: 'Correios' } }]);

      expect(await client.quote(config, 'eyJ.access', cart)).toEqual([{ serviceId: 1, service: 'PAC', company: 'Correios', priceCents: 1820, daysFrom: 7, daysTo: 7 }]);
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
});
