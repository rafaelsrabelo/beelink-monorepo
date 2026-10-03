"use client"

// React
import { useId, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { Switch } from "@harness-monorepo/ui/components/switch"
import { servicesByCompany, type ShippingServiceView, type ShippingSettingsFormValues, type ShippingSettingsIssues } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ShippingSettingsFormProps {
  value: ShippingSettingsFormValues
  onChange: (value: ShippingSettingsFormValues) => void
  onSubmit: () => void
  /** Melhor Envio's services: still being read, not readable now, or the list. */
  services: "loading" | "failed" | readonly ShippingServiceView[]
  issues?: ShippingSettingsIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  /** The last save went through and nothing was typed since. */
  saved?: boolean
  messages?: UiMessages
}

const PACKAGE_FIELDS = ["weight", "length", "width", "height"] as const

/**
 * How the shop ships by carrier (BEELINK-183): the services it offers at checkout, one switch each and
 * grouped by carrier; the days it takes to post; and the parcel used for a product with no size. Values
 * are what was typed; the screen reads them and refuses what does not hold, field by field.
 */
export function ShippingSettingsForm({ value, onChange, onSubmit, services, issues = {}, pending = false, error, saved = false, messages = defaultMessages }: ShippingSettingsFormProps) {
  const text = messages.integrations.shipping
  const id = useId()
  const set = (patch: Partial<ShippingSettingsFormValues>) => onChange({ ...value, ...patch })
  const labels = { weight: text.weight, length: text.length, width: text.width, height: text.height }

  function toggle(serviceId: number, on: boolean) {
    set({ serviceIds: on ? [...value.serviceIds, serviceId].sort((a, b) => a - b) : value.serviceIds.filter((each) => each !== serviceId) })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-6 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="font-semibold">
        {text.title}
      </h2>

      <FieldSet className="flex flex-col gap-3">
        <FieldLegend variant="label">{text.services}</FieldLegend>
        <FieldDescription>{text.servicesHint}</FieldDescription>
        {services === "loading" ? (
          <div aria-hidden="true" className="flex flex-col gap-2">
            {[0, 1, 2].map((at) => (
              <Skeleton key={at} className="h-6 max-w-48" />
            ))}
          </div>
        ) : services === "failed" ? (
          <p className="text-sm">{text.servicesFailed}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {servicesByCompany(services).map((group) => (
              <div key={group.company} role="group" aria-labelledby={`${id}-${group.company}`} className="flex flex-col gap-2">
                <p id={`${id}-${group.company}`} className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {group.company}
                </p>
                {group.services.map((service) => (
                  <Field key={service.id} orientation="horizontal">
                    <Switch
                      id={`${id}-service-${service.id}`}
                      checked={value.serviceIds.includes(service.id)}
                      disabled={pending}
                      onCheckedChange={(on: boolean) => toggle(service.id, on)}
                    />
                    <FieldLabel htmlFor={`${id}-service-${service.id}`}>{service.name}</FieldLabel>
                  </Field>
                ))}
              </div>
            ))}
          </div>
        )}
      </FieldSet>

      <Field data-invalid={issues.handlingDays ? true : undefined} className="max-w-48">
        <FieldLabel htmlFor={`${id}-days`}>{text.handlingDays}</FieldLabel>
        <Input
          id={`${id}-days`}
          inputMode="numeric"
          placeholder="1"
          value={value.handlingDays}
          disabled={pending}
          aria-invalid={issues.handlingDays ? true : undefined}
          aria-describedby={`${id}-days-${issues.handlingDays ? "error" : "help"}`}
          onChange={(event) => set({ handlingDays: event.target.value })}
        />
        {issues.handlingDays ? <FieldError id={`${id}-days-error`}>{issues.handlingDays}</FieldError> : <FieldDescription id={`${id}-days-help`}>{text.handlingDaysHint}</FieldDescription>}
      </Field>

      <FieldSet data-invalid={issues.package ? true : undefined} className="flex flex-col gap-3">
        <FieldLegend variant="label">{text.package}</FieldLegend>
        <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
          {PACKAGE_FIELDS.map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={`${id}-${key}`} className="text-xs">
                {labels[key]}
              </FieldLabel>
              <Input
                id={`${id}-${key}`}
                inputMode="decimal"
                value={value[key]}
                disabled={pending}
                aria-invalid={issues.package ? true : undefined}
                aria-describedby={`${id}-package-${issues.package ? "error" : "help"}`}
                onChange={(event) => set({ [key]: event.target.value })}
              />
            </Field>
          ))}
        </div>
        <FieldContent>
          {issues.package ? <FieldError id={`${id}-package-error`}>{issues.package}</FieldError> : <FieldDescription id={`${id}-package-help`}>{text.packageHint}</FieldDescription>}
        </FieldContent>
      </FieldSet>

      <FieldSet className="flex flex-col gap-3">
        <FieldLegend variant="label">{text.sender}</FieldLegend>
        <FieldDescription>{text.senderHint}</FieldDescription>
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <Field data-invalid={issues.senderDocument ? true : undefined}>
            <FieldLabel htmlFor={`${id}-document`}>{text.senderDocument}</FieldLabel>
            <Input
              id={`${id}-document`}
              inputMode="numeric"
              autoComplete="off"
              value={value.senderDocument}
              disabled={pending}
              aria-invalid={issues.senderDocument ? true : undefined}
              aria-describedby={issues.senderDocument ? `${id}-document-error` : undefined}
              onChange={(event) => set({ senderDocument: event.target.value })}
            />
            {issues.senderDocument ? <FieldError id={`${id}-document-error`}>{issues.senderDocument}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-register`}>{text.senderStateRegister}</FieldLabel>
            <Input id={`${id}-register`} autoComplete="off" value={value.senderStateRegister} disabled={pending} aria-describedby={`${id}-register-help`} onChange={(event) => set({ senderStateRegister: event.target.value })} />
            <FieldDescription id={`${id}-register-help`}>{text.senderStateRegisterHint}</FieldDescription>
          </Field>
        </div>
      </FieldSet>

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
    </form>
  )
}
