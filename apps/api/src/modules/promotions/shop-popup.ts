// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { FirstPurchaseHeadline, PopupBenefitOption, PopupBenefitPlaceholder, PopupBenefitSource, PopupErrorCode, PopupTrigger, StorefrontPopup, StorePopupOverview, StorePopupSettings } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CouponModel, StorePopupModel } from '../../generated/prisma/models.js';

// App
import { couponBenefitOf, firstPurchaseHeadlineOf, promotionBenefitOf, shownFirstPurchaseCouponById, type OfferPromotion } from './shop-offers.js';

type Db = Prisma.TransactionClient;

/**
 * A shop's first-purchase pop-up (BEELINK-306): its bounds, what it refuses, and what it announces.
 * Nothing here prices anything or takes a coupon, and — as in `shop-offers.ts`, whose reads it
 * uses — no coupon reaches a visitor that its shopkeeper did not switch on to be shown.
 */

export const POPUP_TRIGGERS = ['ON_ARRIVAL', 'ON_LEAVE'] as const satisfies readonly PopupTrigger[];
export const POPUP_BENEFIT_SOURCES = ['AUTO', 'PROMOTION', 'COUPON'] as const satisfies readonly PopupBenefitSource[];

/** The columns' own widths, counted in code points as Postgres counts them. */
export const POPUP_TITLE_MAX = 80;
export const POPUP_TEXT_MAX = 200;
export const POPUP_BUTTON_MAX = 30;
/** A minute: past it the visitor has read the page, and "on arrival" stopped meaning it. */
export const POPUP_DELAY_MAX_SECONDS = 60;

export const POPUP_BENEFIT_PLACEHOLDER = '{beneficio}' satisfies PopupBenefitPlaceholder;

/** What a shop that never saved a pop-up reads: switched off, opening five seconds in, following the shop's headline. */
export const POPUP_DEFAULTS = {
  enabled: false,
  imageUrl: null,
  title: null,
  text: null,
  buttonLabel: null,
  trigger: 'ON_ARRIVAL',
  delaySeconds: 5,
  benefitSource: 'AUTO',
  benefitId: null,
  keepReminder: false,
} as const satisfies StorePopupSettings;

export function popupError(errorCode: PopupErrorCode, message: string): { errorCode: PopupErrorCode; message: string } {
  return { errorCode, message };
}

/**
 * Control characters (`Cc`), and the marks that reorder or hide the text around them (bidi overrides and
 * isolates, the line and paragraph separators, the byte-order mark). The joiners an emoji is built
 * with (U+200C, U+200D) stay.
 */
const UNPRINTABLE = /[\p{Cc}\u200E\u200F\u2028-\u202E\u2066-\u2069\uFEFF]/gu;

/**
 * A sentence every visitor of the shop is shown, as plain text: what cannot be printed becomes a
 * space, runs of blanks become one, and nothing left is null — the product's default. It is drawn
 * as text and never as markup; this only keeps a pasted control character out of the page.
 */
export function plainTextOf(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.replace(UNPRINTABLE, ' ').replace(/\s+/g, ' ').trim() || null;
}

/** A figure before a `%`, or after `R$`: a discount written by hand. */
const TYPED_DISCOUNT = /\d\s*%|R\$\s*\d/i;

/**
 * Whether a sentence states a discount by hand. Refused at the save, and not warned about: a
 * warning is true the day it is given, and the coupon behind the sentence may change the next —
 * the number a pop-up says is the benefit's, through `{beneficio}`, or it says none.
 */
export function promisesNumber(sentence: string | null): boolean {
  return sentence !== null && TYPED_DISCOUNT.test(sentence);
}

export function refuseTypedDiscounts(sentences: Readonly<Record<'title' | 'text' | 'buttonLabel', string | null>>): void {
  for (const [field, sentence] of Object.entries(sentences)) {
    if (promisesNumber(sentence)) throw new BadRequestException(popupError('POPUP_TEXT_PROMISES_NUMBER', `${field} states a discount by hand; the number comes from ${POPUP_BENEFIT_PLACEHOLDER}`));
  }
}

export function benefitSourceOf(row: Pick<StorePopupModel, 'promotionId' | 'couponId'>): Pick<StorePopupSettings, 'benefitSource' | 'benefitId'> {
  if (row.promotionId) return { benefitSource: 'PROMOTION', benefitId: row.promotionId };
  if (row.couponId) return { benefitSource: 'COUPON', benefitId: row.couponId };
  return { benefitSource: 'AUTO', benefitId: null };
}

