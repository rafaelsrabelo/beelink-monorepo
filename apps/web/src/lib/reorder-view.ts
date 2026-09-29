// Types
import type { CustomerReorder, CustomerReorderLeft } from "@harness-monorepo/contracts"
import type { StorefrontReorderNoticeProps } from "@harness-monorepo/ui/blocks/storefront/storefront-reorder-notice"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

/** The shop's handler behind "Comprar de novo": a form posts here, and lands on the cart. */
export function reorderActionOf(slug: string, number: number): string {
  return `/${encodeURIComponent(slug)}/api/orders/${number}/reorder`
}

/** A line that stayed out, in words: "Whey (Sabor: Uva) — esgotado". */
function leftLineOf(line: CustomerReorderLeft, text: UiMessages["storefront"]): string {
  const why =
    line.reason === "OFF_SALE"
      ? text.reorderOffSale
      : line.reason === "SOLD_OUT"
        ? text.reorderSoldOut
        : line.added === 1
          ? text.reorderLimitedOne
          : format(text.reorderLimitedMany, { count: String(line.added) })
  return `${line.productName}${line.variantLabel ? ` (${line.variantLabel})` : ""} — ${why}`
}

/** What the address the handler sent the shopper to says: which order, and whether it failed or was cut. */
export interface ReorderMark {
  number: number
  failed: boolean
  trimmed: boolean
}

/**
 * What the cart says after "Comprar de novo". Failed only on the handler's word: the page reads the
 * order once more to list what stayed out, and a read here that comes back empty — a hiccup, or a
 * number that is not theirs — says nothing rather than send them to add the lines twice.
 */
export function reorderNoticeOf(mark: ReorderMark, reorder: CustomerReorder | null, messages: UiMessages): Omit<StorefrontReorderNoticeProps, "messages"> | null {
  if (mark.failed) return { number: mark.number, outcome: "failed", left: [] }
  if (!reorder) return null
  return {
    number: mark.number,
    outcome: reorder.lines.length ? "added" : "none",
    left: reorder.left.map((line) => leftLineOf(line, messages.storefront)),
    trimmed: mark.trimmed,
  }
}
