"use client"

// React
import { useId } from "react"

// Libs
import { PlusIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { FieldDescription, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Label } from "@harness-monorepo/ui/components/label"
import { DELIVERY_BANDS_MAX, EMPTY_DELIVERY_BAND, type DeliveryBandFormRow, type DeliverySettingsIssues } from "@harness-monorepo/ui/lib/delivery"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DeliveryBandRowsProps {
  rows: readonly DeliveryBandFormRow[]
  onChange: (rows: DeliveryBandFormRow[]) => void
  /** A refusal by row, in words. */
  issues?: DeliverySettingsIssues["bands"]
  /** What each row gives, in words — "até 3 km: R$ 5,00, chega em 30–50 min" — or null while it does not read. */
  previews?: readonly (string | null)[]
  disabled?: boolean
  messages?: UiMessages
}

const FIELDS = [
  { key: "upToKm", label: "upTo", mode: "decimal", placeholder: "3" },
  { key: "fee", label: "fee", mode: "decimal", placeholder: "5,00" },
  { key: "windowFrom", label: "windowFrom", mode: "numeric", placeholder: "30" },
  { key: "windowTo", label: "windowTo", mode: "numeric", placeholder: "50" },
] as const satisfies readonly { key: keyof DeliveryBandFormRow; label: keyof UiMessages["delivery"]["bands"]; mode: string; placeholder: string }[]

/**
 * The shop's own delivery, band by band (BEELINK-177): how far, what it costs and when it arrives.
 * Each row says what it gives once it reads, or why it does not; the last one is the radius.
 */
export function DeliveryBandRows({ rows, onChange, issues = {}, previews = [], disabled = false, messages = defaultMessages }: DeliveryBandRowsProps) {
  const text = messages.delivery.bands
  const id = useId()
  const set = (at: number, patch: Partial<DeliveryBandFormRow>) => onChange(rows.map((row, index) => (index === at ? { ...row, ...patch } : row)))

  return (
    <FieldSet className="flex flex-col gap-3">
      <FieldLegend variant="label">{text.legend}</FieldLegend>
      <ol className="flex flex-col gap-3">
        {rows.map((row, at) => {
          const issue = issues[at]
          const note = issue ?? previews[at] ?? null
          return (
            <li key={at} className="border-shell-border flex flex-col gap-2 rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto] sm:items-end">
                {FIELDS.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <Label htmlFor={`${id}-${at}-${field.key}`} className="text-xs">
                      {text[field.label]}
                    </Label>
                    <Input
                      id={`${id}-${at}-${field.key}`}
                      inputMode={field.mode}
                      placeholder={field.placeholder}
                      value={row[field.key]}
                      disabled={disabled}
                      aria-invalid={issue ? true : undefined}
                      aria-describedby={note ? `${id}-${at}-note` : undefined}
                      onChange={(event) => set(at, { [field.key]: event.target.value })}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-2 justify-self-end sm:col-span-1"
                  disabled={disabled}
                  aria-label={format(text.remove, { index: String(at + 1) })}
                  onClick={() => onChange(rows.filter((_, index) => index !== at))}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </div>
              {note ? (
                <p id={`${id}-${at}-note`} className={issue ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
                  {note}
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={disabled || rows.length >= DELIVERY_BANDS_MAX} onClick={() => onChange([...rows, EMPTY_DELIVERY_BAND])}>
          <PlusIcon aria-hidden="true" />
          {text.add}
        </Button>
        <FieldDescription>{format(text.max, { max: String(DELIVERY_BANDS_MAX) })}</FieldDescription>
      </div>
    </FieldSet>
  )
}
