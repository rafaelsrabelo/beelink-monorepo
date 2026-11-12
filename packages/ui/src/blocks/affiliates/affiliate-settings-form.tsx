"use client"

// React
import { useId, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Switch } from "@harness-monorepo/ui/components/switch"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePayoutRowView, AffiliateSettingsFormValues, AffiliateSettingsIssues } from "@harness-monorepo/ui/lib/affiliates"
import { AffiliatePayoutCalendar } from "./affiliate-payout-calendar"

export interface AffiliateSettingsFormProps {
  value: AffiliateSettingsFormValues
  onChange: (value: AffiliateSettingsFormValues) => void
  onSubmit: () => void
  issues?: AffiliateSettingsIssues
  /** The month's periods at the delay as typed, worked out by the screen. */
  calendar: readonly AffiliatePayoutRowView[]
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  /** The last save went through and nothing was typed since. */
  saved?: boolean
  messages?: UiMessages
}

/**
 * The shop's affiliate programme (IMPULSEIA-102): the switch, how long a visit through a link counts,
 * how long after a period closes it is paid — with the month's calendar under it, following the field
 * — and the terms an affiliate accepts. Values are what was typed; the screen reads them, refuses
 * what does not hold field by field, and says why the API refused.
 */
export function AffiliateSettingsForm({ value, onChange, onSubmit, issues = {}, calendar, pending = false, error, saved = false, messages = defaultMessages }: AffiliateSettingsFormProps) {
  const text = messages.affiliates.settings
  const id = useId()
  const set = (patch: Partial<AffiliateSettingsFormValues>) => onChange({ ...value, ...patch })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  /** A whole number of days, its refusal said under it and named by it. */
  function days(key: "attributionDays" | "payoutDelayDays", label: string, help: string, placeholder: string) {
    const issue = issues[key]
    return (
      <Field data-invalid={issue ? true : undefined} className="max-w-md">
        <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
        <div className="flex max-w-48 items-center gap-2">
          <Input
            id={`${id}-${key}`}
            inputMode="numeric"
            placeholder={placeholder}
            value={value[key]}
            disabled={pending}
            aria-invalid={issue ? true : undefined}
            aria-describedby={`${id}-${key}-${issue ? "error" : "help"}`}
            onChange={(event) => set({ [key]: event.target.value })}
          />
          <span className="text-muted-foreground text-sm">{text.days}</span>
        </div>
        {issue ? <FieldError id={`${id}-${key}-error`}>{issue}</FieldError> : <FieldDescription id={`${id}-${key}-help`}>{help}</FieldDescription>}
      </Field>
    )
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-5 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="font-semibold">
        {text.title}
      </h2>

      <Field orientation="horizontal">
        <Switch id={`${id}-enabled`} checked={value.enabled} disabled={pending} aria-describedby={`${id}-enabled-help`} onCheckedChange={(enabled: boolean) => set({ enabled })} />
        <FieldContent>
          <FieldLabel htmlFor={`${id}-enabled`}>{text.enabled}</FieldLabel>
          <FieldDescription id={`${id}-enabled-help`}>{text.enabledHelp}</FieldDescription>
        </FieldContent>
      </Field>
      <p className="text-muted-foreground text-sm">{text.price}</p>

      {days("attributionDays", text.attributionDays, text.attributionDaysHelp, "30")}
      {days("payoutDelayDays", text.payoutDelay, text.payoutDelayHelp, "10")}
      <AffiliatePayoutCalendar rows={calendar} messages={messages} />

      <Field data-invalid={issues.termsText ? true : undefined}>
        <FieldLabel htmlFor={`${id}-terms`}>{text.terms}</FieldLabel>
        <Textarea
          id={`${id}-terms`}
          rows={6}
          value={value.termsText}
          disabled={pending}
          aria-invalid={issues.termsText ? true : undefined}
          aria-describedby={`${id}-terms-${issues.termsText ? "error" : "help"}`}
          onChange={(event) => set({ termsText: event.target.value })}
        />
        {issues.termsText ? <FieldError id={`${id}-terms-error`}>{issues.termsText}</FieldError> : <FieldDescription id={`${id}-terms-help`}>{text.termsHelp}</FieldDescription>}
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? text.saving : text.save}
        </Button>
        {/* In the page before there is anything to say, so a reader hears the answer arrive. */}
        <p aria-live="polite" className={error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
          {error ?? (saved ? text.saved : null)}
        </p>
      </div>
    </form>
  )
}
