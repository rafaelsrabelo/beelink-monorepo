/**
 * The panel's new order, as its blocks and the screen that wires them share it. Mirrors the wire's
 * order shapes where it has to — this package imports no contracts — and holds the one piece of
 * arithmetic the form and the API must agree on.
 */

/** Mirrors the wire's `PaymentMethod`. */
export type OrderPaymentValue = "MONEY" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD"

/** Mirrors the wire's `OrderFulfillment`. */
export type OrderFulfillmentValue = "DELIVERY" | "PICKUP"

/** A customer as the form offers it: the wire's `StoreCustomer`, as far as choosing one needs. */
export interface OrderCustomerOption {
  id: string
  name: string
  /** Digits, with the country code. */
  phone: string | null
  email: string | null
}

/** What the shopkeeper types to register a customer on the spot; the address is all optional. */
export interface OrderCustomerDraft {
  name: string
  phone: string
  address: {
    zipCode: string
    street: string
    number: string
    complement: string
    neighborhood: string
    city: string
    state: string
  }
}

/** A catalogue hit: enough to recognise the product before its combinations are read. */
export interface OrderProductOption {
  id: string
  name: string
  imageUrl: string | null
  /** The cheapest combination's, as the catalogue lists it. */
  priceCents: number
  sku: string | null
}

/** One combination the shop sells, labelled the way the API photographs it on the order. */
export interface OrderVariantOption {
  id: string
  /** "Sabor: Uva · Peso: 300 g"; null on a product with no options. */
  label: string | null
  priceCents: number
  sku: string | null
  outOfStock: boolean
  /** How many the shop has, when it counts this combination; null when it does not. */
  available: number | null
}

/** A line on the order being written. The price is shown, never sent: the API prices the variant. */
export interface OrderFormLine {
  variantId: string
  productName: string
  variantLabel: string | null
  unitPriceCents: number
  quantity: number
  /** How many the shop has, when it counts it: from the product read, or from the API's refusal. */
  available: number | null
}

/** Whether a line asks for more than the shop has: the API refuses such an order, so the form says so first. */
export function overStock(line: Pick<OrderFormLine, "quantity" | "available">): boolean {
  return line.available !== null && line.quantity > line.available
}

/** The rest of the order, as typed: money stays text until it is read, so "10," is not lost. */
export interface OrderDetailsValues {
  fulfillment: OrderFulfillmentValue
  deliveryFee: string
  paymentMethod: OrderPaymentValue | null
  discount: string
  note: string
  /** `yyyy-mm-dd`, in the shopkeeper's own calendar. */
  placedOn: string
}

export type OrderDetailsIssues = Partial<Record<"deliveryFee" | "discount" | "paymentMethod" | "placedOn", string>>

/** The same limits the API holds a line and a note to. */
export const ORDER_QUANTITY_MAX = 999
export const ORDER_NOTE_MAX_LENGTH = 500

/** The same cap the API holds an order to: R$ 1.000.000,00, in cents. */
export const ORDER_AMOUNT_MAX_CENTS = 100_000_000

export interface OrderTotalsLine {
  unitPriceCents: number
  quantity: number
}

export interface OrderTotals {
  subtotalCents: number
  deliveryFeeCents: number
  discountCents: number
  totalCents: number
}

export type OrderTotalsRefusal = "DISCOUNT_TOO_LARGE" | "TOTAL_TOO_LARGE"

/**
 * The totals the form shows before it saves — the same rules the API's `totalsOf` applies, over the
 * same prices, so the total on the screen is the one the API writes, to the cent. A pick-up charges
 * no delivery; a discount never passes the order; nothing passes the cap.
 */
export function orderTotalsOf(
  lines: readonly OrderTotalsLine[],
  fulfillment: OrderFulfillmentValue,
  deliveryFeeCents: number,
  discountCents: number,
): OrderTotals | OrderTotalsRefusal {
  if (lines.some((line) => line.unitPriceCents * line.quantity > ORDER_AMOUNT_MAX_CENTS)) return "TOTAL_TOO_LARGE"

  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
  const fee = fulfillment === "PICKUP" ? 0 : deliveryFeeCents
  const totalCents = subtotalCents + fee - discountCents

  if (subtotalCents > ORDER_AMOUNT_MAX_CENTS || totalCents > ORDER_AMOUNT_MAX_CENTS) return "TOTAL_TOO_LARGE"
  if (totalCents < 0) return "DISCOUNT_TOO_LARGE"
  return { subtotalCents, deliveryFeeCents: fee, discountCents, totalCents }
}
