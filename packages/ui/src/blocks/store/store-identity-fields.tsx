"use client"

// UI
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@harness-monorepo/ui/components/select"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreImageField } from "./store-image-field"
import type { StoreIdentityValues } from "./store-schemas"
import type { FieldIssue, FieldIssues, StoreCategoryOption } from "./store-types"

export interface StoreIdentityFieldsProps {
  value: StoreIdentityValues
  onChange: (value: StoreIdentityValues) => void
  /** The shop's URL segment, read-only unless `onSlugChange` is given. */
  slug: string
  /**
   * Set exactly once, at creation: the create form passes this and the settings form does not, so
   * the same block shows an address that can still be chosen and one that can no longer change.
   */
  onSlugChange?: (slug: string) => void
  slugError?: FieldIssue
  categories: StoreCategoryOption[]
  errors?: FieldIssues<StoreIdentityValues>
  /** Hands the logo to whoever keeps bytes. Absent leaves the address field alone — see the field. */
  onLogoUpload?: (file: File) => Promise<string>
  logoUploadPending?: boolean
  disabled?: boolean
  messages?: UiMessages
}

/** Who the shop is: the name on the window, what it sells, and the picture beside it. */
export function StoreIdentityFields({
  value,
  onChange,
  slug,
  onSlugChange,
  slugError,
  categories,
  errors,
  onLogoUpload,
  logoUploadPending,
  disabled = false,
  messages = defaultMessages,
}: StoreIdentityFieldsProps) {
  const text = messages.store.identity

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="store-name">{text.nameLabel}</FieldLabel>
        <Input
          id="store-name"
          value={value.name}
          disabled={disabled}
          placeholder={text.namePlaceholder}
          aria-invalid={Boolean(errors?.name)}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
        <FieldError errors={[errors?.name]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="store-slug">{text.slugLabel}</FieldLabel>
        {onSlugChange ? (
          <Input
            id="store-slug"
            value={slug}
            disabled={disabled}
            aria-describedby="store-slug-hint"
            aria-invalid={Boolean(slugError)}
            onChange={(event) => onSlugChange(event.target.value)}
          />
        ) : (
          // Read-only rather than absent: the shopkeeper still needs to read and copy the address.
          <Input id="store-slug" value={`/${slug}`} readOnly aria-describedby="store-slug-hint" />
        )}
        <FieldDescription id="store-slug-hint">
          {onSlugChange ? text.slugEditableHint : text.slugHint}
        </FieldDescription>
        <FieldError errors={[slugError]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="store-description">{text.descriptionLabel}</FieldLabel>
        {/* A textarea, not an input: the bound is 2000 characters and the legacy column is
            unbounded text, so a shop carried over writes paragraphs into this field. */}
        <Textarea
          id="store-description"
          rows={4}
          value={value.description}
          disabled={disabled}
          placeholder={text.descriptionPlaceholder}
          aria-invalid={Boolean(errors?.description)}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
        <FieldDescription>{text.descriptionHint}</FieldDescription>
        <FieldError errors={[errors?.description]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="store-category">{text.categoryLabel}</FieldLabel>
        <Select
          value={value.categoryId}
          disabled={disabled}
          onValueChange={(next: string | null) => onChange({ ...value, categoryId: next ?? "" })}
        >
          <SelectTrigger id="store-category" className="w-full">
            <SelectValue placeholder={text.categoryPlaceholder}>
              {(selected: string | null) =>
                categories.find((category) => category.id === selected)?.name ?? text.categoryNone
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{text.categoryNone}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <StoreImageField
        id="store-logo"
        label={text.logoLabel}
        hint={text.logoHint}
        previewAlt={text.logoAlt}
        value={value.logoUrl}
        error={errors?.logoUrl}
        onUpload={onLogoUpload}
        pending={logoUploadPending}
        disabled={disabled}
        messages={messages}
        onChange={(logoUrl) => onChange({ ...value, logoUrl })}
      />
    </FieldGroup>
  )
}
