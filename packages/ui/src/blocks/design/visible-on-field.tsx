"use client"

// Libs
import { MonitorIcon, SmartphoneIcon } from "lucide-react"

// UI
import { FieldDescription, FieldLabel, FieldSet } from "@harness-monorepo/ui/components/field"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { DeviceVisibility } from "./design-types"

export interface VisibleOnFieldProps {
  value: DeviceVisibility
  onChange: (value: DeviceVisibility) => void
  messages?: UiMessages
}

type Screen = "DESKTOP" | "PHONE"

function screensOf(value: DeviceVisibility): Screen[] {
  return value === "ALL" ? ["DESKTOP", "PHONE"] : [value]
}

/**
 * Where a block shows: on the computer, on the phone, or both — two toggles and not a list of three,
 * because the question the owner asks is "does this show on the phone?", one screen at a time.
 *
 * The last one on stays on: a block shown nowhere is a hidden block, and hiding is Ocultar's, which
 * the structure and the bar already say. The hint under the field says so.
 */
export function VisibleOnField({ value, onChange, messages = defaultMessages }: VisibleOnFieldProps) {
  const text = messages.design.visibleOn
  const on = screensOf(value)

  return (
    <FieldSet>
      <FieldLabel>{text.label}</FieldLabel>
      <ToggleGroup
        multiple
        aria-label={text.label}
        variant="outline"
        value={on}
        onValueChange={(next: string[]) => {
          const screens = (["DESKTOP", "PHONE"] as const).filter((screen) => next.includes(screen))
          if (screens.length === 2) onChange("ALL")
          else if (screens[0]) onChange(screens[0])
        }}
      >
        <ToggleGroupItem value="DESKTOP" aria-disabled={on.length === 1 && on[0] === "DESKTOP"}>
          <MonitorIcon aria-hidden="true" />
          {text.desktop}
        </ToggleGroupItem>
        <ToggleGroupItem value="PHONE" aria-disabled={on.length === 1 && on[0] === "PHONE"}>
          <SmartphoneIcon aria-hidden="true" />
          {text.phone}
        </ToggleGroupItem>
      </ToggleGroup>
      <FieldDescription>{text.hint}</FieldDescription>
    </FieldSet>
  )
}
