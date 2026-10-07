// Node
import { createHash } from 'node:crypto';

// Types
import type { MetaCustomData, MetaServerEvent, MetaUserData } from './meta-conversions.client.js';

/**
 * The purchase an order is, in Meta's words, told from the server (BEELINK-274). It must be the
 * very event the browser tells (BEELINK-273, `apps/web/src/lib/purchase.ts` and
 * `meta-pixel-event.ts`): the same name, the same id, the same value and contents — or Meta counts
 * one purchase twice. The two cannot share code, so they share cases:
 * `packages/contracts/fixtures/meta-purchase.json`, read by this file's spec and by the web's.
 */

/** An order counts as a purchase once it is placed, or once it is paid. */
export type PurchaseMoment = 'PLACED' | 'PAID';

/**
 * The browser's `purchaseCountsWhen`, line for line: a shop that charges on the site counts the
 * payment confirmed; one that settles with its customer counts the order placed — as does an order
 * charged online with a closed total of nothing, which has no charge to wait for.
 */
export function purchaseCountsWhen(order: { paymentChannel: 'ONLINE' | 'OFFLINE'; totalCents: number; deliveryFeeCents: number | null }): PurchaseMoment {
  const nothingToPay = order.totalCents === 0 && order.deliveryFeeCents !== null;
  return order.paymentChannel === 'ONLINE' && !nothingToPay ? 'PAID' : 'PLACED';
}

/** `purchase-<the order's id>`, the browser's `purchaseEventIdOf`. */
export function purchaseEventIdOf(orderId: string): string {
  return `purchase-${orderId}`;
}

/** What the purchase reads of an order's lines. */
export interface PurchaseLine {
  productId: string | null;
  quantity: number;
  lineTotalCents: number;
  discountCents: number;
}

const reaisOf = (cents: number): number => cents / 100;

/**
 * The order's total, and what was bought: one entry per product — two combinations of one product
 * are one id, their units added up and the price the mean of what each unit cost, to the cent,
 * once the line's promotion was taken off. A line whose product is gone names nothing and is left
 * out; the value does not change for it.
 */
export function purchaseCustomDataOf(order: { totalCents: number; items: readonly PurchaseLine[] }): MetaCustomData {
  const products = new Map<string, { quantity: number; paidCents: number }>();
  let units = 0;
  for (const item of order.items) {
    if (!item.productId) continue;
    const product = products.get(item.productId) ?? { quantity: 0, paidCents: 0 };
    products.set(item.productId, { quantity: product.quantity + item.quantity, paidCents: product.paidCents + item.lineTotalCents - item.discountCents });
    units += item.quantity;
  }
  return {
    value: reaisOf(order.totalCents),
    currency: 'BRL',
    content_ids: [...products.keys()],
    content_type: 'product',
    contents: [...products].map(([id, { quantity, paidCents }]) => ({ id, quantity, item_price: reaisOf(Math.round(paidCents / quantity)) })),
    num_items: units,
  };
}

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

/** Meta's rule for `em`: spaces off both ends, lowercase, SHA-256. Null for nothing to hash. */
export function hashedEmailOf(email: string | null | undefined): string | null {
  const normal = email?.trim().toLowerCase() ?? '';
  return normal.includes('@') ? sha256(normal) : null;
}

/** A country code and a number: the shortest a phone kept here is (`normaliseWhatsapp`, 12 to 15 digits). */
const PHONE_MIN_DIGITS = 12;
const PHONE_MAX_DIGITS = 15;

/**
 * Meta's rule for `ph`: digits only, no leading zeros, the country code included, SHA-256. A phone
 * is kept here already with its country code, so none is put in front: one too short to carry it
 * is not sent rather than guessed at.
 */
export function hashedPhoneOf(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '').replace(/^0+/, '');
  return digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS ? sha256(digits) : null;
}

/** What an order kept of its buyer's browser with their yes (`order_marketing_consents`). */
export interface PurchaseConsent {
  fbclid: string | null;
  clickedAt: Date | null;
  fbp: string | null;
  userAgent: string | null;
  pageUrl: string | null;
}

/**
 * Who bought, as far as Meta is told: the e-mail and the phone hashed, and of the browser only what
 * the order kept — the click as THIS shop received it (`fb.1.<when, in ms>.<fbclid>`), Meta's own
 * `_fbp`, the user agent. No address of the network, no name, no document, no place.
 */
export function purchaseUserDataOf(buyer: { email: string | null; phone: string | null }, consent: PurchaseConsent): MetaUserData {
  const em = hashedEmailOf(buyer.email);
  const ph = hashedPhoneOf(buyer.phone);
  return {
    ...(em ? { em: [em] } : {}),
    ...(ph ? { ph: [ph] } : {}),
    ...(consent.fbclid && consent.clickedAt ? { fbc: `fb.1.${consent.clickedAt.getTime()}.${consent.fbclid}` } : {}),
    ...(consent.fbp ? { fbp: consent.fbp } : {}),
    ...(consent.userAgent ? { client_user_agent: consent.userAgent } : {}),
  };
}

export interface PurchaseEventInput {
  order: { id: string; totalCents: number; items: readonly PurchaseLine[] };
  /** When the order counted as a purchase. */
  countedAt: Date;
  buyer: { email: string | null; phone: string | null };
  consent: PurchaseConsent;
  /** The shop's own public address, for an order whose page was not kept: Meta requires one. */
  shopUrl: string;
}

export function purchaseEventOf({ order, countedAt, buyer, consent, shopUrl }: PurchaseEventInput): MetaServerEvent {
  return {
    event_name: 'Purchase',
    event_time: Math.floor(countedAt.getTime() / 1000),
    event_id: purchaseEventIdOf(order.id),
    action_source: 'website',
    event_source_url: consent.pageUrl ?? shopUrl,
    user_data: purchaseUserDataOf(buyer, consent),
    custom_data: purchaseCustomDataOf(order),
  };
}

/** The name of the event the panel's test sends: a custom one, so it feeds no standard event's count — Meta does not drop a test event. */
export const TEST_EVENT_NAME = 'BeeLinkTestEvent';

/** One event about nobody: the shop's own address, an id made of the shop's, and no value. */
export function testEventOf(store: { id: string }, shopUrl: string, now: Date): MetaServerEvent {
  const seconds = Math.floor(now.getTime() / 1000);
  return {
    event_name: TEST_EVENT_NAME,
    event_time: seconds,
    event_id: `bee-link-test-${store.id}-${seconds}`,
    action_source: 'website',
    event_source_url: shopUrl,
    user_data: { external_id: [sha256(`bee-link-test:${store.id}`)], client_user_agent: 'bee-link/test-event' },
  };
}