export function toPopupSettings(row: StorePopupModel | null): StorePopupOverview['settings'] {
  if (!row) return { ...POPUP_DEFAULTS, revision: 1, updatedAt: null };
  return {
    enabled: row.enabled,
    imageUrl: row.imageUrl,
    title: row.title,
    text: row.text,
    buttonLabel: row.buttonLabel,
    trigger: row.trigger,
    delaySeconds: row.delaySeconds,
    ...benefitSourceOf(row),
    keepReminder: row.keepReminder,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** What a visitor reads of a pop-up: a change in any of these is a new revision. The switch, the trigger and the strip's reminder are not among them. */
const READ_BY_VISITORS = ['imageUrl', 'title', 'text', 'buttonLabel', 'promotionId', 'couponId'] as const satisfies readonly (keyof StorePopupModel)[];

export function visitorsReadAnother(before: StorePopupModel, after: Pick<StorePopupModel, (typeof READ_BY_VISITORS)[number]>): boolean {
  return READ_BY_VISITORS.some((field) => before[field] !== after[field]);
}

export function promotionOptionOf(promotion: OfferPromotion): PopupBenefitOption {
  return { source: 'PROMOTION', id: promotion.id, label: promotion.name, benefit: { source: 'PROMOTION', ...promotionBenefitOf(promotion) } };
}

export function couponOptionOf(coupon: CouponModel): PopupBenefitOption {
  return { source: 'COUPON', id: coupon.id, label: coupon.code, benefit: { source: 'COUPON', ...couponBenefitOf(coupon), wholeCart: true } };
}

export interface PopupBenefitAsk {
  /** The shop's promotions running now, the newest first — `runningPromotions`. */
  promotions: readonly OfferPromotion[];
  /** The shop's newest shown first-purchase coupon in force — what its headline reads. */
  headlineCoupon: CouponModel | null;
  /** The coupon the pop-up names, if it is shown, for a first purchase and in force; null otherwise. */
  namedCoupon: CouponModel | null;
}

/**
 * What a pop-up announces now. Following the shop (`AUTO`), its public headline — the very one the
 * offer strip says. Naming a promotion or a coupon, that one while it is in force and nothing while
 * it is not: the shopkeeper chose one, and announcing another in its place is the surprise the
 * choice exists to prevent. Never a code, whichever: the shape is the headline's.
 */
export function popupBenefitOf(row: Pick<StorePopupModel, 'promotionId' | 'couponId'> | null, { promotions, headlineCoupon, namedCoupon }: PopupBenefitAsk): FirstPurchaseHeadline | null {
  if (row?.promotionId) {
    const named = promotions.find((promotion) => promotion.id === row.promotionId && promotion.audience === 'FIRST_PURCHASE');
    return named ? { source: 'PROMOTION', ...promotionBenefitOf(named) } : null;
  }
  if (row?.couponId) return namedCoupon ? { source: 'COUPON', ...couponBenefitOf(namedCoupon), wholeCart: true } : null;
  return firstPurchaseHeadlineOf(promotions, headlineCoupon);
}

/**
 * The pop-up as a visitor is served it, or null while it is switched off — a shop that switched it
 * off serves nothing of what it configured. The promotions and the headline's coupon are the ones
 * the offers' answer already read; a named coupon is the one read more.
 */
export async function servedPopupOf(
  db: Db,
  storeId: string,
  at: Date,
  maxUses: Prisma.FieldRef<'Coupon', 'Int'>,
  read: Pick<PopupBenefitAsk, 'promotions' | 'headlineCoupon'>,
): Promise<StorefrontPopup | null> {
  const row = await db.storePopup.findUnique({ where: { storeId } });
  if (!row?.enabled) return null;

  const namedCoupon = row.couponId ? await shownFirstPurchaseCouponById(db, storeId, row.couponId, at, maxUses) : null;
  return {
    revision: row.revision,
    imageUrl: row.imageUrl,
    title: row.title,
    text: row.text,
    buttonLabel: row.buttonLabel,
    trigger: row.trigger,
    delaySeconds: row.delaySeconds,
    benefit: popupBenefitOf(row, { ...read, namedCoupon }),
    keepReminder: row.keepReminder,
  };
}
