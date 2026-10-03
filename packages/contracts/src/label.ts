import type { ShippingCarrier } from "./shipping.js";

/**
 * An order's shipping label (docs/plans BEELINK-187), bought from the shop's own Melhor Envio wallet:
 * put in Melhor Envio's cart, paid from the balance, generated — then printed, tracked, or cancelled
 * while Melhor Envio allows it. One per order, for one box.
 */

/**
 * Where a label stands. `IN_CART` waits on the payment — the wallet had too little; `PAID` on the
 * generation; `GENERATED` is ready to print and post; `CANCELLED` gave its value back to the wallet.
 */
export type OrderLabelStatus = "IN_CART" | "PAID" | "GENERATED" | "CANCELLED";

/** The box the label is for, as it will be posted: grams and millimetres, the product's own units. */
export interface OrderLabelVolume {
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

export interface OrderLabel {
  status: OrderLabelStatus;
  /** Melhor Envio's protocol, "ORD-…": what its support asks for. */
  protocol: string | null;
  /** What it cost the wallet, in cents. */
  priceCents: number;
  volume: OrderLabelVolume;
  /** The invoice's 44-digit key on a commercial shipment; null went with a declaration of contents. */
  invoiceKey: string | null;
  /** The carrier's tracking code, once Melhor Envio gave one. */
  trackingCode: string | null;
  /** ISO-8601. */
  createdAt: string;
  paidAt: string | null;
  generatedAt: string | null;
  cancelledAt: string | null;
}

/** What keeps a label from being bought for the order, said before anyone tries. */
export type OrderLabelBlocker =
  /** The order goes by the shop's own delivery, is picked up, or was placed before carriers. */
  | "NOT_CARRIER"
  /** The order was cancelled. */
  | "ORDER_CANCELLED"
  /** The shop's Melhor Envio is not connected, or no longer accepts the connection. */
  | "NOT_CONNECTED"
  /** The shop's CPF or CNPJ is not set in Integrations. */
  | "NO_SENDER_DOCUMENT"
  /** The shop's address lacks the street, number, neighbourhood, city, UF or CEP to post from. */
  | "NO_ORIGIN"
  /** The order has no CPF of who receives it. */
  | "NO_RECIPIENT_DOCUMENT"
  /** The order's address has no number, no neighbourhood or no CEP, which a label needs. */
  | "RECIPIENT_ADDRESS_INCOMPLETE";

/** `GET /stores/:slug/orders/:number/label`: the label, if any, and what buying one needs. */
export interface OrderLabelOverview {
  label: OrderLabel | null;
  /** Empty: a label can be bought. */
  blockers: OrderLabelBlocker[];
  /** The service the customer chose; null on an order that is not a carrier's. */
  carrier: ShippingCarrier | null;
  /** The box Melhor Envio would pack the order in for that service; null when it could not be asked. */
  suggestedVolume: OrderLabelVolume | null;
  /** The wallet now, in cents; null when it could not be read. */
  balanceCents: number | null;
  /** Where the shopkeeper adds to the wallet: the Melhor Envio of this deployment. */
  walletUrl: string;
}

/** `POST /stores/:slug/orders/:number/label`: buy — or carry on buying — the order's label. */
export interface BuyOrderLabelPayload {
  volume: OrderLabelVolume;
  /** The NF-e's 44-digit key, for a commercial shipment; absent or null sends a declaration of contents. */
  invoiceKey?: string | null;
}

/** `POST /stores/:slug/orders/:number/label/print`: the label's PDF, at an address made there and then. */
export interface OrderLabelPrint {
  url: string;
}

/** The `details` of `LABEL_BALANCE_INSUFFICIENT`: what is in the wallet and what the label costs. */
export interface LabelBalanceDetails {
  balanceCents: number;
  priceCents: number;
  walletUrl: string;
}

/** The `details` of `LABEL_REFUSED`: Melhor Envio's own words, for the shopkeeper. */
export interface LabelRefusedDetails {
  reason: string;
}

export type LabelErrorCode =
  /** Something in `OrderLabelOverview.blockers` stands. Its `details` are `{ blockers: OrderLabelBlocker[] }`. */
  | "LABEL_NOT_AVAILABLE"
  /** The box out of the carriers' bounds, or an invoice key that is not 44 digits. */
  | "LABEL_INVALID"
  /** The wallet holds less than the label costs. Its `details` are `LabelBalanceDetails`; the label stays in the cart. */
  | "LABEL_BALANCE_INSUFFICIENT"
  /** Melhor Envio refused the label. Its `details` are `LabelRefusedDetails`. */
  | "LABEL_REFUSED"
  /** No label to print or cancel. */
  | "LABEL_NOT_FOUND"
  /** The label is not generated yet: nothing to print. */
  | "LABEL_NOT_GENERATED"
  /** Melhor Envio no longer allows cancelling it — posted, or the carrier was told of a pickup. */
  | "LABEL_NOT_CANCELLABLE";
