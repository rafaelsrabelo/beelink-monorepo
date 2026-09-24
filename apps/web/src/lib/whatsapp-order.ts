// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { CartView } from "./cart-view"

export interface OrderMessageInput {
  shopName: string
  view: Pick<CartView, "rows" | "subtotalCents">
  /** What the shopper typed, or nothing. */
  customerName?: string
  locale: string
  messages: UiMessages
}

/**
 * The order as the shop reads it on WhatsApp: a greeting, one line per thing that can be ordered —
 * quantity, name, combination, the line's total — the total, and a name when one was given. A
 * sold-out line is left out: the cart already said it would not be ordered.
 */
export function orderMessageOf({ shopName, view, customerName, locale, messages }: OrderMessageInput): string {
  const text = messages.storefront
  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const lines = view.rows
    .filter((row) => row.available)
    .map((row) =>
      format(text.orderLine, {
        qty: String(row.qty),
        name: row.variantLabel ? `${row.name} (${row.variantLabel})` : row.name,
        total: money(row.lineTotalCents),
      }),
    )
  const name = customerName?.trim()

  return [
    format(text.orderGreeting, { shop: shopName }),
    "",
    ...lines,
    "",
    format(text.orderTotal, { total: money(view.subtotalCents) }),
    ...(name ? [format(text.orderCustomer, { name })] : []),
  ].join("\n")
}

/** `wa.me/<digits>?text=…`: the shop's number as it is stored, the message escaped whole. */
export function whatsappOrderHref(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
