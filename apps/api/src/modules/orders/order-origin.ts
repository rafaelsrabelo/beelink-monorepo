// Types
import type { OrderOrigin } from '@harness-monorepo/contracts';

/**
 * Where an order's buyer came from, and what stood in their browser with their yes to the shop's
 * pixel (BEELINK-275) — as the API takes them in. Every value here was written by a stranger: the
 * labels in a link anyone may share, the rest by a browser, and all of it by whoever calls the API
 * with a shopper's token. So each is cleaned to what it may be or dropped, and **none of them ever
 * refuses an order**: a campaign label must not cost a sale.
 *
 * The web cleans the same way before it sends (`apps/web/src/lib/origin-cookie.ts`); this is not
 * trust in that, it is the same rule at the edge that stores.
 */

export const ORIGIN_LABEL_MAX = 80;
export const FBCLID_MAX = 500;
export const FBP_MAX = 100;
export const USER_AGENT_MAX = 512;
export const PAGE_URL_MAX = 500;

/** No origin is older than this when its order is placed: past Meta's own longest click window, a date is a mistake or a forgery. */
const ORIGIN_OLDEST_MS = 90 * 86_400_000;
/** A browser's clock may run ahead of ours. */
const CLOCK_SKEW_MS = 5 * 60_000;

const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;
const FBCLID = /^[A-Za-z0-9_.-]+$/;
const FBP = /^fb\.\d\.\d{10,16}\.\d{1,25}$/;

/** A campaign label: no control or invisible character, single spaces, cut by whole characters. Null for none. */
export function originLabelOf(value: unknown, lowerCase = false): string | null {
  if (typeof value !== 'string') return null;
  const clean = [...value.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim()].slice(0, ORIGIN_LABEL_MAX).join('').trim();
  if (!clean) return null;
  return lowerCase ? clean.toLowerCase() : clean;
}

/** Meta's click identifier, whole or not at all: one cut short is another identifier. */
export function clickIdOf(value: unknown): string | null {
  return typeof value === 'string' && value.length <= FBCLID_MAX && FBCLID.test(value) ? value : null;
}

/** Meta's `_fbp`, in the one shape its library writes. */
export function fbpOf(value: unknown): string | null {
  return typeof value === 'string' && value.length <= FBP_MAX && FBP.test(value) ? value : null;
}

/** An instant that has happened, and not long ago, as ISO-8601; null for anything else. */
export function pastInstantOf(value: unknown, now: number = Date.now()): string | null {
  if (typeof value !== 'string' || value.length > 40) return null;
  const at = Date.parse(value);
  if (!Number.isFinite(at) || at > now + CLOCK_SKEW_MS || at < now - ORIGIN_OLDEST_MS) return null;
  return new Date(Math.min(at, now)).toISOString();
}

export function userAgentOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.replace(INVISIBLE, ' ').trim().slice(0, USER_AGENT_MAX) || null;
}

/** A page's address, `http` or `https`, without its query or fragment; null for anything else, or one too long. */
export function pageUrlOf(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > PAGE_URL_MAX * 4) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const page = `${url.origin}${url.pathname}`;
  return page.length <= PAGE_URL_MAX ? page : null;
}

/** The campaign as an order is placed with it. */
export interface PlacedOrigin {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  arrivedAt: Date | null;
}

/** The buyer's yes, and what was kept with it. */
export interface PlacedMarketingConsent {
  fbclid: string | null;
  clickedAt: Date | null;
  fbp: string | null;
  userAgent: string | null;
  pageUrl: string | null;
}

interface OriginAsSent {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  arrivedAt?: string | null;
}

interface ConsentAsSent {
  fbclid?: string | null;
  clickedAt?: string | null;
  fbp?: string | null;
  userAgent?: string | null;
  pageUrl?: string | null;
}

/**
 * The campaign a validated body named, or null for none. Content and a term alone are no campaign:
 * they describe one, and with none to describe they are dropped.
 */
export function placedOriginOf(sent: OriginAsSent | undefined): PlacedOrigin | null {
  if (!sent) return null;
  const source = sent.source ?? null;
  const medium = sent.medium ?? null;
  const campaign = sent.campaign ?? null;
  if (source === null && medium === null && campaign === null) return null;
  return { source, medium, campaign, content: sent.content ?? null, term: sent.term ?? null, arrivedAt: sent.arrivedAt ? new Date(sent.arrivedAt) : null };
}

/** The buyer's yes as a validated body told it: present is yes, whatever else came with it. A click without its instant is no click. */
export function placedConsentOf(sent: ConsentAsSent | undefined): PlacedMarketingConsent | null {
  if (!sent) return null;
  const clicked = sent.fbclid && sent.clickedAt ? { fbclid: sent.fbclid, clickedAt: new Date(sent.clickedAt) } : { fbclid: null, clickedAt: null };
  return { ...clicked, fbp: sent.fbp ?? null, userAgent: sent.userAgent ?? null, pageUrl: sent.pageUrl ?? null };
}

/** What `orders` keeps of the two: the labels, when the visitor arrived, and whether an ad click was kept. */
export function originColumnsOf(origin: PlacedOrigin | null | undefined, consent: PlacedMarketingConsent | null | undefined) {
  const metaAd = Boolean(consent?.fbclid);
  return {
    utmSource: origin?.source ?? null,
    utmMedium: origin?.medium ?? null,
    utmCampaign: origin?.campaign ?? null,
    utmContent: origin?.content ?? null,
    utmTerm: origin?.term ?? null,
    // An ad click with no labels arrived when it was clicked.
    originAt: origin?.arrivedAt ?? (metaAd ? (consent?.clickedAt ?? null) : null),
    originMetaAd: metaAd,
  };
}

type OriginColumns = ReturnType<typeof originColumnsOf>;

/** The origin as the shop reads it: null with no campaign and no ad click. Never the identifier. */
export function toOrderOrigin(row: Omit<OriginColumns, 'originAt'>): OrderOrigin | null {
  if (row.utmSource === null && row.utmMedium === null && row.utmCampaign === null && !row.originMetaAd) return null;
  return { source: row.utmSource, medium: row.utmMedium, campaign: row.utmCampaign, content: row.utmContent, term: row.utmTerm, metaAd: row.originMetaAd };
}
