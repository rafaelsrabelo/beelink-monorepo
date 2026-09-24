"use client"

// Libs
import { MonitorIcon, SmartphoneIcon } from "lucide-react"

// UI
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** The two widths the preview draws the shop at. */
export const PREVIEW_DEVICES = ["PHONE", "DESKTOP"] as const
export type PreviewDevice = (typeof PREVIEW_DEVICES)[number]

export interface PreviewDeviceToggleProps {
  value: PreviewDevice
  onChange: (value: PreviewDevice) => void
  messages?: UiMessages
}

/**
 * The shop as a phone gets it, or as a computer does. A glyph and a word on each, single-select so
 * one is always marked; the group is named for what it chooses.
 */
export function PreviewDeviceToggle({ value, onChange, messages = defaultMessages }: PreviewDeviceToggleProps) {
  const text = messages.design.previewDevice

  return (
    <ToggleGroup
      multiple={false}
      aria-label={text.label}
      variant="outline"
      size="sm"
      value={[value]}
      onValueChange={(next: string[]) => {
        const chosen = PREVIEW_DEVICES.find((device) => device === next[0])
        if (chosen) onChange(chosen)
      }}
    >
      <ToggleGroupItem value="PHONE">
        <SmartphoneIcon aria-hidden="true" className="size-4" />
        {text.phone}
      </ToggleGroupItem>
      <ToggleGroupItem value="DESKTOP">
        <MonitorIcon aria-hidden="true" className="size-4" />
        {text.desktop}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
