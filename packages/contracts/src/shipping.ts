import type { CarrierGap } from "./catalog.js";
import type { CreateOrderItemInput } from "./order.js";

/**
 * What a shop offers to get a cart to an address (docs/plans BEELINK-176): its own delivery, priced
 * by the distance bands it set (BEELINK-175), the carriers of its own Melhor Envio account
 * (BEELINK-185), and pickup — in one list. One quote, in the API, for the checkout, the product page
 * and the panel: an order records the fee the API quoted, never one a page worked out.
 */

/** Where an order would go: a CEP at least; the rest places the point more precisely. */
export interface ShippingDestination {
  /** Eight digits, with or without the mask. */
  zipCode: string;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  /** The two-letter UF. */
  state?: string | null;
}

/** `POST /stores/:slug/shipping/quote` and the panel's `POST /stores/:slug/delivery/quote`. */
export interface ShippingQuotePayload {
  destination: ShippingDestination;
  /** The cart: what the products cost after promotions decides a free delivery. */
  items: CreateOrderItemInput[];
}

/**
 * When an option arrives, counted from when the order leaves the shop: minutes for the shop's own
 * delivery, business days for a carrier. A window and never a single number — `from ≤ to`.
 */
export interface ShippingWindow {
  unit: "MINUTES" | "BUSINESS_DAYS";
  from: number;
  to: number;
}

export type ShippingOptionKind = "PICKUP" | "OWN_DELIVERY" | "CARRIER";

/** A carrier's service, as Melhor Envio names it: "Correios" and "SEDEX", "Jadlog" and ".Package". */
export interface ShippingCarrier {
  /** Melhor Envio's id for the service — what the label is bought with. */
  serviceId: number;
  service: string;
  company: string;
}

/** One way to get this cart to this address, as the checkout lists it. */
export interface ShippingOption {
  kind: ShippingOptionKind;
  /** Whose service it is, on a `CARRIER`; null on the shop's own delivery and on a pickup. */
  carrier: ShippingCarrier | null;
  /** Null: agreed with the shop after the order — see `OwnDeliveryVerdict`. Zero on a pickup and a free delivery. */
  feeCents: number | null;
  /** Null on a pickup and on a fee still to agree. */
  window: ShippingWindow | null;
  /** The fee is zero because the products reached the shop's free-delivery amount. */
  freeAbove: boolean;
}

/** Why the shop's own delivery to this address has no fee yet. */
export type OwnDeliveryAgreeLaterReason =
  /** The shop delivers and set no band: it agrees the fee after the order, as before there were bands. */
  | "NO_BANDS"
  /** The shop has no point on the map to measure from. */
  | "SHOP_UNPLACED"
  /** The address could not be placed on the map. */
  | "ADDRESS_UNPLACED";

/**
 * The shop's own delivery to this address, said apart from the list so the checkout can say why it is
 * or is not there. `OUT_OF_RANGE` is the one that leaves the list.
 */
export type OwnDeliveryVerdict =
  | { status: "OFF" }
  | { status: "AGREE_LATER"; reason: OwnDeliveryAgreeLaterReason }
  | { status: "OUT_OF_RANGE"; distanceMeters: number; radiusMeters: number }
  | { status: "QUOTED"; distanceMeters: number };

/**
 * The carriers for this cart and address, said apart from the list so the checkout — and the panel —
 * can say why there are none. Only `QUOTED` puts any in the list, and it may still put none: no
 * service of the shop's reaches the address.
 */
export type CarriersVerdict =
  /** The shop does not sell by carrier: switched off, no account connected, or no service chosen. */
  | { status: "OFF" }
  | { status: "QUOTED" }
  /** A product in the cart has no weight or no size, or the shop has no CEP to post from. */
  | { status: "NOT_QUOTABLE"; reason: CarrierGap | "NO_ORIGIN" }
  /** Melhor Envio did not answer in time, or no longer accepts the shop's connection: the rest of the list stands. */
  | { status: "UNAVAILABLE" };

export interface ShippingQuote {
  /** In the order the checkout lists them: the shop's own delivery, the carriers from the cheapest, then pickup. Empty: the shop offers nothing to this address. */
  options: ShippingOption[];
  ownDelivery: OwnDeliveryVerdict;
  carriers: CarriersVerdict;
  /** What the products cost after promotions — what the free-delivery amount is measured against. */
  productsCents: number;
}

export type ShippingErrorCode =
  /** A CEP that is not eight digits, or a UF that is not two letters. */
  "SHIPPING_DESTINATION_INVALID";
