// Types
import type { CreateOrderPayload, PaymentMethod, Product, ProductDetail } from "@harness-monorepo/contracts"
import type { OrderDetailsValues, OrderFormLine, OrderProductOption, OrderTotals, OrderVariantOption } from "@harness-monorepo/ui/lib/order-form"

// UI
import { centsFrom } from "@harness-monorepo/ui/lib/money"

export function productOptionOf(product: Product): OrderProductOption {
  return { id: product.id, name: product.name, imageUrl: product.imageUrl, priceCents: product.priceCents, sku: product.sku }
}

/** The combinations the shop sells, labelled as the API photographs them: "Sabor: Uva · Peso: 300 g". */
export function variantOptionsOf(product: ProductDetail): OrderVariantOption[] {
  return product.variants
    .filter((variant) => variant.isActive)
    .map((variant) => {
      const chosen = product.options.flatMap((option) => {
        const value = option.values.find((candidate) => variant.optionValueIds.includes(candidate.id))
        return value ? [`${option.name}: ${value.name}`] : []
      })
      return {
        id: variant.id,
        label: chosen.length ? chosen.join(" · ") : null,
        priceCents: variant.priceCents,
        sku: variant.sku,
        outOfStock: variant.trackStock && (variant.stockQuantity ?? 0) <= 0,
      }
    })
}

/**
 * A phone as the API keeps it, to look up the customer it said already has it: digits, the
 * long-distance 0 and a carrier code dropped, and 55 in front of a Brazilian number typed without
 * it — the rule of the API's `normaliseWhatsapp`, which a 409 cannot hand back.
 */
export function canonicalPhoneOf(typed: string): string {
  const digits = typed.replace(/\D/g, "").replace(/^0(?:\d{2})?(?=\d{10,11}$)/, "")
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
}

/** Money as typed: empty is zero, anything unreadable is null for the field to point at. */
export function moneyOf(typed: string): number | null {
  return typed.trim() === "" ? 0 : centsFrom(typed)
}

export interface OrderPayloadInput {
  customerId: string
  lines: readonly OrderFormLine[]
  details: OrderDetailsValues
  paymentMethod: PaymentMethod
  /** What the summary showed: its fee and discount are the ones sent. */
  totals: OrderTotals
  /** `yyyy-mm-dd`, the shopkeeper's today. */
  today: string
}

/**
 * The order as the API takes it: the customer by id, no prices, and zero amounts left out. Today
 * is left to the API's clock; a day past is sent at its noon, so no time zone moves it a day.
 */
export function orderPayloadOf({ customerId, lines, details, paymentMethod, totals, today }: OrderPayloadInput): CreateOrderPayload {
  const note = details.note.trim()
  const placedOn = details.placedOn || today

  return {
    customer: { id: customerId },
    items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    fulfillment: details.fulfillment,
    ...(totals.deliveryFeeCents ? { deliveryFeeCents: totals.deliveryFeeCents } : {}),
    ...(totals.discountCents ? { discountCents: totals.discountCents } : {}),
    paymentMethod,
    ...(note ? { note } : {}),
    ...(placedOn && placedOn !== today ? { placedAt: new Date(`${placedOn}T12:00:00`).toISOString() } : {}),
  }
}
