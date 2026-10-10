"use client"

// React
import { useId, type FormEvent, type ReactNode } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Switch } from "@harness-monorepo/ui/components/switch"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CashbackSettingsFormValues, CashbackSettingsIssues } from "@harness-monorepo/ui/lib/cashback"

export interface CashbackSettingsFormProps {
  value: CashbackSettingsFormValues
  onChange: (value: CashbackSettingsFormValues) => void
  onSubmit: () => void
  issues?: CashbackSettingsIssues
  /** What the rules as typed would give on an order of R$ 100,00, in words; worked out by the screen. */
  example: string
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  /** The last save went through and nothing was typed since. */
  saved?: boolean
  /** The way to the products, said under "by product": where each rate is typed. The screen's own link. */
  productsLink?: ReactNode
  messages?: UiMessages
}

/** The primitive's pressed grey is lost against the panel's surface; a choice has to read as chosen. */
const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"

/**
 * The shop's cashback rules (BEELINK-242): the switch, one rate or each product's own (BEELINK-313), how much comes back, how long it lasts, the
 * smallest order that earns and how much of an order credit may pay — with what that gives on an
 * order of R$ 100,00, so the shopkeeper sees the rule before saving it. Values are what was typed;
 * the screen reads them, refuses what does not hold field by field, and says why the API refused.
 */
export function CashbackSettingsForm({ value, onChange, onSubmit, issues = {}, example, pending = false, error, saved = false, productsLink, messages = defaultMessages }: CashbackSettingsFormProps) {
  const text = messages.cashback.settings
  const id = useId()
  const set = (patch: Partial<CashbackSettingsFormValues>) => onChange({ ...value, ...patch })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  /** A typed amount or percentage, its refusal said under it and named by it. */
  function typed(key: "rate" | "minimum" | "maxRedeem", label: string, help: string, placeholder: string) {
    const issue = issues[key]
    return (
      <Field data-invalid={issue ? true : undefined} className="max-w-64">
        <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
        <Input
          id={`${id}-${key}`}
          inputMode="decimal"
          placeholder={placeholder}
          value={value[key]}
          disabled={pending}
          aria-invalid={issue ? true : undefined}
          aria-describedby={`${id}-${key}-${issue ? "error" : "help"}`}
          onChange={(event) => set({ [key]: event.target.value })}
        />
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

      <FieldSet className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.mode}</FieldLegend>
        <ToggleGroup
          value={[value.mode]}
          onValueChange={(next: string[]) => {
            if (next[0] === "STORE" || next[0] === "PRODUCT") set({ mode: next[0] })
          }}
          disabled={pending}
          className="flex-wrap"
        >
          <ToggleGroupItem value="STORE" variant="outline" className={PRESSED}>
            {text.modeStore}
          </ToggleGroupItem>
          <ToggleGroupItem value="PRODUCT" variant="outline" className={PRESSED}>
            {text.modeProduct}
          </ToggleGroupItem>
        </ToggleGroup>
        {value.mode === "PRODUCT" ? (
          <p className="text-muted-foreground text-sm">
            {text.modeProductHelp} {productsLink}
          </p>
        ) : null}
      </FieldSet>

      {/* By product the one rate is not asked for; what was typed stays, for the day the shop comes back. */}
      {value.mode === "STORE" ? typed("rate", text.rate, text.rateHelp, "5") : null}

      <FieldSet className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.validity}</FieldLegend>
        <ToggleGroup
          value={[value.validity]}
          // Pressing the chosen one again would leave none; a rule always says one or the other.
          onValueChange={(next: string[]) => {
            if (next[0] === "NONE" || next[0] === "DAYS") set({ validity: next[0] })
          }}
          disabled={pending}
          className="flex-wrap"
        >
          <ToggleGroupItem value="NONE" variant="outline" className={PRESSED}>
            {text.validityNone}
          </ToggleGroupItem>
          <ToggleGroupItem value="DAYS" variant="outline" className={PRESSED}>
            {text.validityDays}
          </ToggleGroupItem>
        </ToggleGroup>
        {value.validity === "DAYS" ? (
          <Field data-invalid={issues.validityDays ? true : undefined} className="max-w-48">
            <FieldLabel htmlFor={`${id}-days`} className="sr-only">
              {`${text.validityDays} (${text.days})`}
            </FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id={`${id}-days`}
                inputMode="numeric"
                placeholder="90"
                value={value.validityDays}
                disabled={pending}
                aria-invalid={issues.validityDays ? true : undefined}
                aria-describedby={issues.validityDays ? `${id}-days-error` : undefined}
                onChange={(event) => set({ validityDays: event.target.value })}
              />
              <span className="text-muted-foreground text-sm">{text.days}</span>
            </div>
            <FieldError id={`${id}-days-error`}>{issues.validityDays}</FieldError>
          </Field>
        ) : null}
      </FieldSet>

      {typed("minimum", text.minimum, text.minimumHelp, "0,00")}
      {typed("maxRedeem", text.maxRedeem, text.maxRedeemHelp, "100")}

      <p className="bg-muted rounded-lg px-3 py-2 text-sm">{example}</p>

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
