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
});
