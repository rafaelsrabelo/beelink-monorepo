"use client"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductFormIssues, ProductFormValues } from "./product-form-types"
import { RichTextField } from "./rich-text-field"

export interface ProductBasicsFieldsProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  /** The shop's slug and its own word for products, so the address line shows the real one. */
  shopSlug: string
  productsWord: string
  errors?: ProductFormIssues
  disabled?: boolean
  messages?: UiMessages
}

/** What a customer reads first: the name, the address it gets, and the description. */
export function ProductBasicsFields({
  value,
  onChange,
  shopSlug,
  productsWord,
  errors,
  disabled = false,
  messages = defaultMessages,
}: ProductBasicsFieldsProps) {
  const text = messages.catalog.products

  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={errors?.name ? true : undefined}>
        <FieldLabel htmlFor="product-name">{text.nameLabel}</FieldLabel>
        <Input
          id="product-name"
          autoComplete="off"
          disabled={disabled}
          placeholder={text.namePlaceholder}
          aria-invalid={errors?.name ? true : undefined}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
        {errors?.name ? <FieldError>{errors.name.message}</FieldError> : null}
      </Field>

      <Field data-invalid={errors?.slug ? true : undefined}>
        <FieldLabel htmlFor="product-slug">{text.slugLabel}</FieldLabel>
        <Input
          id="product-slug"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={errors?.slug ? true : undefined}
          value={value.slug}
          onChange={(event) => onChange({ ...value, slug: event.target.value })}
        />
        {errors?.slug ? (
          <FieldError>{errors.slug.message}</FieldError>
        ) : (
          // The real address, with the shop's own route word — so a shopkeeper sees what they are
          // about to print on a card rather than a rule about slugs.
          <FieldDescription>
            {format(text.slugHelp, { shop: shopSlug, word: productsWord, slug: value.slug || "…" })}
          </FieldDescription>
        )}
      </Field>

      <RichTextField
        label={text.descriptionLabel}
        value={value.description}
        disabled={disabled}
        messages={messages}
        onChange={(description) => onChange({ ...value, description })}
      />
    </div>
  )
}
