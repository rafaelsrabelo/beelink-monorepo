// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { MelhorEnvioEnvironment } from '@harness-monorepo/contracts';

// App
import { env } from '../../../shared/config/env.js';
import { vaultKeyOf } from '../secret-vault.js';

/** The deployment's Melhor Envio app: who it is, where it answers, and the key its tokens are sealed under. */
export interface MelhorEnvioConfig {
  environment: MelhorEnvioEnvironment;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Melhor Envio refuses a request without one naming the app and a contact. */
  userAgent: string;
  vaultKey: Buffer;
}

const BASE_URLS: Record<MelhorEnvioEnvironment, string> = {
  SANDBOX: 'https://sandbox.melhorenvio.com.br',
  PRODUCTION: 'https://melhorenvio.com.br',
};

/** The environment this deployment talks to, set up or not: the panel says which, either way. */
export const melhorEnvioEnvironment = (): MelhorEnvioEnvironment => (env.MELHOR_ENVIO_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX');

/** The deployment's app, or null when it has none — then nothing can be connected here. */
export function melhorEnvioConfig(): MelhorEnvioConfig | null {
  const { MELHOR_ENVIO_CLIENT_ID: clientId, MELHOR_ENVIO_CLIENT_SECRET: clientSecret, MELHOR_ENVIO_REDIRECT_URI: redirectUri, INTEGRATIONS_SECRET_KEY: key } = env;
  if (!clientId || !clientSecret || !redirectUri || !key) return null;

  const environment = melhorEnvioEnvironment();
  return { environment, baseUrl: BASE_URLS[environment], clientId, clientSecret, redirectUri, userAgent: `bee-link (${env.MELHOR_ENVIO_CONTACT_EMAIL})`, vaultKey: vaultKeyOf(key) };
}

/**
 * What a shop authorizes: what the epic uses, up to the labels and their tracking (N7) — asking for
 * less now would send every shop through the authorization again later. Melhor Envio does not say
 * which scope each route needs; the label tickets confirm these against the sandbox.
 */
export const MELHOR_ENVIO_SCOPES = [
  'users-read',
  'transactions-read',
  'shipping-calculate',
  'shipping-companies',
  'cart-read',
  'cart-write',
  'shipping-checkout',
  'shipping-generate',
  'shipping-preview',
  'shipping-print',
  'shipping-tracking',
  'shipping-cancel',
  'orders-read',
] as const;

/** What a code or a refresh token is traded for. The refresh token changes with every trade. */
export interface MelhorEnvioTokens {
  accessToken: string;
  refreshToken: string;
  /** The access token's life, from now; 30 days at Melhor Envio. */
  expiresInSeconds: number;
}

/** Whose account authorized the app. */
export interface MelhorEnvioAccountInfo {
  id: string;
  name: string;
  email: string | null;
}

/** Melhor Envio answered, and said no: the code or the refresh token is not good, or the access was revoked. */
export class MelhorEnvioRefused extends Error {
  constructor(readonly status: number, detail: string) {
    super(`Melhor Envio refused (${status}): ${detail}`);
  }
}

/** Melhor Envio did not answer, or answered with its own failure: nothing was decided, and trying again may work. */
export class MelhorEnvioUnreachable extends Error {}

const TIMEOUT_MS = 10_000;

function tokensOf(body: unknown): MelhorEnvioTokens {
  const answer = (body ?? {}) as Record<string, unknown>;
  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = answer;
  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' || typeof expiresIn !== 'number' || expiresIn <= 0) {
    throw new MelhorEnvioUnreachable('Melhor Envio answered the token request without tokens');
  }
  return { accessToken, refreshToken, expiresInSeconds: expiresIn };
}

/**
 * Melhor Envio's side of a shop's connection: the authorization address, the two token trades and who
 * the account is. A provider of its own, so a test stands a fake Melhor Envio in its place, as Google's
 * door does. Nothing here keeps or logs a token: the caller seals what it gets.
 */
@Injectable()
export class MelhorEnvioClient {
  authorizationUrl(config: MelhorEnvioConfig, state: string): string {
    const url = new URL('/oauth/authorize', config.baseUrl);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state,
      scope: MELHOR_ENVIO_SCOPES.join(' '),
    }).toString();
    return url.toString();
  }

  exchange(config: MelhorEnvioConfig, code: string): Promise<MelhorEnvioTokens> {
    return this.token(config, { grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, code });
  }

  refresh(config: MelhorEnvioConfig, refreshToken: string): Promise<MelhorEnvioTokens> {
    return this.token(config, { grant_type: 'refresh_token', client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken });
  }

  async account(config: MelhorEnvioConfig, accessToken: string): Promise<MelhorEnvioAccountInfo> {
    const body = (await this.call(config, '/api/v2/me', { method: 'GET', headers: { authorization: `Bearer ${accessToken}` } })) as Record<string, unknown>;
    const name = [body.firstname, body.lastname].filter((part): part is string => typeof part === 'string' && part.trim() !== '').join(' ').trim();
    if (typeof body.id !== 'string') throw new MelhorEnvioUnreachable('Melhor Envio answered the account request without an account');
    return { id: body.id, name: name || (typeof body.email === 'string' ? body.email : body.id), email: typeof body.email === 'string' ? body.email : null };
  }

  private async token(config: MelhorEnvioConfig, body: Record<string, string>): Promise<MelhorEnvioTokens> {
    return tokensOf(await this.call(config, '/oauth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  }

  /** One request, answered: a 4xx is Melhor Envio's no; no answer, or a 5xx, is not knowing. */
  private async call(config: MelhorEnvioConfig, path: string, init: { method: string; headers: Record<string, string>; body?: string }): Promise<unknown> {
    const response = await fetch(new URL(path, config.baseUrl), {
      method: init.method,
      headers: { accept: 'application/json', 'user-agent': config.userAgent, ...init.headers },
      body: init.body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new MelhorEnvioUnreachable(error instanceof Error ? error.message : 'Melhor Envio did not answer');
    });

    const answer: unknown = await response.json().catch(() => null);
    if (response.status >= 500) throw new MelhorEnvioUnreachable(`Melhor Envio failed (${response.status})`);
    if (!response.ok) {
      // Its error's words, never the request's: a refused token request carries the secret in its body.
      const words = answer && typeof answer === 'object' ? ((answer as Record<string, unknown>).error ?? (answer as Record<string, unknown>).message) : null;
      throw new MelhorEnvioRefused(response.status, typeof words === 'string' ? words : 'no reason given');
    }
    return answer;
  }
}
