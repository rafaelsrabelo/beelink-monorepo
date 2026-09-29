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

/**
 * What the cart says after "Comprar de novo": the order read again, or nothing when that failed —
 * the handler's word, or a read here that failed, since the page reads it once more to list what
 * stayed out.
 */
export function reorderNoticeOf(number: number, reorder: CustomerReorder | null, failed: boolean, messages: UiMessages): Omit<StorefrontReorderNoticeProps, "messages"> {
  if (failed || !reorder) return { number, outcome: "failed", left: [] }
  return {
    number,
    outcome: reorder.lines.length ? "added" : "none",
    left: reorder.left.map((line) => leftLineOf(line, messages.storefront)),
  }
}
