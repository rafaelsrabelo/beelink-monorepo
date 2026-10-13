// App
import { AsaasRefused, AsaasThrottled, AsaasUnreachable } from './asaas-errors.js';

const TIMEOUT_MS = 10_000;
/** The quota's own window: no wait Asaas names is longer. */
const THROTTLE_MAX_S = 12 * 60 * 60;

/** Where an Asaas answers and how bee-link names itself there. A shop's account or bee-link's own: the call is the same. */
export interface AsaasEndpoint {
  /** Up to `/v3`, with no slash after it. */
  baseUrl: string;
  /** Asaas refuses a request without one from an account created since June 2024. */
  userAgent: string;
}

export type AsaasMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const filled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Asaas's 404: the account holds none such. */
export const gone = (error: unknown): boolean => error instanceof AsaasRefused && error.status === 404;

/** Asaas's refusal as `{ errors: [{ code, description }] }`: its first error, or nothing to go on. */
function refusalOf(answer: unknown): { code: string | null; reason: string } {
  const errors = (answer as { errors?: unknown } | null)?.errors;
  const first = (Array.isArray(errors) ? errors[0] : null) as { code?: unknown; description?: unknown } | null;
  return { code: filled(first?.code) ? first.code : null, reason: filled(first?.description) ? first.description : 'no reason given' };
}

/** Why no answer came, by the failure's name and code alone: fetch's own words repeat a header it could not send — the key. */
function failureOf(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown failure';
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? `${error.name}, ${code}` : error.name;
}

/** `RateLimit-Reset` is the seconds left until the limit lifts; anything else is no date to go by. */
function retryAtOf(header: string | null): Date | null {
  const seconds = header === null ? Number.NaN : Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? new Date(Date.now() + Math.min(seconds, THROTTLE_MAX_S) * 1000) : null;
}

/**
 * One request to Asaas: `access_token` carries the key, and the `User-Agent` names bee-link, which
 * Asaas requires. A 4xx is Asaas's no; a 5xx, a 429, a network failure or ten seconds of silence is
 * not knowing. Whatever it throws carries Asaas's words and never the key — nor is the failure it
 * came from kept as a cause, since fetch's own message can repeat the header it could not send.
 */
export async function asaasCall(endpoint: AsaasEndpoint, apiKey: string, method: AsaasMethod, path: string, body?: object): Promise<unknown> {
  const init: RequestInit = {
    method,
    headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': endpoint.userAgent, access_token: apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };
  if (body) init.body = JSON.stringify(body);

  const response = await fetch(`${endpoint.baseUrl}${path}`, init).catch((error: unknown) => {
    throw new AsaasUnreachable(`Asaas did not answer (${failureOf(error)})`);
  });

  const answer: unknown = await response.json().catch(() => null);
  // Too many requests decides nothing about the key either: later, the same call may pass.
  if (response.status === 429) throw new AsaasThrottled('Asaas failed (429)', retryAtOf(response.headers.get('ratelimit-reset')));
  if (response.status >= 500) throw new AsaasUnreachable(`Asaas failed (${response.status})`);
  if (!response.ok) {
    const { code, reason } = refusalOf(answer);
    // Asaas's words, never the request's — and the key cut out of both should they ever echo it.
    const keyless = (said: string): string => (apiKey ? said.split(apiKey).join('[key]') : said);
    throw new AsaasRefused(response.status, code === null ? null : keyless(code), keyless(reason));
  }
  return answer;
}
