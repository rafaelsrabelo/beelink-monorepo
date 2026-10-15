// React
import { useId } from "react"

// Libs
import { InfoIcon } from "lucide-react"

// UI
import { planMoney } from "@harness-monorepo/ui/lib/plan-figures"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** What subscribing now gives up: the trial's days left, a free period's (BEELINK-224), or what is left of a cancelled page's paid period. */
export type SubscriptionLoss = { kind: "trial"; daysLeft: number } | { kind: "free"; daysLeft: number } | { kind: "canceled" }

export interface SubscriptionFactsProps {
  /** What is paid today: the chosen cycle's whole price. */
  chargedCents: number
  loss: SubscriptionLoss | null
  locale: string
  messages?: UiMessages
}

/**
 * What a shopkeeper reads before the button (BEELINK-293), in plain words: the first charge is today;
 * days still owed by the trial, a free period or a cancelled period are not added; a card renews by itself
 * and a Pix or a boleto is a new invoice each time; the invoice opens at Asaas; and how to cancel, as
 * it is today.
 */
export function SubscriptionFacts({ chargedCents, loss, locale, messages = defaultMessages }: SubscriptionFactsProps) {
  const text = messages.subscription.facts
  const id = useId()
  const facts = [format(text.chargedToday, { amount: planMoney(chargedCents, locale) }), lossOf(loss, text), text.renewal, text.invoice, text.cancel].filter((fact) => fact !== null)

  return (
    <section aria-labelledby={`${id}-title`} className="bg-muted/50 flex flex-col gap-3 rounded-lg p-4">
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-sm font-semibold">
        <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
        {text.title}
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </section>
  )
}

function lossOf(loss: SubscriptionLoss | null, text: UiMessages["subscription"]["facts"]): string | null {
  if (loss === null) return null
  if (loss.kind === "canceled") return text.canceledLoss
  if (loss.kind === "free") {
    if (loss.daysLeft > 1) return format(text.freeLossMany, { days: String(loss.daysLeft) })
    return loss.daysLeft === 1 ? text.freeLossOne : text.freeLossToday
  }
  if (loss.daysLeft > 1) return format(text.trialLossMany, { days: String(loss.daysLeft) })
  return loss.daysLeft === 1 ? text.trialLossOne : text.trialLossToday
}
