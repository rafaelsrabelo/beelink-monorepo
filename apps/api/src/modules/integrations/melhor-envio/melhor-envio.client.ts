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

/** One of Melhor Envio's services, as the panel lists it. */
export interface MelhorEnvioServiceInfo {
  id: number;
  name: string;
  company: string;
}

/** One product of a cart, as Melhor Envio measures it: whole centimetres, kilograms, reais. */
export interface MelhorEnvioQuoteProduct {
  id: string;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  weightKg: number;
  /** What one unit is worth: what the carrier answers for if it is lost. */
  insuranceReais: number;
  quantity: number;
}

/** A cart to quote, from the shop's CEP to the customer's. Melhor Envio packs the products into volumes itself. */
export interface MelhorEnvioQuoteRequest {
  fromZipCode: string;
  toZipCode: string;
  products: readonly MelhorEnvioQuoteProduct[];
  /** The services to ask about; null asks about every one. */
  serviceIds: readonly number[] | null;
}

/** A box as Melhor Envio packed a cart into it: grams and millimetres, bee-link's own units. */
export interface MelhorEnvioPackage {
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

/** A service that takes the cart, at the shop's own account's price and time. */
export interface MelhorEnvioQuotedService {
  serviceId: number;
  service: string;
  company: string;
  priceCents: number;
  /** Business days from posting. */
  daysFrom: number;
  daysTo: number;
  /** The boxes Melhor Envio assumed for the cart (BEELINK-187); empty when it sent none. */
  packages: MelhorEnvioPackage[];
}

/** One end of a label: who sends it, or who receives it. */
export interface MelhorEnvioParty {
  name: string;
  phone: string | null;
  email: string | null;
  /** A CPF, or a CNPJ — 11 or 14 digits. */
  document: string;
  stateRegister: string | null;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

/** A label to put in Melhor Envio's cart (BEELINK-187): one box, for one service. */
export interface MelhorEnvioCartRequest {
  serviceId: number;
  from: MelhorEnvioParty;
  to: MelhorEnvioParty;
  /** What goes in the box, for the declaration of contents. */
  products: readonly { name: string; quantity: number; unitReais: number }[];
  volume: { lengthCm: number; widthCm: number; heightCm: number; weightKg: number };
  insuranceReais: number;
  /** The NF-e's 44-digit key on a commercial shipment; null sends a declaration of contents. */
  invoiceKey: string | null;
  /** The order's number at the shop, shown on Melhor Envio's side to find it. */
  tag: string;
}

/** A label in the cart: what every later step is asked with, and what it costs. */
export interface MelhorEnvioCartItem {
  id: string;
  protocol: string | null;
  priceCents: number;
}

/** Where a label stands at Melhor Envio, and its tracking code once there is one. */
export interface MelhorEnvioTracking {
  status: string;
  trackingCode: string | null;
}

/** Melhor Envio speaks reais in decimals; bee-link, cents. The one place the two meet. */
export const centsOfReais = (reais: number): number => Math.round(reais * 100);

/**
 * What Melhor Envio said when it refused: the first of a validation's own words — "O campo to.document
 * é obrigatório." — else its message.
 */
function wordsOf(answer: unknown): string {
  if (!answer || typeof answer !== 'object') return 'no reason given';
  const { error, message, errors } = answer as Record<string, unknown>;
  const first = errors && typeof errors === 'object' ? Object.values(errors as Record<string, unknown>).flat().find((each): each is string => typeof each === 'string') : undefined;
  return first ?? (typeof error === 'string' ? error : typeof message === 'string' ? message : 'no reason given');
}

/** Melhor Envio answered, and said no: the code or the refresh token is not good, or the access was revoked. */
export class MelhorEnvioRefused extends Error {
  constructor(readonly status: number, readonly reason: string) {
    super(`Melhor Envio refused (${status}): ${reason}`);
  }
}

/** Melhor Envio did not answer, or answered with its own failure: nothing was decided, and trying again may work. */
export class MelhorEnvioUnreachable extends Error {}

const TIMEOUT_MS = 10_000;
/** A checkout waits on this one: past it, the list goes out with the shop's own options alone. */
const QUOTE_TIMEOUT_MS = 4_000;

const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * One entry of a quote as bee-link reads it, or null when it is no offer: a service that does not take
 * this cart arrives with an `error` and no price. The account's own figures first (`custom_*`) — its
 * negotiated price and time — and Melhor Envio's general ones where it sent none.
 */
function quotedServiceOf(entry: unknown): MelhorEnvioQuotedService | null {
  const service = (entry ?? {}) as Record<string, unknown> & { company?: { name?: unknown } };
  if (service.error || typeof service.id !== 'number' || typeof service.name !== 'string' || typeof service.company?.name !== 'string') return null;

  const price = Number.parseFloat(String(service.custom_price ?? service.price));
  if (!Number.isFinite(price) || price < 0) return null;

  const range = (service.custom_delivery_range ?? service.delivery_range ?? {}) as { min?: unknown; max?: unknown };
  const days = service.custom_delivery_time ?? service.delivery_time;
  const daysFrom = positive(range.min) ? range.min : days;
  const daysTo = positive(range.max) ? range.max : days;
  if (!positive(daysFrom) || !positive(daysTo) || daysFrom > daysTo) return null;

  return { serviceId: service.id, service: service.name, company: service.company.name, priceCents: centsOfReais(price), daysFrom, daysTo, packages: packagesOf(service.packages) };
}

/** The boxes a quote assumed, in grams and millimetres; one sent malformed is left out. */
function packagesOf(raw: unknown): MelhorEnvioPackage[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry: unknown) => {
    const box = (entry ?? {}) as { weight?: unknown; dimensions?: { height?: unknown; width?: unknown; length?: unknown } };
    const kg = Number.parseFloat(String(box.weight));
    const [height, width, length] = [box.dimensions?.height, box.dimensions?.width, box.dimensions?.length].map((cm) => Number(cm));
    if (![kg, height, width, length].every((value) => Number.isFinite(value) && value! > 0)) return [];
    return [{ weightGrams: Math.round(kg * 1000), lengthMm: Math.round(length! * 10), widthMm: Math.round(width! * 10), heightMm: Math.round(height! * 10) }];
  });
}

