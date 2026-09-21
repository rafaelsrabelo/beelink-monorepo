"use client"

// Libs
import { XIcon } from "lucide-react"

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

export interface ProductFormValues {
  name: string
  slug: string
  description: string
  /** Reais as typed. `./money` is the one place that turns this into the cents the wire carries. */
  price: string
  compareAtPrice: string
  /** `""` is "no category": a select cannot hold null, and the screen turns it back. */
  categoryId: string
  isAvailable: boolean
  imageUrls: string[]
}

export interface ProductCategoryOption {
  id: string
  name: string
  /** Shown beside the name, so two subcategories called "Novidades" are told apart. */
  parentName?: string | null
}

export interface ProductFormProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  categories: readonly ProductCategoryOption[]
  shopSlug: string
  /** The shop's own word for products, so the help line shows the real address. */
  productsWord: string
  errors?: FieldIssues<ProductFormValues>
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  onSubmit: () => void
  onCancel?: () => void
  pending?: boolean
  messages?: UiMessages
}

/**
 * One product, as its owner fills it in.
 *
 * The price is typed in reais and stored in whole cents, and the crossing happens in `./money` and
 * nowhere else. That separation is not tidiness: the legacy kept reais, cents and "R$ 25,00" in one
 * column and chose between them by guessing at the size of the number, which is how a product could
 * be sold for a hundredth of its price.
 *
 * The photographs are a list and the first one is the card's. There is no "primary" flag, because a
 * flag can be set on two rows at once and a position cannot.
 */
export function ProductForm({
  value,
  onChange,
  categories,
  shopSlug,
  productsWord,
  errors,
  onUploadImage,
  imagePending,
  onSubmit,
  onCancel,
  pending = false,
  messages = defaultMessages,
}: ProductFormProps) {
  const text = messages.catalog.products
  const set = <K extends keyof ProductFormValues>(key: K, next: ProductFormValues[K]) =>
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
          <FieldLabel htmlFor="product-name">{text.nameLabel}</FieldLabel>
          <Input
            id="product-name"
            value={value.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder={text.namePlaceholder}
            disabled={pending}
            aria-invalid={errors?.name ? true : undefined}
          />
          <FieldError errors={[errors?.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="product-slug">{text.slugLabel}</FieldLabel>
          <Input
            id="product-slug"
            value={value.slug}
            onChange={(event) => set("slug", event.target.value)}
            disabled={pending}
          />
          <FieldDescription>
            {format(text.slugHelp, { shop: shopSlug, word: productsWord, slug: value.slug || "…" })}
          </FieldDescription>
          <FieldError errors={[errors?.slug]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="product-price">{text.priceLabel}</FieldLabel>
            <Input
              id="product-price"
              inputMode="decimal"
              value={value.price}
              onChange={(event) => set("price", event.target.value)}
              disabled={pending}
              aria-invalid={errors?.price ? true : undefined}
            />
            <FieldDescription>{text.priceHelp}</FieldDescription>
            <FieldError errors={[errors?.price]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="product-compare">{text.compareLabel}</FieldLabel>
            <Input
              id="product-compare"
              inputMode="decimal"
              value={value.compareAtPrice}
              onChange={(event) => set("compareAtPrice", event.target.value)}
              disabled={pending}
              aria-invalid={errors?.compareAtPrice ? true : undefined}
            />
            <FieldDescription>{text.compareHelp}</FieldDescription>
            <FieldError errors={[errors?.compareAtPrice]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="product-category">{text.categoryLabel}</FieldLabel>
          <Select
            value={value.categoryId === "" ? "none" : value.categoryId}
            onValueChange={(next: string | null) =>
              set("categoryId", !next || next === "none" ? "" : next)
            }
            disabled={pending}
          >
            <SelectTrigger id="product-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{text.categoryNone}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.parentName ? `${category.parentName} › ${category.name}` : category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="product-description">{text.descriptionLabel}</FieldLabel>
          <Textarea
            id="product-description"
            value={value.description}
            onChange={(event) => set("description", event.target.value)}
            rows={4}
            disabled={pending}
          />
        </Field>

        {/*
          A list, and the first one is the card's. There is no "primary" flag: a flag can be set on
          two rows at once and a position cannot, which is why the schema has no such column either.
        */}
        <Field>
          <FieldLabel>{text.imagesLabel}</FieldLabel>
          <FieldDescription>{text.imagesHelp}</FieldDescription>

          {value.imageUrls.length ? (
            <ul className="flex flex-wrap gap-2 py-2">
              {value.imageUrls.map((url, index) => (
                <li key={url} className="relative">
                  <img
                    src={url}
                    alt=""
                    aria-hidden="true"
                    className="size-20 rounded-lg border object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label={`${text.imageRemove} ${index + 1}`}
                    className="absolute -top-2 -right-2 size-6 rounded-full"
                    onClick={() => set("imageUrls", value.imageUrls.filter((entry) => entry !== url))}
                    disabled={pending}
                  >
                    <XIcon aria-hidden="true" className="size-3" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <StoreImageField
            id="product-image"
            label={text.imageAdd}
            // Always empty: this field adds to the list rather than holding one picture, so what it
            // shows is the next slot and never the last thing uploaded.
            value=""
            onChange={(next) => {
              if (next && !value.imageUrls.includes(next)) set("imageUrls", [...value.imageUrls, next])
            }}
            onUpload={onUploadImage}
            pending={imagePending}
            previewAlt={text.imagesLabel}
            aspect="square"
            recommendedSize={{ width: 800, height: 800 }}
            disabled={pending}
            messages={messages}
          />
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            id="product-available"
            checked={value.isAvailable}
            onCheckedChange={(next: boolean | "indeterminate") => set("isAvailable", next === true)}
            disabled={pending}
          />
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="product-available">{text.availableLabel}</FieldLabel>
            <FieldDescription>{text.availableHelp}</FieldDescription>
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
