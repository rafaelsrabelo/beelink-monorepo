"use client"

// Libs
import { ImageIcon, RectangleEllipsisIcon } from "lucide-react"

// UI
import { FieldDescription, FieldLabel, FieldSet } from "@harness-monorepo/ui/components/field"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CategoryCardStyle } from "./design-types"

export interface CardStyleFieldProps {
  value: CategoryCardStyle
  onChange: (value: CategoryCardStyle) => void
  messages?: UiMessages
}

/**
 * How a categories block draws each card: the photo with the category's name, or the artwork alone.
 *
 * Single-select, as the alignment is: there is always exactly one answer. The line under it is the
 * style's own — the artwork's says what a category with no picture does and the file to make, which
 * is the only place a shopkeeper choosing it would look.
 */
export function CardStyleField({ value, onChange, messages = defaultMessages }: CardStyleFieldProps) {
  const text = messages.design.cardStyle

  return (
    <FieldSet>
      <FieldLabel>{text.label}</FieldLabel>
      <ToggleGroup
        multiple={false}
        aria-label={text.label}
        variant="outline"
        value={[value]}
        onValueChange={(next: string[]) => {
          const chosen = next[0]
          if (chosen === "PHOTO_WITH_NAME" || chosen === "ART_ONLY") onChange(chosen)
        }}
      >
        <ToggleGroupItem value="PHOTO_WITH_NAME">
          <RectangleEllipsisIcon aria-hidden="true" />
          {text.photoWithName}
        </ToggleGroupItem>
        <ToggleGroupItem value="ART_ONLY">
          <ImageIcon aria-hidden="true" />
          {text.artOnly}
        </ToggleGroupItem>
      </ToggleGroup>
      <FieldDescription>{value === "ART_ONLY" ? text.artOnlyHint : text.photoWithNameHint}</FieldDescription>
    </FieldSet>
  )
}
