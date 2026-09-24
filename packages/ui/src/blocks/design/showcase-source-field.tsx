"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { PRODUCT_SOURCES, type ProductSource } from "./design-types"

export interface ShowcaseSourceFieldProps {
  value: ProductSource
  onChange: (value: ProductSource) => void
  messages?: UiMessages
}

/**
 * Where a showcase's products come from, and one sentence under it saying what that draws — "em
 * promoção" alone does not say that a product needs a "was" price to be in it.
 */
export function ShowcaseSourceField({ value, onChange, messages = defaultMessages }: ShowcaseSourceFieldProps) {
  const text = messages.design.showcase

  return (
    <Field>
      <FieldLabel htmlFor="showcase-source">{text.sourceLabel}</FieldLabel>
      <FieldContent>
        <Select
          value={value}
          onValueChange={(next: string | null) => {
            const chosen = PRODUCT_SOURCES.find((source) => source === next)
            if (chosen) onChange(chosen)
          }}
        >
          <SelectTrigger id="showcase-source">
            <SelectValue>{(selected: ProductSource) => text.sources[selected]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {text.sources[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>{text.sourceHints[value]}</FieldDescription>
      </FieldContent>
    </Field>
  )
}
