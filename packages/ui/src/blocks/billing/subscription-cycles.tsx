"use client"

// React
import { useId } from "react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Field, FieldContent, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@harness-monorepo/ui/components/field"
import { RadioGroup, RadioGroupItem } from "@harness-monorepo/ui/components/radio-group"
import { planMoney, planPercent } from "@harness-monorepo/ui/lib/plan-figures"
import type { SubscriptionCycleValue, SubscriptionOfferView } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface SubscriptionCyclesProps {
  /** The cycles on sale, in the catalogue's order, their figures already worked out. */
  offers: readonly SubscriptionOfferView[]
  value: SubscriptionCycleValue
  onChange: (cycle: SubscriptionCycleValue) => void
  disabled?: boolean
  /** The screen's language: it decides how an amount is written. */
  locale: string
  messages?: UiMessages
}

/**
 * How a page's plan is paid (BEELINK-293): by the month, six months at once or the year, each a card
 * with what it comes to a month, what is paid today, what it saves against the month, and when it
 * renews. A radio group with a legend — `components/radio-group`, unlike the landing's native
 * radios: the panel is a script's page from the start, and arrows move between the cycles as in any
 * radio group.
 *
 * Each radio is named by its cycle alone and described by its figures, so a reader hears "Semestral"
 * and then what it costs, not every figure as the name of the choice.
 */
export function SubscriptionCycles({ offers, value, onChange, disabled = false, locale, messages = defaultMessages }: SubscriptionCyclesProps) {
  const text = messages.subscription.cycles
  const id = useId()
  const money = (cents: number) => planMoney(cents, locale)

  return (
    // `min-w-0`: a fieldset is as wide as its content by default, and would push a phone's page sideways.
    <FieldSet className="min-w-0">
      <FieldLegend id={`${id}-legend`}>{text.legend}</FieldLegend>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as SubscriptionCycleValue)}
        disabled={disabled}
        aria-labelledby={`${id}-legend`}
        className="grid gap-3 md:grid-cols-3"
      >
        {offers.map((offer) => {
          const key = `${id}-${offer.cycle}`
          return (
            <FieldLabel key={offer.cycle} htmlFor={key} className="bg-shell-surface">
              <Field orientation="horizontal" className="h-full">
                <FieldContent className="gap-1.5">
                  <FieldTitle id={`${key}-name`}>
                    {text.names[offer.cycle]}
                    {/* Drawn only: the figures say the saving in a sentence. */}
                    {offer.savingPercent > 0 ? (
                      <Badge variant="secondary" aria-hidden="true">
                        {format(text.savingBadge, { percent: planPercent(offer.savingPercent, locale) })}
                      </Badge>
                    ) : null}
                  </FieldTitle>
                  {/* `shell-muted`: on a chosen card's tint, `muted-foreground` is under 4.5:1. */}
                  <div id={`${key}-figures`} className="flex flex-col gap-1">
                    <p className="text-xl font-semibold tabular-nums">{format(text.perMonth, { amount: money(offer.monthlyCents) })}</p>
                    <p className="text-shell-muted text-sm">
                      {offer.cycle === "MONTHLY" ? text.billedMonthly : format(text.billedAtOnce, { total: money(offer.totalCents), months: String(offer.months) })}
                    </p>
                    {offer.savingCents > 0 ? (
                      <p className="text-sm font-medium">{format(text.saving, { amount: money(offer.savingCents), percent: planPercent(offer.savingPercent, locale) })}</p>
                    ) : null}
                    <p className="text-shell-muted text-sm">{offer.renewsOn ? format(text.renewsOn, { date: offer.renewsOn }) : text.renewsFromInvoice}</p>
                  </div>
                </FieldContent>
                <RadioGroupItem id={key} value={offer.cycle} aria-labelledby={`${key}-name`} aria-describedby={`${key}-figures`} />
              </Field>
            </FieldLabel>
          )
        })}
      </RadioGroup>
    </FieldSet>
  )
}
