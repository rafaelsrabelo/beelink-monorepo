/* ── orders: what a shop sold, as a fact about the past ───────────────────── */

// Types
import type { OrderCashback, ShopOrderCashback } from "./cashback.js";
import type { CustomerAddress } from "./customer.js";
import type { OrderCancellationRefund, OrderPayment, OrderPaymentBrief, OrderPaymentChannel, OrderPaymentFilter, ShopOrderPayment } from "./payment.js";
import type { CouponKind } from "./promotion.js";
import type { CarriersVerdict, OwnDeliveryVerdict, ShippingWindow } from "./shipping.js";
import type { PaymentMethod } from "./store.js";

/** Where an order stands. `CANCELLED` is final; the others move back and forth at the shopkeeper's word. */
export type OrderStatus = "RECEIVED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

/** How the order is handed over. */
export type OrderFulfillment = "DELIVERY" | "PICKUP";

/** Who set a status: the shopkeeper, or the customer placing it from the cart; the courier later. */
/** Who moved an order: `CARRIER` is a carrier telling Melhor Envio it posted or delivered it (BEELINK-188). */
export type OrderActor = "SHOPKEEPER" | "CUSTOMER" | "SYSTEM" | "CARRIER";

/**
 * One line, photographed when the order was placed: a price change or a deleted product never
 * rewrites it. `productId` and `variantId` go null when those are deleted; the line still reads.
 */
export interface OrderItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  /** "Sabor: Uva · Peso: 300 g", in the product's option order. Null for a product with no options. */
  variantLabel: string | null;
  sku: string | null;
  /** The catalogue's price of one unit when the order was placed, before any promotion. */
  unitPriceCents: number;
  quantity: number;
  /** `unitPriceCents × quantity`: the promotion's discount is apart, in `discountCents`. */
  lineTotalCents: number;
  /** What a promotion took off this line (BEELINK-191); zero with none. */
  discountCents: number;
  /** The promotion's name as it was; null with none. */
  promotionName: string | null;
}

/** The coupon an order took, as it was: editing or pausing the coupon afterwards changes nothing here. */
export interface OrderCoupon {
  code: string;
  kind: CouponKind;
}

/** A status the order had, who set it and when. */
export interface OrderEvent {
  status: OrderStatus;
  actor: OrderActor;
  /** ISO-8601. */
  at: string;
}

/** The customer as the order names them: the shop's own record. */
export interface OrderCustomer {
  id: string;
  name: string;
  /** Digits only, with the country code. */
  phone: string | null;
}

/**
 * Where a delivery goes, photographed from the customer's saved address when the order was placed:
 * the customer moving, or changing their name, never rewrites where an order went. It always has a
 * street and a city — a delivery without them is refused — and whatever else the address held.
 */
export interface OrderDeliveryAddress extends CustomerAddress {
  /** Who receives it, as it was: the address's own recipient, else the customer's name. */
  recipientName: string;
  street: string;
  city: string;
}

/** Who brings a delivery: the shop itself, or a carrier. */
export type OrderDeliveryKind = "OWN" | "CARRIER";

/**
 * How a delivery goes, as the shopkeeper told it: who brings it, its tracking, and the window it
 * should arrive in — a window, never a single day, since one day is a promise nobody can keep.
 */
export interface OrderDelivery {
  kind: OrderDeliveryKind;
  /** "Correios", "Loggi" — the shopkeeper's words. */
  carrier: string | null;
  /** "SEDEX", "PAC". */
  service: string | null;
  trackingCode: string | null;
  /**
   * The shopkeeper's link, as typed. On the customer's order the Correios' own page stands in for a
   * Correios code given with no link; the shop's order never carries a link nobody typed.
   */
  trackingUrl: string | null;
  /** Days of the shop's calendar, `YYYY-MM-DD`: both or neither, and never ending before it starts. */
  estimateFrom: string | null;
  estimateTo: string | null;
}

/** What the shopkeeper tells of a delivery: the whole record, replacing the one before. */
export interface OrderDeliveryPayload {
  kind: OrderDeliveryKind;
  carrier?: string | null;
  service?: string | null;
  trackingCode?: string | null;
  /** An `https` address; empty, the Correios' own page stands in for a Correios code. */
  trackingUrl?: string | null;
  estimateFrom?: string | null;
  estimateTo?: string | null;
}

