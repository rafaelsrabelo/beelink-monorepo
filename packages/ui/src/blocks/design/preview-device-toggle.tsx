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
  /** `header` draws it on the editor's dark bar, in the header's own tokens. */
  tone?: "default" | "header"
  messages?: UiMessages
}

/** On the dark bar: the chosen device filled light, so which one it is reads at a glance. */
const HEADER_ITEM =
  "h-9 border-header-border text-header-foreground hover:bg-header-field-hover hover:text-header-foreground aria-pressed:bg-header-foreground aria-pressed:text-header aria-pressed:hover:bg-header-foreground/90 aria-pressed:hover:text-header"

/**
 * The shop as a phone gets it, or as a computer does. A glyph and a word on each, single-select so
 * one is always marked; the group is named for what it chooses.
 */
export function PreviewDeviceToggle({
  value,
  onChange,
  tone = "default",
  messages = defaultMessages,
}: PreviewDeviceToggleProps) {
  const text = messages.design.previewDevice
  const item = tone === "header" ? HEADER_ITEM : undefined
  // On the bar, a phone keeps the icons and the words go to the screen reader: the bar has to fit.
  const word = tone === "header" ? "sr-only sm:not-sr-only" : undefined

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
      <ToggleGroupItem value="PHONE" className={item}>
        <SmartphoneIcon aria-hidden="true" className="size-4" />
        <span className={word}>{text.phone}</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="DESKTOP" className={item}>
        <MonitorIcon aria-hidden="true" className="size-4" />
        <span className={word}>{text.desktop}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
