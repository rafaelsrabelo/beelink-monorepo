"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BannerSlidesField } from "./banner-slides-field"
import type { SlideTargetOption, SlideValue } from "./banner-slides-field"
import { BenefitRowsField } from "./benefit-rows-field"
import type { BenefitValue } from "./benefit-rows-field"
import type { ComponentKind } from "./design-types"

export type ComponentFormLayout = "FULL" | "HALVES" | "THIRDS"

/**
 * What a component's form holds while it is being filled in.
 *
 * One shape for all seven kinds, and the form draws only the fields the kind has. A shape per kind
 * would be seven states for one panel, and the screen would have to know which it is holding
 * before it could hand it back.
 *
 * `""` where the wire carries null, because an input cannot hold null; the screen turns it back.
 */
export interface ComponentFormValues {
  kind: ComponentKind
  title: string
  subtitle: string
  body: string
  layout: ComponentFormLayout
  /** `0` is "let the grid decide", which is what null means on the wire. */
  columns: number
  slides: SlideValue[]
  benefits: BenefitValue[]
}

// Re-exported, because the package's export map points `./blocks/*` at `.tsx`: a types-only `.ts`
// beside a block cannot be reached from an app.
export type { BenefitValue, SlideTargetOption, SlideValue }

export interface ComponentFormProps {
  value: ComponentFormValues
  onChange: (value: ComponentFormValues) => void
  categories: readonly SlideTargetOption[]
  products: readonly SlideTargetOption[]
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  newItemId: () => string
  onSubmit: () => void
  onCancel: () => void
  pending?: boolean
  messages?: UiMessages
}

/** The kinds that carry a heading of their own, and what each one calls it. */
const HAS_HEADING: readonly ComponentKind[] = ["ANNOUNCEMENT", "HEADING", "CATEGORIES", "PRODUCTS"]

/**
 * Every component's fields, dispatched on its kind.
 *
 * One form and not seven screens, because the shopkeeper opens it the same way every time — by
 * clicking the row. What made the old panel unusable was the opposite: some kinds had a form on a
 * screen of their own, some had no form at all, and the ones with none were the ones reported as
 * "não consigo editar".
 */
export function ComponentForm({
  value,
  onChange,
  categories,
  products,
  onUploadImage,
  imagePending = false,
  newItemId,
  onSubmit,
  onCancel,
  pending = false,
  messages = defaultMessages,
}: ComponentFormProps) {
  const text = messages.design
  const banner = messages.banners
  const set = <K extends keyof ComponentFormValues>(key: K, next: ComponentFormValues[K]) =>
    onChange({ ...value, [key]: next })

  const layoutLabel = (layout: string) =>
    layout === "HALVES" ? text.sizeHalves : layout === "THIRDS" ? text.sizeThirds : text.sizeFull

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {HAS_HEADING.includes(value.kind) ? (
        <>
          <Field>
            <FieldLabel htmlFor="component-title">{banner.titleLabel}</FieldLabel>
            <FieldContent>
              <Input
                id="component-title"
                value={value.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder={banner.titlePlaceholder}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="component-subtitle">{banner.subtitleLabel}</FieldLabel>
            <FieldContent>
              <Input
                id="component-subtitle"
                value={value.subtitle}
                onChange={(event) => set("subtitle", event.target.value)}
              />
              <FieldDescription>{banner.subtitleHelp}</FieldDescription>
            </FieldContent>
          </Field>
        </>
      ) : null}

      {value.kind === "TEXT" ? (
        <Field>
          <FieldLabel htmlFor="component-body">{text.bodyLabel}</FieldLabel>
          <FieldContent>
            {/* A textarea and not an input: the paragraph's own line breaks are the only
                formatting this field has, and the storefront draws them. */}
            <Textarea
              id="component-body"
              rows={6}
              value={value.body}
              onChange={(event) => set("body", event.target.value)}
              placeholder={text.bodyPlaceholder}
            />
          </FieldContent>
        </Field>
      ) : null}

      {value.kind === "CATEGORIES" ? (
        <Field orientation="responsive">
          <FieldLabel htmlFor="component-columns">{text.columnsLabel}</FieldLabel>
          <FieldContent>
            <Select
              value={String(value.columns)}
              onValueChange={(next: string | null) => set("columns", Number(next ?? 0))}
            >
              <SelectTrigger id="component-columns">
                <SelectValue>
                  {(selected: string) => (selected === "0" ? text.columnsAuto : selected)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{text.columnsAuto}</SelectItem>
                {[2, 3, 4, 5, 6].map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {String(count)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      ) : null}

      {value.kind === "BANNER" ? (
        <>
          <Field orientation="responsive">
            <FieldLabel htmlFor="component-layout">{text.sizeLabel}</FieldLabel>
            <FieldContent>
              <Select
                value={value.layout}
                onValueChange={(next: string | null) =>
                  set("layout", (next ?? "FULL") as ComponentFormLayout)
                }
              >
                <SelectTrigger id="component-layout">
                  <SelectValue>{(selected: string) => layoutLabel(selected)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">{text.sizeFull}</SelectItem>
                  <SelectItem value="HALVES">{text.sizeHalves}</SelectItem>
                  <SelectItem value="THIRDS">{text.sizeThirds}</SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <BannerSlidesField
            value={value.slides}
            onChange={(next) => set("slides", next)}
            categories={categories}
            products={products}
            {...(onUploadImage ? { onUploadImage } : {})}
            imagePending={imagePending}
            newSlideId={newItemId}
            messages={messages}
          />
        </>
      ) : null}

      {value.kind === "BENEFITS" ? (
        <BenefitRowsField
          value={value.benefits}
          onChange={(next) => set("benefits", next)}
          newRowId={newItemId}
          messages={messages}
        />
      ) : null}

      {value.kind === "PRODUCTS" ? (
        <p className="text-muted-foreground text-sm">{text.productListHint}</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {banner.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? banner.saving : banner.save}
        </Button>
      </div>
    </form>
  )
}
