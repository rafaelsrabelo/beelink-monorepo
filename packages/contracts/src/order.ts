/* ── orders: what a shop sold, as a fact about the past ───────────────────── */

// Types
import type { CustomerAddress } from "./customer.js";
import type { PaymentMethod } from "./store.js";

/** Where an order stands. `CANCELLED` is final; the others move back and forth at the shopkeeper's word. */
export type OrderStatus = "RECEIVED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

/** How the order is handed over. */
export type OrderFulfillment = "DELIVERY" | "PICKUP";

/** Who set a status: the shopkeeper today, the customer's checkout and the courier later. */
export type OrderActor = "SHOPKEEPER" | "CUSTOMER" | "SYSTEM";

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
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
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

/** The customer on an opened order, with where they are: the shop's record as it is now. */
export interface OrderCustomerDetail extends OrderCustomer {
  address: CustomerAddress;
}

/** An order as its shop reads it. Every amount is whole cents, computed by the API. */
export interface Order {
  id: string;
  /** Sequential within the shop. */
  number: number;
  status: OrderStatus;
  customer: OrderCustomerDetail;
  fulfillment: OrderFulfillment;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
  note: string | null;
  /** When it was sold, ISO-8601 — which may be before it was registered. */
  placedAt: string;
  /** Oldest first; the first is how the order started. */
  events: OrderEvent[];
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
  totalCents: number;
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
  /** An order number, a customer's name, or digits of their phone. */
  q?: string;
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
  fulfillment: OrderFulfillment;
  /** Ignored, as zero, on a pick-up. */
  deliveryFeeCents?: number;
  discountCents?: number;
  paymentMethod: PaymentMethod;
  note?: string;
  /** ISO-8601; absent is now. The past is allowed, the future is not. */
  placedAt?: string;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}

/**
 * The error codes the order routes answer, beyond the store's own (`STORE_NOT_FOUND`,
 * `STORE_FORBIDDEN`) and the HTTP-status fallbacks.
 */
export type OrderErrorCode =
  | "ORDER_NOT_FOUND"
  | "ORDER_CUSTOMER_NOT_FOUND"
  | "ORDER_VARIANT_INVALID"
  | "ORDER_ITEM_DUPLICATE"
  | "ORDER_PAYMENT_NOT_ACCEPTED"
  | "ORDER_PLACED_IN_FUTURE"
  | "ORDER_DISCOUNT_TOO_LARGE"
  /** A line or the order past R$ 1.000.000,00 — a typo with too many zeros, not a sale. */
  | "ORDER_TOTAL_TOO_LARGE"
  | "ORDER_CANCELLED"
  | "ORDER_STATUS_UNCHANGED";
