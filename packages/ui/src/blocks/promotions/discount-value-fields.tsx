"use client"

// React
import { useId } from "react"

// UI
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CouponKindValue } from "@harness-monorepo/ui/lib/discount-form"

export interface DiscountKindOption<K extends CouponKindValue> {
  value: K
  label: string
}

export interface DiscountValueFieldsProps<K extends CouponKindValue> {
  /** The kinds this form offers: a promotion has two, a coupon a third that carries no value. */
  kinds: readonly DiscountKindOption<K>[]
  kind: K
  percent: string
  amount: string
  onChange: (patch: { kind?: K; percent?: string; amount?: string }) => void
  issues?: { percent?: string; amount?: string }
  /** What a fixed amount is taken off, said under its field. */
  amountHelp?: string
  disabled?: boolean
  messages?: UiMessages
}

/** The primitive's pressed grey is lost against the panel's surface; a choice has to read as chosen. */
const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"

/**
 * How much comes off: the kind, said rather than guessed from the size of a number, and the one
 * value that kind carries — a percentage or an amount in reais. A kind with no value shows none.
 */
export function DiscountValueFields<K extends CouponKindValue>({ kinds, kind, percent, amount, onChange, issues = {}, amountHelp, disabled = false, messages = defaultMessages }: DiscountValueFieldsProps<K>) {
  const text = messages.discounts
  const id = useId()

  return (
    <div className="flex flex-col gap-4">
      <FieldSet className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.kindLabel}</FieldLegend>
        <ToggleGroup
          value={[kind]}
          // Pressing the chosen one again would leave none; a discount always has a kind.
          onValueChange={(next: string[]) => {
            const chosen = kinds.find((option) => option.value === next[0])
            if (chosen) onChange({ kind: chosen.value })
          }}
          disabled={disabled}
          className="flex-wrap"
        >
          {kinds.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} variant="outline" className={PRESSED}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>

      {kind === "PERCENT" ? (
        <Field data-invalid={issues.percent ? true : undefined} className="max-w-48">
          <FieldLabel htmlFor={`${id}-percent`}>{text.percentLabel}</FieldLabel>
          <Input
            id={`${id}-percent`}
            inputMode="decimal"
            placeholder="10"
            value={percent}
            disabled={disabled}
            aria-invalid={issues.percent ? true : undefined}
            aria-describedby={issues.percent ? `${id}-percent-error` : undefined}
            onChange={(event) => onChange({ percent: event.target.value })}
          />
          <FieldError id={`${id}-percent-error`}>{issues.percent}</FieldError>
        </Field>
      ) : null}

      {kind === "FIXED" ? (
        <Field data-invalid={issues.amount ? true : undefined} className="max-w-64">
          <FieldLabel htmlFor={`${id}-amount`}>{text.amountLabel}</FieldLabel>
          <Input
            id={`${id}-amount`}
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            disabled={disabled}
            aria-invalid={issues.amount ? true : undefined}
            aria-describedby={issues.amount ? `${id}-amount-error` : amountHelp ? `${id}-amount-help` : undefined}
            onChange={(event) => onChange({ amount: event.target.value })}
          />
          {issues.amount ? <FieldError id={`${id}-amount-error`}>{issues.amount}</FieldError> : amountHelp ? <FieldDescription id={`${id}-amount-help`}>{amountHelp}</FieldDescription> : null}
        </Field>
      ) : null}
    </div>
  )
}
