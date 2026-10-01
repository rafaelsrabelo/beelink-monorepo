"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CouponFormIssues, CouponFormValues } from "@harness-monorepo/ui/lib/discount-form"
import { DiscountPeriodFields } from "./discount-period-fields"
import { DiscountValueFields } from "./discount-value-fields"

export interface CouponFormProps {
  value: CouponFormValues
  onChange: (value: CouponFormValues) => void
  issues?: CouponFormIssues
  /** A refusal of the whole save, already a sentence. */
  error?: string
  onSubmit: () => void
  onCancel: () => void
  pending?: boolean
  messages?: UiMessages
}

/**
 * One coupon as its owner fills it in: the code a customer will type, what it gives — a share, an
 * amount or a free delivery — what it asks of the cart, for how long, and how many times it may be
 * used in all and by one customer. Every limit left blank is no limit.
 */
export function CouponForm({ value, onChange, issues = {}, error, onSubmit, onCancel, pending = false, messages = defaultMessages }: CouponFormProps) {
  const shared = messages.discounts
  const text = shared.coupons
  const set = (patch: Partial<CouponFormValues>) => onChange({ ...value, ...patch })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-6"
    >
      <Field data-invalid={issues.code ? true : undefined} className="max-w-sm">
        <FieldLabel htmlFor="coupon-code">{text.codeLabel}</FieldLabel>
        <Input
          id="coupon-code"
          value={value.code}
          maxLength={30}
          placeholder="BEMVINDO10"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase"
          disabled={pending}
          aria-invalid={issues.code ? true : undefined}
          onChange={(event) => set({ code: event.target.value })}
        />
        <FieldDescription>{text.codeHelp}</FieldDescription>
        <FieldError>{issues.code}</FieldError>
      </Field>

      <DiscountValueFields
        kinds={[
          { value: "PERCENT", label: shared.kindPercent },
          { value: "FIXED", label: shared.kindFixed },
          { value: "FREE_SHIPPING", label: text.kindFreeShipping },
        ]}
        kind={value.kind}
        percent={value.percent}
        amount={value.amount}
        onChange={set}
        issues={issues}
        disabled={pending}
        messages={messages}
      />

      <Field data-invalid={issues.minSubtotal ? true : undefined} className="max-w-64">
        <FieldLabel htmlFor="coupon-minimum">{text.minSubtotalLabel}</FieldLabel>
        <Input id="coupon-minimum" inputMode="decimal" placeholder="0,00" value={value.minSubtotal} disabled={pending} aria-invalid={issues.minSubtotal ? true : undefined} onChange={(event) => set({ minSubtotal: event.target.value })} />
        <FieldDescription>{text.minSubtotalHelp}</FieldDescription>
        <FieldError>{issues.minSubtotal}</FieldError>
      </Field>

      <DiscountPeriodFields startsAt={value.startsAt} endsAt={value.endsAt} onChange={set} issues={issues} disabled={pending} messages={messages} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={issues.maxUses ? true : undefined}>
          <FieldLabel htmlFor="coupon-max-uses">{text.maxUsesLabel}</FieldLabel>
          <Input id="coupon-max-uses" inputMode="numeric" value={value.maxUses} disabled={pending} aria-invalid={issues.maxUses ? true : undefined} onChange={(event) => set({ maxUses: event.target.value })} />
          <FieldDescription>{text.maxUsesHelp}</FieldDescription>
          <FieldError>{issues.maxUses}</FieldError>
        </Field>
        <Field data-invalid={issues.maxUsesPerCustomer ? true : undefined}>
          <FieldLabel htmlFor="coupon-max-per-customer">{text.maxUsesPerCustomerLabel}</FieldLabel>
          <Input
            id="coupon-max-per-customer"
            inputMode="numeric"
            value={value.maxUsesPerCustomer}
            disabled={pending}
            aria-invalid={issues.maxUsesPerCustomer ? true : undefined}
            onChange={(event) => set({ maxUsesPerCustomer: event.target.value })}
          />
          <FieldDescription>{text.maxUsesPerCustomerHelp}</FieldDescription>
          <FieldError>{issues.maxUsesPerCustomer}</FieldError>
        </Field>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {shared.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {shared.cancel}
        </Button>
      </div>
    </form>
  )
}