/** An order as its shop reads it. Every amount is whole cents, computed by the API. */
export interface Order {
  id: string;
  /** Sequential within the shop. */
  number: number;
  status: OrderStatus;
  customer: OrderCustomer;
  fulfillment: OrderFulfillment;
  /**
   * Null on a pick-up, and on a delivery placed before orders kept it: that one reads "not recorded",
   * never the customer's address of today, which is not where it went.
   */
  deliveryAddress: OrderDeliveryAddress | null;
  paymentMethod: PaymentMethod;
  /** Where it is paid (BEELINK-204): `OFFLINE`, settled between the two of them, or `ONLINE`, charged at Asaas. */
  paymentChannel: OrderPaymentChannel;
  /** The instalments its customer chose; 1 unless it is an online card. */
  installments: number;
  /** Its charge at Asaas: the one standing, else the last tried. Null offline, and online while it has none. */
  payment: ShopOrderPayment | null;
  items: OrderItem[];
  subtotalCents: number;
  /**
   * Null on a delivery whose fee was not agreed yet (BEELINK-170): "a combinar" — never zero, which
   * is a free delivery. Zero on a pick-up. The total leaves an unagreed fee out.
   */
  deliveryFeeCents: number | null;
  /**
   * Everything taken off: the promotions, the coupon and what the shopkeeper typed. The two below
   * are its parts; the rest is the typed discount.
   */
  discountCents: number;
  /** The sum of the lines' promotion discounts. */
  promotionDiscountCents: number;
  /** What the coupon took off — on a free delivery, the fee, and zero while the fee is not agreed. */
  couponDiscountCents: number;
  coupon: OrderCoupon | null;
  /** The cashback it earns and where that credit stands (BEELINK-239); null when it earns none. */
  cashback: ShopOrderCashback | null;
  /** The customer's credit it spent (BEELINK-240), taken off the total apart from `discountCents`. */
  cashbackUsedCents: number;
  totalCents: number;
  note: string | null;
  /** When it was sold, ISO-8601 — which may be before it was registered. */
  placedAt: string;
  /** Oldest first; the first is how the order started. */
  events: OrderEvent[];
  /** Null on a pick-up, and on a delivery nobody told yet. */
  delivery: OrderDelivery | null;
  /** When the quote said it would arrive, as the order was placed (BEELINK-178); null on a pick-up, a fee agreed afterwards and a sale registered in the panel. */
  deliveryWindow: ShippingWindow | null;
  createdAt: string;
}

/** An order as the list shows it: no lines, their count instead. */
export interface OrderSummary {
  id: string;
  number: number;
  status: OrderStatus;
  customer: OrderCustomer;
  fulfillment: OrderFulfillment;
  paymentMethod: PaymentMethod;
  /** Where it is paid (BEELINK-204): `OFFLINE`, settled between the two of them, or `ONLINE`, charged at Asaas. */
  paymentChannel: OrderPaymentChannel;
  payment: OrderPaymentBrief | null;
  /** How many payments arrived that it did not ask for and the shop has not settled yet (BEELINK-207, BEELINK-208); zero on nearly every order. */
  strays: number;
  totalCents: number;
  /** Null while a delivery's fee is not agreed: the total then says "+ frete" beside it. */
  deliveryFeeCents: number | null;
  /** How many units, across every line. */
  itemsCount: number;
  placedAt: string;
}

