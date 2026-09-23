"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreColorField } from "../store/store-color-field"
import type { StoreColors } from "../store/store-types"

export interface DesignColorPreset {
  id: string
  name: string
  colors: StoreColors
}

export interface DesignColorsProps {
  value: StoreColors
  onChange: (colors: StoreColors) => void
  presets?: readonly DesignColorPreset[]
  pending?: boolean
  disabled?: boolean
  onSave?: () => void
  /** True while the draft differs from what the shop has. Nothing to save otherwise. */
  dirty?: boolean
  messages?: UiMessages
}

/**
 * The shop's palette, edited beside its own page.
 *
 * Three surfaces and the brand, and no ink among them: every word on the shop window is derived
 * from what it sits on, so a picker for the text would be a control able to write black on black.
 * That was a real state a shopkeeper could reach, and this is what removed it.
 *
 * It is a panel and not a block. A colour has no position on the page — it is not something the
 * arrangement can put before or after anything else — so it sits beside the list rather than in it.
 */
export function DesignColors({
  value,
  onChange,
  presets = [],
  pending = false,
  disabled = false,
  onSave,
  dirty = false,
  messages = defaultMessages,
}: DesignColorsProps) {
  const text = messages.store.appearance
  const design = messages.design
  const set = (key: keyof StoreColors, color: string) => onChange({ ...value, [key]: color })

  return (
    <div className="flex flex-col gap-4">
      {presets.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{text.presetsLabel}</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={disabled || pending}
                onClick={() => onChange(preset.colors)}
                // Named for a screen reader, which cannot see a row of coloured dots at all.
                aria-label={preset.name}
                title={preset.name}
                className={cn(
                  "border-border flex size-9 items-center justify-center rounded-full border",
                  "focus-visible:ring-ring outline-none focus-visible:ring-2",
                  "disabled:opacity-50",
                )}
                style={{ backgroundColor: preset.colors.primary }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <StoreColorField
        id="design-color-background"
        label={text.backgroundLabel}
        pickerSuffix={text.colorPickerSuffix}
        value={value.background}
        disabled={disabled || pending}
        onChange={(color) => set("background", color)}
      />
      <StoreColorField
        id="design-color-primary"
        label={text.primaryLabel}
        pickerSuffix={text.colorPickerSuffix}
        value={value.primary}
        disabled={disabled || pending}
        onChange={(color) => set("primary", color)}
      />
      <StoreColorField
        id="design-color-header"
        label={text.headerLabel}
        pickerSuffix={text.colorPickerSuffix}
        value={value.header}
        disabled={disabled || pending}
        onChange={(color) => set("header", color)}
      />
      <StoreColorField
        id="design-color-footer"
        label={text.footerLabel}
        pickerSuffix={text.colorPickerSuffix}
        value={value.footer}
        disabled={disabled || pending}
        onChange={(color) => set("footer", color)}
      />

      <p className="text-muted-foreground text-xs">{design.colorsHint}</p>

      {onSave ? (
        <Button type="button" disabled={!dirty || pending || disabled} onClick={onSave}>
          {pending ? design.publishing : design.saveColors}
        </Button>
      ) : null}
    </div>
  )
}
