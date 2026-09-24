"use client"

// Libs
import { GalleryHorizontalEndIcon, GalleryHorizontalIcon, LayoutGridIcon, type LucideIcon } from "lucide-react"

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
  /** The two the block's kind draws, in the order offered. A banner's when none are named. */
  options?: readonly ComponentDisplay[]
  disabled?: boolean
  messages?: UiMessages
}

const ICONS: Record<ComponentDisplay, LucideIcon> = {
  CAROUSEL: GalleryHorizontalIcon,
  GRID: LayoutGridIcon,
  RAIL: GalleryHorizontalEndIcon,
}

/**
 * How a block lays out what it holds, from the formats its kind draws: a banner's pictures one at a
 * time or side by side, a showcase's products or the categories on a rail or in rows.
 *
 * The count of pictures used to decide a banner's without asking: a second picture silently turned
 * it into a carousel, and three posters meant for one row could only be three banners. Asked here
 * instead, and the answer stands whatever the count.
 *
 * A glyph and a word on each, because "grade" alone does not say which way things go.
 * Single-select, so a block always has one.
 */
export function DisplayField({
  value,
  onChange,
  options = ["CAROUSEL", "GRID"],
  disabled = false,
  messages = defaultMessages,
}: DisplayFieldProps) {
  const text = messages.design
  const labels: Record<ComponentDisplay, string> = {
    CAROUSEL: text.displayCarousel,
    GRID: text.displayGrid,
    RAIL: text.displayRail,
  }

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
          const chosen = options.find((option) => option === next[0])
          if (chosen) onChange(chosen)
        }}
      >
        {options.map((option) => {
          const Icon = ICONS[option]

          return (
            <ToggleGroupItem key={option} value={option}>
              <Icon aria-hidden="true" className="size-4" />
              {labels[option]}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </FieldSet>
  )
}
