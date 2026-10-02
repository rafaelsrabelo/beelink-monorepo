"use client"

// React
import { useId, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CashbackAdjustmentFormValues, CashbackAdjustmentIssues } from "@harness-monorepo/ui/lib/cashback"

export interface CashbackAdjustFormProps {
  value: CashbackAdjustmentFormValues
  onChange: (value: CashbackAdjustmentFormValues) => void
  onSubmit: () => void
  onCancel: () => void
  issues?: CashbackAdjustmentIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"

/**
 * The shopkeeper's correction of a customer's cashback (BEELINK-242): give or take, how much, and why
 * — the reason goes on the statement for good. Taking more than the customer has is the API's to
 * refuse: the balance never goes below zero.
 */
export function CashbackAdjustForm({ value, onChange, onSubmit, onCancel, issues = {}, pending = false, error, messages = defaultMessages }: CashbackAdjustFormProps) {
  const text = messages.cashback.adjust
  const id = useId()
  const set = (patch: Partial<CashbackAdjustmentFormValues>) => onChange({ ...value, ...patch })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs">
      <h3 id={`${id}-title`} className="text-sm font-semibold">
        {text.title}
      </h3>
      <FieldSet className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.direction}</FieldLegend>
        <ToggleGroup
          value={[value.direction]}
          onValueChange={(next: string[]) => {
            if (next[0] === "GIVE" || next[0] === "TAKE") set({ direction: next[0] })
          }}
          disabled={pending}
          className="flex-wrap"
        >
          <ToggleGroupItem value="GIVE" variant="outline" className={PRESSED}>
            {text.give}
          </ToggleGroupItem>
          <ToggleGroupItem value="TAKE" variant="outline" className={PRESSED}>
            {text.take}
          </ToggleGroupItem>
        </ToggleGroup>
      </FieldSet>
      <Field data-invalid={issues.amount ? true : undefined} className="max-w-64">
        <FieldLabel htmlFor={`${id}-amount`}>{text.amount}</FieldLabel>
        <Input
          id={`${id}-amount`}
          inputMode="decimal"
          placeholder="0,00"
          value={value.amount}
          disabled={pending}
          aria-invalid={issues.amount ? true : undefined}
          aria-describedby={issues.amount ? `${id}-amount-error` : undefined}
          onChange={(event) => set({ amount: event.target.value })}
        />
        <FieldError id={`${id}-amount-error`}>{issues.amount}</FieldError>
      </Field>
      <Field data-invalid={issues.reason ? true : undefined}>
        <FieldLabel htmlFor={`${id}-reason`}>{text.reason}</FieldLabel>
        <Textarea
          id={`${id}-reason`}
          rows={2}
          maxLength={200}
          placeholder={text.reasonPlaceholder}
          value={value.reason}
          disabled={pending}
          aria-invalid={issues.reason ? true : undefined}
          aria-describedby={issues.reason ? `${id}-reason-error` : undefined}
          onChange={(event) => set({ reason: event.target.value })}
        />
        <FieldError id={`${id}-reason-error`}>{issues.reason}</FieldError>
      </Field>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? text.submitting : text.submit}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          {text.cancel}
        </Button>
      </div>
    </form>
  )
}
