"use client"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { FieldIssues } from "../store/store-types"
import type { BannerFormTarget, BannerFormValues, BannerTargetOption } from "./banner-form-types"

export interface BannerTargetFieldsProps {
  value: BannerFormValues
  onChange: (value: BannerFormValues) => void
  categories: readonly BannerTargetOption[]
  products: readonly BannerTargetOption[]
  errors?: FieldIssues<BannerFormValues>
  disabled?: boolean
  messages?: UiMessages
}

/**
 * Where the banner goes.
 *
 * Its own file because the form is the rest of a poster — a title, a picture, a shape — and this is
 * the only part of it with a rule: three destinations held at once, one of them sent. A shopkeeper
 * who picks a category, changes their mind, picks a product and changes back finds their first
 * choice still there, which a single field the target rewrote would have thrown away.
 */
export function BannerTargetFields({
  value,
  onChange,
  categories,
  products,
  errors = {},
  disabled = false,
  messages = defaultMessages,
}: BannerTargetFieldsProps) {
  const text = messages.banners
  const set = <K extends keyof BannerFormValues>(key: K, next: BannerFormValues[K]) =>
    onChange({ ...value, [key]: next })

  const targetLabel = (target: string) =>
    target === "PRODUCT"
      ? text.targetProduct
      : target === "EXTERNAL"
        ? text.targetExternal
        : target === "NONE"
          ? text.targetNone
          : text.targetCategory

  const picker = (
    key: "categorySlug" | "productSlug",
    options: readonly BannerTargetOption[],
    label: string,
    placeholder: string,
  ) => (
    <Field>
      <FieldLabel htmlFor={`banner-${key}`}>{label}</FieldLabel>
      <Select
        disabled={disabled}
        // The `"none"` sentinel, as every other select here uses: an empty string is how Base UI
        // spells "nothing chosen", so an item carrying one can never be chosen back.
        value={value[key] === "" ? "none" : value[key]}
        onValueChange={(next: string | null) => set(key, !next || next === "none" ? "" : next)}
      >
        <SelectTrigger id={`banner-${key}`}>
          {/* A render function, not a bare value: Base UI shows the raw one, so the trigger would
              read "none" — the sentinel, on screen. */}
          <SelectValue>
            {(selected: string) =>
              selected === "none" || !selected
                ? placeholder
                : (options.find((option) => option.slug === selected)?.name ?? placeholder)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.slug} value={option.slug}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors[key]?.message ? <FieldError>{errors[key]?.message}</FieldError> : null}
    </Field>
  )

  return (
    <>
      <Field>
        <FieldLabel htmlFor="banner-target">{text.targetLabel}</FieldLabel>
        <Select
          disabled={disabled}
          value={value.target}
          onValueChange={(next: string | null) => set("target", (next ?? "CATEGORY") as BannerFormTarget)}
        >
          <SelectTrigger id="banner-target">
            <SelectValue>{(selected: string) => targetLabel(selected)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CATEGORY">{text.targetCategory}</SelectItem>
            <SelectItem value="PRODUCT">{text.targetProduct}</SelectItem>
            <SelectItem value="EXTERNAL">{text.targetExternal}</SelectItem>
            <SelectItem value="NONE">{text.targetNone}</SelectItem>
          </SelectContent>
        </Select>
        {/* The only target with no field under it, so the description is where the rule is said:
            nothing further is asked because nothing further exists. */}
        {value.target === "NONE" ? <FieldDescription>{text.targetNoneHelp}</FieldDescription> : null}
      </Field>

      {value.target === "CATEGORY" ? picker("categorySlug", categories, text.categoryLabel, text.categoryNone) : null}
      {value.target === "PRODUCT" ? picker("productSlug", products, text.productLabel, text.productNone) : null}

      {value.target === "EXTERNAL" ? (
        <Field>
          <FieldLabel htmlFor="banner-external">{text.externalLabel}</FieldLabel>
          <Input
            id="banner-external"
            type="url"
            inputMode="url"
            disabled={disabled}
            placeholder="https://"
            value={value.externalUrl}
            onChange={(event) => set("externalUrl", event.target.value)}
          />
          <FieldDescription>{text.externalHelp}</FieldDescription>
          {errors.externalUrl?.message ? <FieldError>{errors.externalUrl.message}</FieldError> : null}
        </Field>
      ) : null}
    </>
  )
}
