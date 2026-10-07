import type { FirstPurchaseHeadline } from "./offers.js";

/**
 * A shop's first-purchase pop-up (BEELINK-306): a dialog that calls a visitor with no account to
 * open one, as its shopkeeper configures it. It collects nothing — its button leads to the shop's
 * own sign-up — and what it says of a discount is never typed: the number comes from the benefit
 * the API read, through the `{beneficio}` placeholder.
 */

/** When it opens: some seconds after the page arrives, or when the visitor is about to leave it. */
export type PopupTrigger = "ON_ARRIVAL" | "ON_LEAVE";

/**
 * Which first-purchase benefit it announces. `AUTO` follows the shop's public headline, as the offer
 * strip does; the other two name one promotion or one shown coupon, both for a first purchase.
 */
export type PopupBenefitSource = "AUTO" | "PROMOTION" | "COUPON";

/** The placeholder a title, a text or a button's label may carry: the announced benefit, in words. */
export type PopupBenefitPlaceholder = "{beneficio}";

/** The pop-up as the panel's form edits it. A shop that never saved one reads the defaults, switched off. */
export interface StorePopupSettings {
  enabled: boolean;
  /** http(s); null draws the coloured panel alone. */
  imageUrl: string | null;
  /** Plain text, at most 80 characters; null is the product's default. May carry `{beneficio}`, never a typed discount. */
  title: string | null;
  /** At most 200 characters; as `title`. */
  text: string | null;
  /** At most 30 characters; as `title`. */
  buttonLabel: string | null;
  trigger: PopupTrigger;
  /** Seconds after the page arrives, 0 to 60. Read on `ON_ARRIVAL` alone, and kept either way. */
  delaySeconds: number;
  benefitSource: PopupBenefitSource;
  /** The promotion's or the coupon's id; null on `AUTO`. */
  benefitId: string | null;
}

/** What `PUT /stores/:slug/popup` takes: the whole of the form. */
export type StorePopupPayload = StorePopupSettings;

/** A first-purchase promotion or shown coupon the form may name, in force now. */
export interface PopupBenefitOption {
  source: Exclude<PopupBenefitSource, "AUTO">;
  id: string;
  /** The promotion's name, or the coupon's code: this is the owner's own read. */
  label: string;
  benefit: FirstPurchaseHeadline;
}

/** `GET` and `PUT /stores/:slug/popup` — the owner's. */
export interface StorePopupOverview {
  settings: StorePopupSettings & {
    /**
     * Counts what a visitor reads: it goes up when the image, a text or the benefit named changes,
     * and not when the pop-up is switched or its trigger changes. A visitor who closed one revision
     * may be shown the next once.
     */
    revision: number;
    /** ISO-8601; null until the owner first saves. */
    updatedAt: string | null;
  };
  /** What the pop-up as saved announces now; null promises no discount — the plain invitation. */
  benefit: FirstPurchaseHeadline | null;
  /** What the form may name: the first-purchase promotions running and the shown first-purchase coupons in force. */
  options: PopupBenefitOption[];
}

/**
 * The pop-up as anyone is served it, inside `StorefrontOffers`. It carries no code and no id of a
 * coupon: the benefit is the headline's shape, and a coupon reaches it only as its kind and amount.
 */
export interface StorefrontPopup {
  revision: number;
  imageUrl: string | null;
  title: string | null;
  text: string | null;
  buttonLabel: string | null;
  trigger: PopupTrigger;
  delaySeconds: number;
  /** Null: nothing for a first purchase is in force, or the one the shop named is not. */
  benefit: FirstPurchaseHeadline | null;
}

/**
 * `POPUP_SETTINGS_INVALID` a field out of its bounds or left out; `POPUP_TEXT_PROMISES_NUMBER` a
 * discount typed by hand — a figure before `%` or after `R$`; `POPUP_BENEFIT_INVALID` a promotion
 * or coupon that is not this shop's, not for a first purchase, or a coupon the shop does not show.
 */
export type PopupErrorCode = "POPUP_SETTINGS_INVALID" | "POPUP_TEXT_PROMISES_NUMBER" | "POPUP_BENEFIT_INVALID";
