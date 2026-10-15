"use client"

// React
import { useId } from "react"

// Libs
import { ExternalLinkIcon } from "lucide-react"

// UI
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface SubscriptionDueProps {
  /** Asaas's page for the renewal that is due; null when none is out. */
  invoiceUrl: string | null
  /** The invoice's link was followed — the screen waits from then on. */
  onOpen: () => void
  /** Asks the API again, which asks Asaas: for when no invoice is out. */
  onCheck: () => void
  checking?: boolean
  messages?: UiMessages
}

/**
 * A page whose renewal went unpaid — past due or suspended — on the Assinar screen (BEELINK-293). The
 * subscription stands, so what is paid is the invoice due, never another cycle: the button is that
 * invoice's link. With none out yet, the screen offers to look again.
 */
export function SubscriptionDue({ invoiceUrl, onOpen, onCheck, checking = false, messages = defaultMessages }: SubscriptionDueProps) {
  const text = messages.subscription
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="text-lg font-semibold">
        {text.due.title}
      </h2>
      <p className="text-sm">{text.due.text}</p>
      {invoiceUrl ? (
        <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={buttonVariants({ size: "lg", className: "h-10 w-fit px-4" })}>
          {text.due.pay}
          <ExternalLinkIcon aria-hidden="true" />{" "}
          <span className="sr-only">{text.newTab}</span>
        </a>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p role="status" className="bg-muted rounded-lg px-3 py-3 text-sm">
            {text.due.missing}
          </p>
          <Button type="button" variant="outline" onClick={onCheck} disabled={checking}>
            {checking ? text.awaiting.checking : text.due.check}
          </Button>
        </div>
      )}
    </section>
  )
}
