// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderTotals, OrderTotalsRefusal } from "@harness-monorepo/ui/lib/order-form"

export interface OrderSummaryProps {
  /** `orderTotalsOf` over what is on screen; a refusal is said instead of a total. */
  totals: OrderTotals | OrderTotalsRefusal
  money: (cents: number) => string
  pending?: boolean
  /** Why the last save did not go through, in words. */
  error?: string
  messages?: UiMessages
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-4 border-t pt-3 text-base font-semibold" : "text-muted-foreground flex justify-between gap-4 text-sm"}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * What the order adds up to, and the button that registers it. The numbers are the ones the API
 * will write — it computes them the same way — so what the shopkeeper confirms is what is saved.
 */
export function OrderSummary({ totals, money, pending = false, error, messages = defaultMessages }: OrderSummaryProps) {
  const text = messages.orders.form
  const refusal = typeof totals === "string" ? (totals === "DISCOUNT_TOO_LARGE" ? text.discountTooLarge : text.totalTooLarge) : null

  return (
    <section aria-labelledby="order-summary-title" className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-5 shadow-xs">
      <h2 id="order-summary-title" className="font-semibold">
        {text.summary}
      </h2>

      {typeof totals === "string" ? (
        <p role="alert" className="text-destructive text-sm">
          {refusal}
        </p>
      ) : (
        <dl className="flex flex-col gap-2">
          <Row label={text.subtotal} value={money(totals.subtotalCents)} />
          <Row label={text.fee} value={money(totals.deliveryFeeCents)} />
          {totals.discountCents > 0 ? <Row label={text.discountLine} value={`− ${money(totals.discountCents)}`} /> : null}
          <Row label={text.total} value={money(totals.totalCents)} strong />
        </dl>
      )}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? text.saving : text.save}
      </Button>
    </section>
  )
}
