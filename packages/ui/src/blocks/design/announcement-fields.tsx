"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BandColourField } from "./band-colour-field"
import { TargetFields } from "./target-fields"
import type { TargetOption, TargetValue } from "./target-fields"

/** What the strip has beyond its words: a colour, and somewhere to go. */
export interface AnnouncementValue extends TargetValue {
  /** The strip's colour, which is its band's. `""` is "as it always was". */
  background: string
}

export interface AnnouncementFieldsProps {
  value: AnnouncementValue
  onChange: (next: Partial<AnnouncementValue>) => void
  /** What the page is painted, so turning the strip's colour on starts somewhere visible. */
  pageBackground: string
  categories: readonly TargetOption[]
  products: readonly TargetOption[]
  messages?: UiMessages
}

/**
 * The announcement strip's own fields: its colour and where it leads.
 *
 * The colour is its band's — the strip is the one component whose band is not drawn where it
 * sits, so the band's colour is asked for here, beside the words it paints. The destination is
 * the same question a banner's slide answers, asked by the same block, because the strip is a
 * poster too: "Frete grátis" that goes to the shipping category is worth more than one that goes
 * nowhere.
 */
export function AnnouncementFields({
  value,
  onChange,
  pageBackground,
  categories,
  products,
  messages = defaultMessages,
}: AnnouncementFieldsProps) {
  const text = messages.design

  return (
    <>
      <BandColourField
        id="component-background"
        value={value.background}
        onChange={(next) => onChange({ background: next })}
        pageBackground={pageBackground}
        label={text.announcementColour}
        noneLabel={text.announcementColourNone}
      />

      <TargetFields
        idPrefix="component"
        value={value}
        onChange={onChange}
        categories={categories}
        products={products}
        messages={messages}
      />
    </>
  )
}
