"use client"

// React
import { useId } from "react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { CustomerMergeDialog } from "./customer-merge-dialog"
import { ordersLabel, type CustomerDuplicateView } from "./customer-types"

export interface CustomerDuplicatesProps {
  duplicates: readonly CustomerDuplicateView[]
  /** Where another record opens, to be looked at before merging. */
  hrefOf: (id: string) => string
  /** The record the shopkeeper asked to merge with; null with no question open. */
  asking: CustomerDuplicateView | null
  onAsk: (duplicate: CustomerDuplicateView) => void
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  /** The merge refused, already in words. */
  error?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The shop's other records that may be this person — the phone one of them tried to save, or the
 * same name — each with what tells them apart and the way to make the two one. Nothing is merged
 * on its own: anyone can type another person's phone, so the shopkeeper, who knows the customer,
 * decides. Nothing is drawn when there is no one to offer.
 */
export function CustomerDuplicates({
  duplicates,
  hrefOf,
  asking,
  onAsk,
  onConfirm,
  onCancel,
  pending = false,
  error,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: CustomerDuplicatesProps) {
  const text = messages.customers.record.duplicates
  const titleId = useId()

  if (duplicates.length === 0) return null

  return (
    <section aria-labelledby={titleId} className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="font-semibold">
          {text.title}
        </h2>
        <p className="text-muted-foreground text-sm">{text.lead}</p>
      </div>
      <ul className="divide-shell-border flex flex-col divide-y">
        {duplicates.map((duplicate) => (
          <li key={duplicate.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <Link href={hrefOf(duplicate.id)} className="focus-visible:ring-ring truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-2">
                  {duplicate.name}
                </Link>
                <Badge variant="secondary">{text.reasons[duplicate.reason]}</Badge>
              </span>
              <span className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                {duplicate.phone ? <span className="tabular-nums">{duplicate.phone}</span> : null}
                <span className="break-all">{duplicate.email ?? text.noAccount}</span>
                <span>{ordersLabel(duplicate.ordersCount, messages)}</span>
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" aria-label={format(text.mergeLabel, { name: duplicate.name })} onClick={() => onAsk(duplicate)}>
              {text.merge}
            </Button>
          </li>
        ))}
      </ul>
      <CustomerMergeDialog asking={asking} onConfirm={onConfirm} onCancel={onCancel} pending={pending} error={error} messages={messages} />
    </section>
  )
}
