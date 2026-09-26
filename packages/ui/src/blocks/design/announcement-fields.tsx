"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { TargetFields } from "./target-fields"
import type { TargetOption, TargetValue } from "./target-fields"

/** What the strip has beyond its words: somewhere to go. */
export type AnnouncementValue = TargetValue

export interface AnnouncementFieldsProps {
  value: AnnouncementValue
  onChange: (next: Partial<AnnouncementValue>) => void
  categories: readonly TargetOption[]
  products: readonly TargetOption[]
  messages?: UiMessages
}

/**
 * The announcement strip's own field: where it leads. Its colour is its band's, asked in the Estilo
 * tab like every band's.
 *
 * The destination is the same question a banner's slide answers, asked by the same block, because
 * the strip is a poster too: "Frete grátis" that goes to the shipping category is worth more than
 * one that goes nowhere.
 */
export function AnnouncementFields({
  value,
  onChange,
  categories,
  products,
  messages = defaultMessages,
}: AnnouncementFieldsProps) {
  return (
    <TargetFields
      idPrefix="component"
      value={value}
      onChange={onChange}
      categories={categories}
      products={products}
      messages={messages}
    />
  )
}
