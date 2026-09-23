"use client"

// Libs
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from "lucide-react"

// UI
import { FieldLabel, FieldSet } from "@harness-monorepo/ui/components/field"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { TextAlign } from "./text-align"

export interface AlignFieldProps {
  value: TextAlign
  onChange: (value: TextAlign) => void
  disabled?: boolean
  messages?: UiMessages
}

/**
 * Left, centre or right, as three glyphs.
 *
 * A toggle group and not a select: alignment is chosen by looking at it, and the three glyphs say
 * what a word never has to. Single-select, so there is always exactly one answer — a form that
 * holds no alignment would have to invent one on save.
 */
export function AlignField({ value, onChange, disabled = false, messages = defaultMessages }: AlignFieldProps) {
  const text = messages.design

  return (
    <FieldSet>
      <FieldLabel>{text.alignLabel}</FieldLabel>
      <ToggleGroup
        multiple={false}
        aria-label={text.alignLabel}
        variant="outline"
        disabled={disabled}
        value={[value]}
        onValueChange={(next: string[]) => {
          const chosen = next[0]
          if (chosen === "LEFT" || chosen === "CENTER" || chosen === "RIGHT") onChange(chosen)
        }}
      >
        <ToggleGroupItem value="LEFT" aria-label={text.alignLeft}>
          <AlignLeftIcon aria-hidden="true" className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="CENTER" aria-label={text.alignCenter}>
          <AlignCenterIcon aria-hidden="true" className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="RIGHT" aria-label={text.alignRight}>
          <AlignRightIcon aria-hidden="true" className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </FieldSet>
  )
}
