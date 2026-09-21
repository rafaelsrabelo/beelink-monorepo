"use client"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@harness-monorepo/ui/components/field"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreColorsFields } from "./store-colors-fields"
import { StoreImageField } from "./store-image-field"
import type { StoreAppearanceValues } from "./store-schemas"
import type { FieldIssue, FieldIssues, StoreColorPreset, StoreColors } from "./store-types"

export interface StoreAppearanceFieldsProps {
  value: StoreAppearanceValues
  onChange: (value: StoreAppearanceValues) => void
  errors?: Partial<Record<"bannerImageUrl", FieldIssue>>
  colorErrors?: FieldIssues<StoreColors>
  /** Palettes applied in one click. The names are copy, so the screen supplies the list. */
  presets?: StoreColorPreset[]
  /** Hands the banner to whoever keeps bytes. Absent leaves the address field alone. */
  onBannerUpload?: (file: File) => Promise<string>
  bannerUploadPending?: boolean
  disabled?: boolean
  messages?: UiMessages
}

/** How the shop window is laid out and painted. Every colour here is data, never a token. */
export function StoreAppearanceFields({
  value,
  onChange,
  errors,
  colorErrors,
  presets,
  onBannerUpload,
  bannerUploadPending,
  disabled = false,
  messages = defaultMessages,
}: StoreAppearanceFieldsProps) {
  const text = messages.store.appearance

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">{text.layoutLegend}</FieldLegend>
        <ToggleGroup
          multiple={false}
          aria-label={text.layoutLegend}
          variant="outline"
          disabled={disabled}
          value={[value.layoutType]}
          onValueChange={(next: string[]) => {
            const layoutType = next[0]
            if (layoutType === "DEFAULT" || layoutType === "BANNER") {
              onChange({ ...value, layoutType })
            }
          }}
        >
          <ToggleGroupItem value="DEFAULT">{text.layoutDefault}</ToggleGroupItem>
          <ToggleGroupItem value="BANNER">{text.layoutBanner}</ToggleGroupItem>
        </ToggleGroup>
        <FieldDescription>
          {value.layoutType === "BANNER" ? text.layoutBannerHint : text.layoutDefaultHint}
        </FieldDescription>
      </FieldSet>

      {value.layoutType === "BANNER" ? (
        <StoreImageField
          id="store-banner"
          label={text.bannerImageLabel}
          hint={text.bannerImageHint}
          previewAlt={text.bannerAlt}
          aspect="wide"
          // bee-link's own banner size, not the one from the form this layout was modelled on.
          // The area and the preview take their shape from it, so what is cropped while choosing
          // is what is cropped in the shop window.
          recommendedSize={{ width: 1200, height: 400 }}
          value={value.bannerImageUrl}
          error={errors?.bannerImageUrl}
          onUpload={onBannerUpload}
          pending={bannerUploadPending}
          disabled={disabled}
          messages={messages}
          onChange={(bannerImageUrl) => onChange({ ...value, bannerImageUrl })}
        />
      ) : null}

      <FieldSet>
        <FieldLegend variant="label">{text.cardLayoutLegend}</FieldLegend>
        {/* The one key of the `layoutSettings` blob the panel offers. The screen echoes the rest of
            that blob back untouched and merges this over it — see StoreAppearanceValues. */}
        <ToggleGroup
          multiple={false}
          aria-label={text.cardLayoutLegend}
          variant="outline"
          disabled={disabled}
          value={[value.cardLayout]}
          onValueChange={(next: string[]) => {
            const cardLayout = next[0]
            if (cardLayout === "grid" || cardLayout === "horizontal") {
              onChange({ ...value, cardLayout })
            }
          }}
        >
          <ToggleGroupItem value="grid">{text.cardLayoutGrid}</ToggleGroupItem>
          <ToggleGroupItem value="horizontal">{text.cardLayoutHorizontal}</ToggleGroupItem>
        </ToggleGroup>
        <FieldDescription>
          {value.cardLayout === "horizontal" ? text.cardLayoutHorizontalHint : text.cardLayoutGridHint}
        </FieldDescription>
      </FieldSet>

      <Field orientation="horizontal">
        <Checkbox
          id="store-categories"
          disabled={disabled}
          checked={value.showProductsByCategory}
          onCheckedChange={(checked) => onChange({ ...value, showProductsByCategory: checked })}
        />
        <FieldContent>
          <FieldLabel htmlFor="store-categories">{text.categoriesLabel}</FieldLabel>
          <FieldDescription>{text.categoriesHint}</FieldDescription>
        </FieldContent>
      </Field>

      <StoreColorsFields
        value={value.colors}
        errors={colorErrors}
        presets={presets}
        disabled={disabled}
        messages={messages}
        onChange={(colors) => onChange({ ...value, colors })}
      />
    </FieldGroup>
  )
}
