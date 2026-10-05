"use client"

// React
import { useId, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { Switch } from "@harness-monorepo/ui/components/switch"
import { PAYMENT_INSTALLMENTS_MAX, type PaymentSettingsFormValues } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface PaymentSettingsFormProps {
  /** The choices, or `loading` while they are read: their place held as grey shapes. */
  value: PaymentSettingsFormValues | "loading"
  onChange: (value: PaymentSettingsFormValues) => void
  onSubmit: () => void
  /** Why what is chosen cannot be saved, in words: every way switched off. */
  issue?: string
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  /** The last save went through and nothing was changed since. */
  saved?: boolean
  messages?: UiMessages
}

const INSTALLMENTS = Array.from({ length: PAYMENT_INSTALLMENTS_MAX }, (_, at) => at + 1)

/**
 * How the shop is paid once its Asaas account is connected (BEELINK-203): Pix, credit card and in up
 * to how many instalments, and paying on delivery or at pickup — a switch each, with what each one
 * means for the customer and for the shop under it. The instalments show only while the card is on;
 * the number is kept either way, so switching the card back on brings the shop's choice with it.
 */
export function PaymentSettingsForm({ value, onChange, onSubmit, issue, pending = false, error, saved = false, messages = defaultMessages }: PaymentSettingsFormProps) {
  const text = messages.integrations.payments
  const id = useId()
  const ways = [
    { key: "pix", label: text.pix, hint: text.pixHint },
    { key: "card", label: text.card, hint: text.cardHint },
    { key: "offline", label: text.offline, hint: text.offlineHint },
  ] as const
  const upTo = (count: number) => (count === 1 ? text.installmentsOnce : format(text.installmentsUpTo, { count: String(count) }))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-6 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="font-semibold">
          {text.title}
        </h2>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </div>

      {value === "loading" ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-6">
          <span className="sr-only">{text.loading}</span>
          {ways.map((way) => (
            <div key={way.key} aria-hidden="true" className="flex items-start gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 max-w-md" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          ))}
          <Skeleton aria-hidden="true" className="h-8 w-20" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {ways.map((way) => (
              <div key={way.key} className="flex flex-col gap-3">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={`${id}-${way.key}`}>{way.label}</FieldLabel>
                    <FieldDescription id={`${id}-${way.key}-help`}>{way.hint}</FieldDescription>
                  </FieldContent>
                  <Switch
                    id={`${id}-${way.key}`}
                    checked={value[way.key]}
                    disabled={pending}
                    aria-describedby={`${id}-${way.key}-help`}
                    onCheckedChange={(on: boolean) => onChange({ ...value, [way.key]: on })}
                  />
                </Field>
                {way.key === "card" && value.card ? (
                  <Field className="max-w-md">
                    <FieldLabel htmlFor={`${id}-installments`}>{text.installments}</FieldLabel>
                    <Select value={String(value.maxInstallments)} onValueChange={(next: string | null) => next && onChange({ ...value, maxInstallments: Number(next) })} disabled={pending}>
                      <SelectTrigger id={`${id}-installments`} aria-describedby={`${id}-installments-help`} className="w-48">
                        <SelectValue>{(selected: string) => upTo(Number(selected))}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {INSTALLMENTS.map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {upTo(count)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription id={`${id}-installments-help`}>{text.installmentsHint}</FieldDescription>
                  </Field>
                ) : null}
              </div>
            ))}
          </div>

          {issue ? (
            <p role="alert" className="text-destructive text-sm">
              {issue}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? text.saving : text.save}
            </Button>
            {/* In the page before there is anything to say, so a reader hears the sentence arrive. */}
            <p aria-live="polite" className="text-sm">
              {error ? null : saved ? text.saved : null}
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </>
      )}
    </form>
  )
}