/** A party as Melhor Envio's cart reads it: a CPF goes as `document`, a CNPJ as `company_document`. */
function partyOf(party: MelhorEnvioParty) {
  return {
    name: party.name,
    ...(party.phone ? { phone: party.phone } : {}),
    ...(party.email ? { email: party.email } : {}),
    ...(party.document.length === 14 ? { company_document: party.document } : { document: party.document }),
    ...(party.stateRegister ? { state_register: party.stateRegister } : {}),
    address: party.street,
    number: party.number,
    ...(party.complement ? { complement: party.complement } : {}),
    district: party.district,
    city: party.city,
    state_abbr: party.state,
    country_id: 'BR',
    postal_code: party.zipCode,
  };
}

/** The entry an answer keyed by label id holds for one label, or an empty one. */
function entryFor(answer: unknown, id: string): Record<string, unknown> {
  const keyed = (answer ?? {}) as Record<string, unknown>;
  const entry = keyed[id];
  return entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
}

function tokensOf(body: unknown): MelhorEnvioTokens {
  const answer = (body ?? {}) as Record<string, unknown>;
  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = answer;
  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' || typeof expiresIn !== 'number' || expiresIn <= 0) {
    throw new MelhorEnvioUnreachable('Melhor Envio answered the token request without tokens');
  }
  return { accessToken, refreshToken, expiresInSeconds: expiresIn };
}

