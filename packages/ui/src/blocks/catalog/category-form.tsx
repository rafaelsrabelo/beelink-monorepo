"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
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
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreImageField } from "../store/store-image-field"
import type { FieldIssues } from "../store/store-types"

export interface CategoryFormValues {
  name: string
  slug: string
  description: string
  imageUrl: string
  /** `""` is "no parent". A select cannot hold null, and the screen turns it back. */
  parentId: string
  isActive: boolean
}

export interface CategoryParentOption {
  id: string
  name: string
}

export interface CategoryFormProps {
  value: CategoryFormValues
  onChange: (value: CategoryFormValues) => void
  /**
   * The categories this one may go under: top-level ones, minus itself. The screen filters, because
   * only it knows which row is being edited — a block handed the whole list would have to be told
   * anyway, and then there would be two places that know the rule.
   */
  parents: readonly CategoryParentOption[]
  /** Spells the address under the slug field, so the shopkeeper reads it before saving it. */
  shopSlug: string
  errors?: FieldIssues<CategoryFormValues>
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  onSubmit: () => void
  onCancel?: () => void
  pending?: boolean
  messages?: UiMessages
}

/**
 * One category, as its owner fills it in.
 *
 * The slug is editable here and not on a shop, because a category's segment is derived from a name
 * the shopkeeper will fix within the hour, and the API keeps the old one resolving. Leaving it
 * blank derives it — which is what most of them will do, and why the help line says the address out
 * loud rather than making them guess what the field does.
 */
export function CategoryForm({
  value,
  onChange,
  parents,
  shopSlug,
  errors,
  onUploadImage,
  imagePending,
  onSubmit,
  onCancel,
  pending = false,
  messages = defaultMessages,
}: CategoryFormProps) {
  const text = messages.catalog.categories
  const set = <K extends keyof CategoryFormValues>(key: K, next: CategoryFormValues[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="category-name">{text.nameLabel}</FieldLabel>
          <Input
            id="category-name"
            value={value.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder={text.namePlaceholder}
            disabled={pending}
            aria-invalid={errors?.name ? true : undefined}
          />
          <FieldError errors={[errors?.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="category-slug">{text.slugLabel}</FieldLabel>
          <Input
            id="category-slug"
            value={value.slug}
            onChange={(event) => set("slug", event.target.value)}
            disabled={pending}
            aria-invalid={errors?.slug ? true : undefined}
          />
          <FieldDescription>
            {format(text.slugHelp, { shop: shopSlug, slug: value.slug || "\u2026" })}
          </FieldDescription>
          <FieldError errors={[errors?.slug]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="category-parent">{text.parentLabel}</FieldLabel>
          <Select
            value={value.parentId === "" ? "none" : value.parentId}
            // The select cannot hold null, so "none" stands for it and is translated back here —
            // one sentinel, at the edge, rather than a null that has to be remembered everywhere.
            onValueChange={(next: string | null) => set("parentId", !next || next === "none" ? "" : next)}
            disabled={pending}
          >
            <SelectTrigger id="category-parent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{text.parentNone}</SelectItem>
              {parents.map((parent) => (
                <SelectItem key={parent.id} value={parent.id}>
                  {parent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{text.parentHelp}</FieldDescription>
          <FieldError errors={[errors?.parentId]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="category-description">{text.descriptionLabel}</FieldLabel>
          <Textarea
            id="category-description"
            value={value.description}
            onChange={(event) => set("description", event.target.value)}
            rows={2}
            disabled={pending}
          />
          <FieldDescription>{text.descriptionHelp}</FieldDescription>
        </Field>

        <StoreImageField
          id="category-image"
          label={text.imageLabel}
          value={value.imageUrl}
          onChange={(next) => set("imageUrl", next)}
          onUpload={onUploadImage}
          pending={imagePending}
          previewAlt={value.name || text.imageLabel}
          aspect="square"
          recommendedSize={{ width: 600, height: 600 }}
          disabled={pending}
          messages={messages}
        />

        <Field orientation="horizontal">
          <Checkbox
            id="category-active"
            checked={value.isActive}
            onCheckedChange={(next: boolean | "indeterminate") => set("isActive", next === true)}
            disabled={pending}
          />
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="category-active">{text.activeLabel}</FieldLabel>
            <FieldDescription>{text.activeHelp}</FieldDescription>
          </div>
        </Field>
      </FieldGroup>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {text.save}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {text.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
