"use client"

// React
import { useId } from "react"

// UI
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateOption } from "@harness-monorepo/ui/lib/affiliate-money"
import { AffiliatePersonSelect } from "./affiliate-person-select"

export interface OrderAffiliateFieldProps {
  options: readonly AffiliateOption[]
  /** `""` is nobody. */
  value: string
  onChange: (affiliateId: string) => void
  disabled?: boolean
  messages?: UiMessages
}

/** The affiliate a sale registered in the panel came by (IMPULSEIA-107) — optional — in a section of the form. */
export function OrderAffiliateField({ options, value, onChange, disabled = false, messages = defaultMessages }: OrderAffiliateFieldProps) {
  const text = messages.affiliates.saleField
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-5 shadow-xs">
      <h2 id={`${id}-title`} className="font-semibold">
        {text.title}
      </h2>
      <Field>
        <FieldLabel htmlFor={`${id}-affiliate`}>{text.label}</FieldLabel>
        <AffiliatePersonSelect id={`${id}-affiliate`} options={options} value={value} nobodyLabel={text.nobody} disabled={disabled} describedBy={`${id}-help`} onChange={onChange} />
        <FieldDescription id={`${id}-help`}>{text.help}</FieldDescription>
      </Field>
    </section>
  )
}