/**
 * Melhor Envio's side of a shop's connection: the authorization address, the two token trades, who
 * the account is, and what its carriers charge for a cart. A provider of its own, so a test stands a fake Melhor Envio in its place, as Google's
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

  /** What the shop's wallet holds now, in cents. */
  async balanceCents(config: MelhorEnvioConfig, accessToken: string): Promise<number> {
    const body = (await this.call(config, '/api/v2/me/balance', { method: 'GET', headers: { authorization: `Bearer ${accessToken}` } })) as Record<string, unknown>;
    if (typeof body.balance !== 'number') throw new MelhorEnvioUnreachable('Melhor Envio answered the balance request without a balance');
    return centsOfReais(body.balance);
  }

  /** Every service Melhor Envio offers, by carrier then name; one it sends malformed is left out rather than failing the list. */
  async services(config: MelhorEnvioConfig, accessToken: string): Promise<MelhorEnvioServiceInfo[]> {
    const body = await this.call(config, '/api/v2/me/shipment/services', { method: 'GET', headers: { authorization: `Bearer ${accessToken}` } });
    if (!Array.isArray(body)) throw new MelhorEnvioUnreachable('Melhor Envio answered the services request without a list');
    return body
      .flatMap((entry: unknown) => {
        const service = (entry ?? {}) as { id?: unknown; name?: unknown; company?: { name?: unknown } };
        return typeof service.id === 'number' && typeof service.name === 'string' && typeof service.company?.name === 'string' ? [{ id: service.id, name: service.name, company: service.company.name }] : [];
      })
      .sort((a, b) => a.company.localeCompare(b.company, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  }

  /**
   * What each service charges to take a cart from the shop to an address (BEELINK-185), the services
   * that refuse it left out. The products go as they are and Melhor Envio packs them: the volumes it
   * assumed are its own estimate, which the shopkeeper checks against the real box when buying the label.
   */
  async quote(config: MelhorEnvioConfig, accessToken: string, request: MelhorEnvioQuoteRequest): Promise<MelhorEnvioQuotedService[]> {
    const body = {
      from: { postal_code: request.fromZipCode },
      to: { postal_code: request.toZipCode },
      products: request.products.map((product) => ({
        id: product.id,
        width: product.widthCm,
        height: product.heightCm,
        length: product.lengthCm,
        weight: product.weightKg,
        insurance_value: product.insuranceReais,
        quantity: product.quantity,
      })),
      options: { receipt: false, own_hand: false },
      ...(request.serviceIds ? { services: request.serviceIds.join(',') } : {}),
    };
    const answer = await this.call(config, '/api/v2/me/shipment/calculate', { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }, QUOTE_TIMEOUT_MS);
    if (!answer || typeof answer !== 'object') throw new MelhorEnvioUnreachable('Melhor Envio answered the quote without services');
    // Asked about one service, it answers that one alone rather than a list of one.
    return (Array.isArray(answer) ? answer : [answer]).flatMap((entry: unknown) => quotedServiceOf(entry) ?? []);
  }

  /** A label into Melhor Envio's cart (BEELINK-187): nothing is paid yet, and it can still be taken out. */
  async addToCart(config: MelhorEnvioConfig, accessToken: string, request: MelhorEnvioCartRequest): Promise<MelhorEnvioCartItem> {
    const body = {
      service: request.serviceId,
      from: partyOf(request.from),
      to: partyOf(request.to),
      products: request.products.map((product) => ({ name: product.name, quantity: product.quantity, unitary_value: product.unitReais })),
      volumes: [{ height: request.volume.heightCm, width: request.volume.widthCm, length: request.volume.lengthCm, weight: request.volume.weightKg }],
      options: {
        insurance_value: request.insuranceReais,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: request.invoiceKey === null,
        ...(request.invoiceKey ? { invoice: { key: request.invoiceKey } } : {}),
        platform: 'Beelink',
        tags: [{ tag: request.tag, url: null }],
      },
    };
    const answer = (await this.call(config, '/api/v2/me/cart', this.posting(accessToken, body))) as Record<string, unknown> | null;
    const price = Number.parseFloat(String(answer?.price));
    if (typeof answer?.id !== 'string' || !Number.isFinite(price)) throw new MelhorEnvioUnreachable('Melhor Envio answered the cart without a label');
    return { id: answer.id, protocol: typeof answer.protocol === 'string' ? answer.protocol : null, priceCents: centsOfReais(price) };
  }

  /** A label out of the cart, before it is paid. */
  async removeFromCart(config: MelhorEnvioConfig, accessToken: string, id: string): Promise<void> {
    await this.call(config, `/api/v2/me/cart/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { authorization: `Bearer ${accessToken}` } });
  }

  /** The label paid from the shop's wallet. */
  async checkout(config: MelhorEnvioConfig, accessToken: string, id: string): Promise<void> {
    await this.call(config, '/api/v2/me/shipment/checkout', this.posting(accessToken, { orders: [id] }));
  }

  /** The label generated — the carrier is told of it — or Melhor Envio's reason not to. */
  async generate(config: MelhorEnvioConfig, accessToken: string, id: string): Promise<{ generated: boolean; message: string | null }> {
    const entry = entryFor(await this.call(config, '/api/v2/me/shipment/generate', this.posting(accessToken, { orders: [id] })), id);
    return { generated: entry.status === true, message: typeof entry.message === 'string' ? entry.message : null };
  }

  /** The label's PDF at a public address: the shopkeeper need not be signed in at Melhor Envio to open it. */
  async print(config: MelhorEnvioConfig, accessToken: string, id: string): Promise<string> {
    const answer = (await this.call(config, '/api/v2/me/shipment/print', this.posting(accessToken, { mode: 'public', orders: [id] }))) as Record<string, unknown> | null;
    if (typeof answer?.url !== 'string') throw new MelhorEnvioUnreachable('Melhor Envio answered the print without an address');
    return answer.url;
  }

  /** Whether Melhor Envio still allows cancelling the label: not once posted, nor once a carrier was told of a pickup. */
  async cancellable(config: MelhorEnvioConfig, accessToken: string, id: string): Promise<boolean> {
    return entryFor(await this.call(config, '/api/v2/me/shipment/cancellable', this.posting(accessToken, { orders: [id] })), id).cancellable === true;
  }

  /** The label cancelled; its value goes back to the wallet. Reason 2 is the one Melhor Envio asks integrations for. */
  async cancel(config: MelhorEnvioConfig, accessToken: string, id: string, description: string): Promise<boolean> {
    const answer = await this.call(config, '/api/v2/me/shipment/cancel', this.posting(accessToken, { order: { id, reason_id: '2', description } }));
    return entryFor(answer, id).canceled === true;
  }

  /** Where the label stands, and its tracking code once the carrier gave one. */
  async tracking(config: MelhorEnvioConfig, accessToken: string, id: string): Promise<MelhorEnvioTracking> {
    const entry = entryFor(await this.call(config, '/api/v2/me/shipment/tracking', this.posting(accessToken, { orders: [id] })), id);
    const code = [entry.tracking, entry.melhorenvio_tracking].find((each): each is string => typeof each === 'string' && each.trim() !== '');
    return { status: typeof entry.status === 'string' ? entry.status : 'unknown', trackingCode: code ?? null };
  }

  private posting(accessToken: string, body: object) {
    return { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify(body) };
  }

  private async token(config: MelhorEnvioConfig, body: Record<string, string>): Promise<MelhorEnvioTokens> {
    return tokensOf(await this.call(config, '/oauth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  }

  /** One request, answered: a 4xx is Melhor Envio's no; no answer, or a 5xx, is not knowing. */
  private async call(config: MelhorEnvioConfig, path: string, init: { method: string; headers: Record<string, string>; body?: string }, timeoutMs = TIMEOUT_MS): Promise<unknown> {
    const response = await fetch(new URL(path, config.baseUrl), {
      method: init.method,
      headers: { accept: 'application/json', 'user-agent': config.userAgent, ...init.headers },
      body: init.body,
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((error: unknown) => {
      throw new MelhorEnvioUnreachable(error instanceof Error ? error.message : 'Melhor Envio did not answer');
    });

    const answer: unknown = await response.json().catch(() => null);
    if (response.status >= 500) throw new MelhorEnvioUnreachable(`Melhor Envio failed (${response.status})`);
    if (!response.ok) {
      // Its error's words, never the request's: a refused token request carries the secret in its body.
      throw new MelhorEnvioRefused(response.status, wordsOf(answer));
    }
    return answer;
  }
}