/** One page of a shop's orders, most recently placed first. Echoes the bounds used, not the ones asked. */
export interface OrderPage {
  orders: OrderSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderListQuery {
  status?: OrderStatus;
  /** By where the money stands (BEELINK-207); absent is every order. */
  payment?: OrderPaymentFilter;
  /** An order number, a customer's name, or digits of their phone. */
  q?: string;
  /** One customer's orders only — their record's history. Another shop's customer finds none. */
  customerId?: string;
  page?: number;
  pageSize?: number;
}

/** A customer of the shop, or one registered on the order itself — matched by phone if the shop has it. */
export type OrderCustomerInput = { id: string } | { name: string; phone: string };

/** One line to be: the price is the variant's, never sent. */
export interface CreateOrderItemInput {
  variantId: string;
  quantity: number;
}

/**
 * What the panel sends to register an order it closed elsewhere. It starts `ACCEPTED`: the
 * shopkeeper already agreed the sale. The totals are the API's to compute.
 */
export interface CreateOrderPayload {
  customer: OrderCustomerInput;
  items: CreateOrderItemInput[];
  /**
   * A delivery goes to the customer's default address, and the order keeps that address as it was;
   * a customer with no street and city there is refused with `ORDER_DELIVERY_ADDRESS_MISSING`.
   */
  fulfillment: OrderFulfillment;
  /** Ignored, as zero, on a pick-up. */
  deliveryFeeCents?: number;
  /** What the shopkeeper takes off by hand, beyond the promotions and the coupon. */
  discountCents?: number;
  /** A coupon of the shop, in any case; one that does not hold refuses the order (`ORDER_COUPON_REFUSED`). */
  couponCode?: string | null;
  /**
   * The customer's credit to spend, in cents, as the quote offered it (BEELINK-240). More than they can
   * spend now refuses the order (`ORDER_CASHBACK_REFUSED`) rather than place it at another price.
   */
  cashbackCents?: number;
  paymentMethod: PaymentMethod;
  note?: string;
  /** ISO-8601; absent is now. The past is allowed, the future is not. */
  placedAt?: string;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  /**
   * On a cancellation of an order that holds its customer's money (BEELINK-208): the refund of all
   * that is left, asked of Asaas first — the order is cancelled only once Asaas took it. Without
   * it, such a cancellation is refused with `ORDER_PAID`.
   */
  refund?: OrderCancellationRefund;
}

/* ── the customer's side: an order placed from the shop's cart ──────────────── */

/**
 * The way a delivery goes by, among the shipping quote's (BEELINK-186): the shop's own delivery, or
 * one of the carriers' services, by Melhor Envio's id for it.
 */
export type OrderShippingChoice = { kind: "OWN_DELIVERY" } | { kind: "CARRIER"; serviceId: number };

/**
 * The cart as its signed-in customer places it: the lines, how it leaves and how it is paid. The
 * prices and the totals are the API's. A delivery goes to the saved address chosen, or to the
 * default without one (`ORDER_DELIVERY_ADDRESS_MISSING` when there is nowhere to go). It starts
 * `RECEIVED`: the shop still has to accept it.
 */
export interface PlaceCustomerOrderPayload {
  items: CreateOrderItemInput[];
  fulfillment: OrderFulfillment;
  paymentMethod: PaymentMethod;
  /** Where it is paid (BEELINK-204); absent is `OFFLINE`. `ONLINE` takes `PIX` or `CREDIT_CARD`, of a shop whose Asaas is connected and takes it; anything else is `ORDER_PAYMENT_NOT_ACCEPTED`. */
  paymentChannel?: OrderPaymentChannel;
  /** How many instalments an online card is paid in, 1 to the shop's most; absent is 1. More than 1 on anything else is `ORDER_PAYMENT_NOT_ACCEPTED`. */
  installments?: number;
  /** One of the customer's saved addresses (`CustomerSavedAddress.id`); ignored on a pick-up. Another's is `ORDER_ADDRESS_NOT_FOUND`. */
  addressId?: string;
  /** A coupon of the shop, in any case; one that does not hold refuses the order (`ORDER_COUPON_REFUSED`). */
  couponCode?: string | null;
  /** Their credit to spend, in cents, as the quote offered it (BEELINK-240); more than they can spend now is `ORDER_CASHBACK_REFUSED`. */
  cashbackCents?: number;
  /** The way a delivery goes by (BEELINK-186); absent, the shop's own delivery. One the quote no longer offers is `ORDER_SHIPPING_UNAVAILABLE`. Ignored on a pick-up. */
  shipping?: OrderShippingChoice;
  /**
   * The customer's CPF, asked at checkout when their record has none: a carrier's label is bought
   * with it (BEELINK-187) and an online payment is charged to it (BEELINK-204). Kept on their record,
   * and on a carrier's order. One that is not a CPF is `CUSTOMER_CPF_INVALID`; none where the record
   * has none either is `ORDER_RECIPIENT_DOCUMENT_MISSING` on a carrier's order, else
   * `ORDER_PAYER_DOCUMENT_MISSING` on one paid online.
   */
  recipientDocument?: string;
  /**
   * The delivery fee the quote showed (BEELINK-178), null for one agreed afterwards. The API quotes
   * again as it places the order: a different fee refuses it (`ORDER_SHIPPING_CHANGED`) rather than
   * place it at another price. Absent is not checked; ignored on a pick-up.
   */
  deliveryFeeCents?: number | null;
}

/** One line as its customer reads it: what was bought, at the price of that moment. */
export interface CustomerOrderItem {
  /** Null once the product was deleted; the line still reads. */
  productId: string | null;
  /** The product's slug while it is on sale, for the line to lead to its page; null once it is off sale or gone. */
  productSlug: string | null;
  productName: string;
  variantLabel: string | null;
  /** The combination's photo, else the product's first — while the product exists. */
  imageUrl: string | null;
  /** The catalogue's price of one unit when the order was placed, before any promotion. */
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  /** What a promotion took off this line; zero with none. */
  discountCents: number;
  promotionName: string | null;
}

/** Who placed an order, as its customer is told: they did, from the cart, or the shop registered it. */
export type OrderPlacedBy = "CUSTOMER" | "SHOP";

/**
 * Who cancelled an order, as its customer is told: they did, the shop did, or bee-link itself — which
 * cancels for one reason alone, an order charged online that nobody paid in time (BEELINK-206).
 */
export type OrderCancelledBy = OrderPlacedBy | "SYSTEM";

/** A status the order had, and when — never who set it. */
export interface CustomerOrderEvent {
  status: OrderStatus;
  /** ISO-8601. */
  at: string;
}

/** The customer's tabs: in progress (received to out for delivery), delivered, cancelled. */
export type CustomerOrderSituation = "ACTIVE" | "DELIVERED" | "CANCELLED";

/**
 * An order as its customer reads it. Never the shop's note on it, never who moved it along, never
 * what the shop's books say about the customer.
 */
export interface CustomerOrder {
  /** Sequential within the shop: what the customer says to the shop. */
  number: number;
  status: OrderStatus;
  placedBy: OrderPlacedBy;
  /** Who cancelled it — "pela loja", "por você", or for want of payment — on a cancelled order; null on any other. */
  cancelledBy: OrderCancelledBy | null;
  fulfillment: OrderFulfillment;
  deliveryAddress: OrderDeliveryAddress | null;
  paymentMethod: PaymentMethod;
  /** Where it is paid (BEELINK-204): `OFFLINE`, settled between the two of them, or `ONLINE`, charged at Asaas. */
  paymentChannel: OrderPaymentChannel;
  /** The instalments they chose; 1 unless it is an online card. */
  installments: number;
  /** Its charge: the one standing, else the last tried. Null offline, and online while it has none. What it is paid with is read at `…/orders/:number/payment`. */
  payment: OrderPayment | null;
  items: CustomerOrderItem[];
  subtotalCents: number;
  /**
   * Null on a delivery whose fee was not agreed yet (BEELINK-170): "a combinar" — never zero, which
   * is a free delivery. Zero on a pick-up. The total leaves an unagreed fee out.
   */
  deliveryFeeCents: number | null;
  /**
   * Everything taken off: the promotions, the coupon and what the shopkeeper typed. The two below
   * are its parts; the rest is the typed discount.
   */
  discountCents: number;
  /** The sum of the lines' promotion discounts. */
  promotionDiscountCents: number;
  /** What the coupon took off — on a free delivery, the fee, and zero while the fee is not agreed. */
  couponDiscountCents: number;
  coupon: OrderCoupon | null;
  /** The cashback it earns: pending until delivered, then usable (BEELINK-239); null when it earns none. */
  cashback: OrderCashback | null;
  /** Their credit it spent (BEELINK-240), taken off the total apart from `discountCents`. */
  cashbackUsedCents: number;
  totalCents: number;
  /** ISO-8601. */
  placedAt: string;
  /** Oldest first: the order's timeline. */
  events: CustomerOrderEvent[];
  /** Who brings it and when it should arrive, once the shop told; null on a pick-up. */
  delivery: OrderDelivery | null;
  /** When the quote said it would arrive, as the order was placed (BEELINK-178); null on a pick-up and on a fee agreed afterwards. */
  deliveryWindow: ShippingWindow | null;
}

/** An order as the customer's list shows it: the first lines, with their photos, and how many more. */
export interface CustomerOrderSummary {
  number: number;
  status: OrderStatus;
  placedBy: OrderPlacedBy;
  cancelledBy: OrderCancelledBy | null;
  /** When it reached the status it is in: "Entregue em …", "Cancelado em …". ISO-8601. */
  statusAt: string;
  fulfillment: OrderFulfillment;
  /** Who a delivery goes to; null on a pick-up and on a delivery that recorded none. */
  recipientName: string | null;
  paymentMethod: PaymentMethod;
  /** Where it is paid (BEELINK-204): `OFFLINE`, settled between the two of them, or `ONLINE`, charged at Asaas. */
  paymentChannel: OrderPaymentChannel;
  payment: OrderPaymentBrief | null;
  totalCents: number;
  /** Null while a delivery's fee is not agreed: the total then says "+ frete" beside it. */
  deliveryFeeCents: number | null;
  /** Everything taken off — promotions, coupon and what the shop typed — as the card says it under the total (BEELINK-194). */
  discountCents: number;
  /** The coupon it took, as it was; null with none. */
  coupon: OrderCoupon | null;
  /** The cashback it earns, as the card says it; null when it earns none. */
  cashback: OrderCashback | null;
  /** Their credit it spent (BEELINK-240). */
  cashbackUsedCents: number;
  /** Units across every line. */
  itemsCount: number;
  /** The first lines, as many as the card shows. */
  items: CustomerOrderItem[];
  /** Lines past those: "+ N itens". */
  moreItems: number;
  /** ISO-8601. */
  placedAt: string;
  /** The window it should arrive in, once the shop told one: `YYYY-MM-DD` days. */
  estimate: { from: string; to: string } | null;
}

/** How the customer asks for a page of their orders. Absent means all. */
export interface CustomerOrderListQuery {
  situation?: CustomerOrderSituation;
  /** `3m` for the last three months, or a year (`2025`), in the shop's calendar (Brasília). */
  period?: string;
  /** An order number, or part of a product's name. */
  q?: string;
  page?: number;
  pageSize?: number;
}

/**
 * One page of the customer's orders at a shop, most recently placed first. The counts follow the
 * period and the search, not the tab, so the other tabs keep saying how many they hold.
 */
export interface CustomerOrderPage {
  orders: CustomerOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<"ALL" | CustomerOrderSituation, number>;
  /** The years this customer placed orders in at the shop, most recent first: the period's choices. */
  years: number[];
}
/**
 * Why a line of an order does not go back into the cart as it was: the shop no longer sells it
 * (a draft, an archived or switched-off combination, a deleted product), none is left, or fewer
 * are left than the order had.
 */
export type ReorderLeftReason = "OFF_SALE" | "SOLD_OUT" | "LIMITED";

/** A line that goes into the cart again: the same combination, as many as the stock allows. */
export interface CustomerReorderLine {
  productId: string;
  /** Null for a product without options, as the cart writes such a line, so the two add up rather than stand twice. */
  variantId: string | null;
  quantity: number;
}

/** A line that stays out, or goes in with fewer: what it was, why, and how many went in. */
export interface CustomerReorderLeft {
  productName: string;
  variantLabel: string | null;
  reason: ReorderLeftReason;
  /** Units that went in: zero unless the reason is `LIMITED`. */
  added: number;
}

/**
 * An order read to be bought again against today's catalogue: what goes into the cart and what does
 * not. Prices are not in it — the cart prices every line from the catalogue on each read.
 */
export interface CustomerReorder {
  number: number;
  lines: CustomerReorderLine[];
  left: CustomerReorderLeft[];
}

/** The fee the shop agreed for a delivery, in whole cents (BEELINK-170): zero is a free delivery. */
export interface SetOrderDeliveryFeePayload {
  deliveryFeeCents: number;
}

/**
 * The error codes the order routes answer, beyond the store's own (`STORE_NOT_FOUND`,
 * `STORE_FORBIDDEN`) and the HTTP-status fallbacks.
 */
export type OrderErrorCode =
  | "ORDER_NOT_FOUND"
  | "ORDER_CUSTOMER_NOT_FOUND"
  /** A delivery for a customer whose record has no street and city: nowhere to send it. */
  | "ORDER_DELIVERY_ADDRESS_MISSING"
  /** The cart chose a saved address that is not the customer's — deleted since, or never theirs. */
  | "ORDER_ADDRESS_NOT_FOUND"
  /** A line the shop does not sell — another shop's, switched off, or off sale. Its `details` are `OrderVariantInvalidDetails`. */
  | "ORDER_VARIANT_INVALID"
  | "ORDER_ITEM_DUPLICATE"
  | "ORDER_PAYMENT_NOT_ACCEPTED"
  | "ORDER_PLACED_IN_FUTURE"
  | "ORDER_DISCOUNT_TOO_LARGE"
  /** A line or the order past R$ 1.000.000,00 — a typo with too many zeros, not a sale. */
  | "ORDER_TOTAL_TOO_LARGE"
  | "ORDER_CANCELLED"
  /** The customer cancels only while the order is received; once the shop accepted it, the shop does. */
  | "ORDER_NOT_CANCELLABLE"
  | "ORDER_STATUS_UNCHANGED"
  /** A pick-up is handed over at the shop: it has no delivery to tell, and no fee. */
  | "ORDER_DELIVERY_FOR_PICKUP"
  /** The arrival window needs both days, and cannot end before it starts. */
  | "ORDER_DELIVERY_WINDOW_INVALID"
  /** A tracking link opens in the customer's browser: `https` only. */
  | "ORDER_DELIVERY_LINK_INVALID"
  /** A counted combination with fewer left than the order asks for. Its `details` are `OrderStockDetails`. */
  | "ORDER_STOCK_INSUFFICIENT"
  /** The coupon sent with the order does not hold. Its `details` are `OrderCouponRefusedDetails`. */
  | "ORDER_COUPON_REFUSED"
  /** It asked to spend more credit than the customer can now. Its `details` are `OrderCashbackRefusedDetails`. */
  | "ORDER_CASHBACK_REFUSED"
  /** The shop does not hand this order over the way it asks — no pick-up, or no delivery to that address. Its `details` are `OrderShippingUnavailableDetails`. */
  | "ORDER_SHIPPING_UNAVAILABLE"
  /** The delivery fee is not the one the quote showed. Its `details` are `OrderShippingChangedDetails`. */
  | "ORDER_SHIPPING_CHANGED"
  /** A carrier needs the CPF of who receives it, and the customer has none on their record (BEELINK-187). */
  | "ORDER_RECIPIENT_DOCUMENT_MISSING"
  /** An order paid online is under Asaas's least charge, or one of its instalments is (BEELINK-204). Its `details` are `OrderPaymentBelowMinimumDetails`. */
  | "ORDER_PAYMENT_BELOW_MINIMUM"
  /** Paying online needs the customer's CPF, and their record has none. */
  | "ORDER_PAYER_DOCUMENT_MISSING"
  /** A paid order keeps its total, is not cancelled by its customer, and is cancelled by the shop only with its refund (BEELINK-208). */
  | "ORDER_PAID";

/** The `details` of `ORDER_SHIPPING_UNAVAILABLE`: what the quote says of each way now; both absent on a pick-up the shop does not offer. */
export interface OrderShippingUnavailableDetails {
  ownDelivery?: OwnDeliveryVerdict;
  carriers?: CarriersVerdict;
}

/** The `details` of `ORDER_SHIPPING_CHANGED`: what the delivery costs now — null for a fee agreed afterwards. */
export interface OrderShippingChangedDetails {
  deliveryFeeCents: number | null;
}

/** One line the stock cannot cover: the combination, and how many the shop has of it. */
export interface OrderStockShortage {
  variantId: string;
  available: number;
}

/** The `details` of `ORDER_STOCK_INSUFFICIENT`: every line short, not only the first. */
export interface OrderStockDetails {
  shortages: OrderStockShortage[];
}

/** The `details` of `ORDER_VARIANT_INVALID`: every line the shop does not sell, so a cart can name them. */
export interface OrderVariantInvalidDetails {
  variantIds: string[];
}
