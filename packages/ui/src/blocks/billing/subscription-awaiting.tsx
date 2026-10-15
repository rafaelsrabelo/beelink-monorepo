"use client"

// React
import { useId } from "react"

// Libs
import { ExternalLinkIcon } from "lucide-react"

// UI
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { planMoney } from "@harness-monorepo/ui/lib/plan-figures"
import type { SubscriptionCycleValue } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface SubscriptionAwaitingProps {
  /** Asaas's page for the charge, the same one that was opened. */
  invoiceUrl: string
  /** What the invoice is for, as the page's subscription now reads. */
  cycle: SubscriptionCycleValue | null
  priceCents: number | null
  locale: string
  /** The invoice holds a price other than the one the button said: it is said before anything is paid. */
  priceChanged?: boolean
  /** The invoice's link was followed — the screen waits from then on. */
  onOpen?: () => void
  /** "Já paguei, verificar agora": the screen asks the API, which asks Asaas. */
  onCheck: () => void
  checking?: boolean
  /** A check asked for by hand came back without the payment. */
  notYet?: boolean
  /** Back to the cycles; absent where the invoice due is what is paid, not a cycle chosen. */
  onChoose?: () => void
  messages?: UiMessages
}

/**
 * The Assinar screen while a payment is on its way (BEELINK-293): the invoice opened in another tab,
 * and this one waiting for the API to say it was paid. A skeleton stands where the confirmation will
 * be — the screen asks by itself, and nothing turns — with the same invoice's link, for whoever came
 * back without paying or whose browser held the tab back, and a way to ask now.
 *
 * Nothing here says paid: only the API does, and the screen then shows something else.
 */
export function SubscriptionAwaiting({ invoiceUrl, cycle, priceCents, locale, priceChanged = false, onOpen, onCheck, checking = false, notYet = false, onChoose, messages = defaultMessages }: SubscriptionAwaitingProps) {
  const text = messages.subscription
  const id = useId()
  const amount = priceCents === null ? null : planMoney(priceCents, locale)

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {text.awaiting.title}
        </h2>
        {cycle && amount ? <p className="text-muted-foreground text-sm">{format(text.awaiting.summary, { cycle: text.cycles.names[cycle], amount })}</p> : null}
      </div>

      {priceChanged && amount ? (
        <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {format(text.awaiting.priceChanged, { amount })}
        </p>
      ) : null}

      {/* Where the confirmation will stand once the API says paid. */}
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-2/3 max-w-xs" />
      </div>

      <p className="text-sm">{text.awaiting.text}</p>

      <div className="flex flex-wrap items-center gap-3">
        <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
          {text.awaiting.open}
          <ExternalLinkIcon aria-hidden="true" />{" "}
          <span className="sr-only">{text.newTab}</span>
        </a>
        <Button type="button" variant="outline" size="lg" className="h-10 px-4" onClick={onCheck} disabled={checking}>
          {checking ? text.awaiting.checking : text.awaiting.check}
        </Button>
      </div>

      {/* In the page from the start, so the sentence a check by hand brings back is heard arriving. */}
      <div role="status" className="flex flex-col gap-1 text-sm">
        {notYet && !checking ? <p className="font-medium">{text.awaiting.notYet}</p> : null}
        <p className="text-muted-foreground">{text.awaiting.timing}</p>
      </div>

      {onChoose ? (
        <Button type="button" variant="link" className="w-fit px-0" onClick={onChoose}>
          {text.awaiting.choose}
        </Button>
      ) : null}
    </section>
  )
}
