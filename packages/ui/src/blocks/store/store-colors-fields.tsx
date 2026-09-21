"use client"

// React
import type { CSSProperties } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreColorField } from "./store-color-field"
import { StoreColorPreview } from "./store-color-preview"
import type { FieldIssues, StoreColorPreset, StoreColors } from "./store-types"

export interface StoreColorsFieldsProps {
  value: StoreColors
  onChange: (value: StoreColors) => void
  errors?: FieldIssues<StoreColors>
  /**
   * Palettes applied in one click. Both the names and the colours are the screen's — a name is copy
   * and a colour is a row of the database — which is why a preset row can exist here without this
   * package holding a single colour of its own.
   */
  presets?: StoreColorPreset[]
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The shop's four brand colours: six ready-made palettes, the four pickers, and what they look
 * like together. Every colour on screen arrives as data and is rendered through an inline custom
 * property, exactly as the storefront renders a shop's theme.
 */
export function StoreColorsFields({
  value,
  onChange,
  errors,
  presets = [],
  disabled = false,
  messages = defaultMessages,
}: StoreColorsFieldsProps) {
  const text = messages.store.appearance
  const setColor = (key: keyof StoreColors, color: string) => onChange({ ...value, [key]: color })

  return (
    <FieldSet>
      <FieldLegend variant="label">{text.colorsLegend}</FieldLegend>
      <FieldDescription>{text.colorsHint}</FieldDescription>

      {presets.length > 0 ? (
        <Field>
          <FieldTitle>{text.presetsLabel}</FieldTitle>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => onChange(preset.colors)}
              >
                <span aria-hidden="true" className="flex gap-0.5">
                  {[preset.colors.header, preset.colors.primary, preset.colors.background].map(
                    (color, index) => (
                      <span
                        key={index}
                        className="size-3 rounded-full border border-border bg-(--store-swatch)"
                        style={{ "--store-swatch": color } as CSSProperties}
                      />
                    ),
                  )}
                </span>
                {preset.name}
              </Button>
            ))}
          </div>
        </Field>
      ) : null}

      <div className="grid gap-4 @md/main:grid-cols-2">
        <StoreColorField
          id="store-color-background"
          label={text.backgroundLabel}
          pickerSuffix={text.colorPickerSuffix}
          value={value.background}
          error={errors?.background}
          disabled={disabled}
          onChange={(color) => setColor("background", color)}
        />
        <StoreColorField
          id="store-color-primary"
          label={text.primaryLabel}
          pickerSuffix={text.colorPickerSuffix}
          value={value.primary}
          error={errors?.primary}
          disabled={disabled}
          onChange={(color) => setColor("primary", color)}
        />
        <StoreColorField
          id="store-color-text"
          label={text.textLabel}
          pickerSuffix={text.colorPickerSuffix}
          value={value.text}
          error={errors?.text}
          disabled={disabled}
          onChange={(color) => setColor("text", color)}
        />
        <StoreColorField
          id="store-color-header"
          label={text.headerLabel}
          pickerSuffix={text.colorPickerSuffix}
          value={value.header}
          error={errors?.header}
          disabled={disabled}
          onChange={(color) => setColor("header", color)}
        />
      </div>

      <StoreColorPreview colors={value} messages={messages} />
    </FieldSet>
  )
}
