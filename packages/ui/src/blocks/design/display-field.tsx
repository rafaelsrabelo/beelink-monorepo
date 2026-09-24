"use client"

// Libs
import { GalleryHorizontalIcon, LayoutGridIcon } from "lucide-react"

// UI
import { FieldLabel, FieldSet } from "@harness-monorepo/ui/components/field"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ComponentDisplay } from "./design-types"

export interface DisplayFieldProps {
  value: ComponentDisplay
  onChange: (value: ComponentDisplay) => void
  disabled?: boolean
  messages?: UiMessages
}

/**
 * A banner's pictures one at a time, or all of them side by side.
 *
 * The count of pictures used to decide this without asking: a second picture silently turned a
 * banner into a carousel, and three posters meant for one row could only be three banners. Asked
 * here instead, and the answer stands whatever the count — a grid of one is the same card a
 * carousel of one is.
 *
 * A glyph and a word on each, because "grade" alone does not say which way the pictures go.
 * Single-select, so a banner always has one.
 */
export function DisplayField({ value, onChange, disabled = false, messages = defaultMessages }: DisplayFieldProps) {
  const text = messages.design

  return (
    <FieldSet>
      <FieldLabel>{text.displayLabel}</FieldLabel>
      <ToggleGroup
        multiple={false}
        aria-label={text.displayLabel}
        variant="outline"
        disabled={disabled}
        value={[value]}
        onValueChange={(next: string[]) => {
          const chosen = next[0]
          if (chosen === "CAROUSEL" || chosen === "GRID") onChange(chosen)
        }}
      >
        <ToggleGroupItem value="CAROUSEL">
          <GalleryHorizontalIcon aria-hidden="true" className="size-4" />
          {text.displayCarousel}
        </ToggleGroupItem>
        <ToggleGroupItem value="GRID">
          <LayoutGridIcon aria-hidden="true" className="size-4" />
          {text.displayGrid}
        </ToggleGroupItem>
      </ToggleGroup>
    </FieldSet>
  )
}
