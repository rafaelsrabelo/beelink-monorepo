// Nest
import { Injectable } from '@nestjs/common';

// App
import { MetaConversionsClient, MetaEventRefused, MetaPixelNotFound, MetaTokenRejected, MetaUnreachable, type MetaServerEvent } from './meta-conversions.client.js';

/**
 * The Graph API version every call names — the one Meta's own Conversions API example uses. To bump
 * it: read https://developers.facebook.com/docs/graph-api/changelog for what changed on
 * `/{pixel}/events`, change this line, and run the module's specs; a token is not tied to a version.
 */
export const META_GRAPH_VERSION = 'v25.0';

const BASE_URL = 'https://graph.facebook.com';
const TIMEOUT_MS = 10_000;

/** What Meta's refusal is about, as far as the next step goes. */
export type MetaFailure = 'TOKEN' | 'PIXEL' | 'EVENT' | 'TRANSIENT';

/** "Wait and retry", in Meta's error guide: unknown, service, the three rate limits, a temporary block. */
const TRANSIENT_CODES: ReadonlySet<number> = new Set([1, 2, 4, 17, 341, 368]);
/** The token itself: expired or invalid (190), a session no longer good (102). */
const TOKEN_CODES: ReadonlySet<number> = new Set([190, 102]);

/**
 * Meta's answer sorted by its codes alone — its sentences change without notice. A permission
 * refused (10, 200 to 299) and an object it will not show this token (100 with subcode 33, or a
 * plain 404) are the same news to a shopkeeper: this token does not send to this pixel.
 */
export function metaFailureOf(status: number, error: { code?: unknown; error_subcode?: unknown } | null): MetaFailure {
  const code = typeof error?.code === 'number' ? error.code : null;
  if (code !== null && TOKEN_CODES.has(code)) return 'TOKEN';
  if (code !== null && (code === 10 || (code >= 200 && code <= 299) || (code === 100 && error?.error_subcode === 33))) return 'PIXEL';
  if (status === 429 || status >= 500 || (code !== null && TRANSIENT_CODES.has(code))) return 'TRANSIENT';
  if (status === 401) return 'TOKEN';
  if (status === 404) return 'PIXEL';
  return 'EVENT';
}

/** Why no answer came, by the failure's name and code alone: fetch's own words may repeat what it could not send. */
function failureOf(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown failure';
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? `${error.name}, ${code}` : error.name;
}

/** Meta's words with its codes in front, and the token cut out should Meta ever echo it. */
function wordsOf(status: number, error: { message?: unknown; code?: unknown; error_subcode?: unknown } | null, accessToken: string): string {
  const codes = [typeof error?.code === 'number' ? `code ${error.code}` : null, typeof error?.error_subcode === 'number' ? `subcode ${error.error_subcode}` : null].filter(Boolean).join(', ');
  const message = typeof error?.message === 'string' && error.message.trim() !== '' ? error.message.trim() : 'no reason given';
  return `Meta refused (${status}${codes ? `, ${codes}` : ''}): ${accessToken ? message.split(accessToken).join('[token]') : message}`;
}

/**
 * Meta's Conversions API over HTTP: `POST /{version}/{pixel id}/events`, one event in `data`. The
 * token rides in the body, never in the address — an address is what a proxy logs.
 */
@Injectable()
export class MetaConversionsHttpClient extends MetaConversionsClient {
  async send(pixelId: string, accessToken: string, event: MetaServerEvent, testEventCode?: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/${META_GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ data: [event], ...(testEventCode ? { test_event_code: testEventCode } : {}), access_token: accessToken }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new MetaUnreachable(`Meta did not answer (${failureOf(error)})`);
    });
    const answer = (await response.json().catch(() => null)) as { events_received?: unknown; error?: { message?: unknown; code?: unknown; error_subcode?: unknown } } | null;
    if (response.ok) {
      // Meta's documentation shows no answer to a success; one that says it took none is not one.
      if (answer?.events_received === 0) throw new MetaEventRefused('Meta answered that it received no event');
      return;
    }
    const error = answer?.error ?? null;
    const words = wordsOf(response.status, error, accessToken);
    const failure = metaFailureOf(response.status, error);
    if (failure === 'TOKEN') throw new MetaTokenRejected(words);
    if (failure === 'PIXEL') throw new MetaPixelNotFound(words);
    if (failure === 'TRANSIENT') throw new MetaUnreachable(`Meta failed (${response.status}${typeof error?.code === 'number' ? `, code ${error.code}` : ''})`);
    throw new MetaEventRefused(words);
  }
}
