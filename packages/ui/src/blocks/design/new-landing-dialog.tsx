"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { slugify } from "../store/store-slug"
import { LandingTemplatePicker, type LandingTemplateChoice } from "./landing-template-picker"
import { OptionSearch } from "./option-search"
import { PageAddressField, type PageAddressState } from "./page-address-field"
import { PageDisplayFields } from "./page-display-fields"
import type { TargetOption } from "./target-fields"

export interface NewLandingValue {
  title: string
  /** What the owner typed as the address, or null while it follows the name. */
  slug: string | null
  template: LandingTemplateChoice
  productId: string | null
  inMenu: boolean
  usesChrome: boolean
}

/** A new landing's form, empty: in the shop's frame, out of its menu, as the first template this shop has. */
export function emptyNewLanding(template: LandingTemplateChoice): NewLandingValue {
  return { title: "", slug: null, template, productId: null, inMenu: false, usesChrome: true }
}

/** Every template but the blank one is built around a product. */
export function needsProduct(template: LandingTemplateChoice): boolean {
  return template !== "em-branco"
}

/** The address the form shows: the one typed, or the name's until one is — cut to the column as the API cuts it. */
export function addressOf(value: Pick<NewLandingValue, "title" | "slug">): string {
  return value.slug ?? slugify(value.title).slice(0, 60).replace(/-+$/, "")
}

export interface NewLandingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: NewLandingValue
  onChange: (value: NewLandingValue) => void
  /** What comes before the address: "/mutante/lp/". */
  addressPrefix: string
  addressState: PageAddressState
  /** The templates this shop may open with. */
  templates: readonly LandingTemplateChoice[]
  products: readonly TargetOption[]
  productsState: "ready" | "loading" | "failed"
  /** What is typed in the product search, for a shop with more products than one page holds. */
  onProductQuery?: (query: string) => void
  onSubmit: () => void
  pending: boolean
  /** Why the API refused, in the owner's words. */
  error?: string | null
  messages?: UiMessages
}

/**
 * "Nova landing page": a name, where it lives, what it opens with and — for a template that sells
 * one — the product it is built around. The address follows the name until it is typed, and says
 * whether it is free as it goes, so the one refusal left at "Criar" is a race nobody can see coming.
 */
export function NewLandingDialog({
  open,
  onOpenChange,
  value,
  onChange,
  addressPrefix,
  addressState,
  templates,
  products,
  productsState,
  onProductQuery,
  onSubmit,
  pending,
  error = null,
  messages = defaultMessages,
}: NewLandingDialogProps) {
  const text = messages.design.pages.form
  const product = needsProduct(value.template)
  // An emptied address is not "follow the name" — the owner is typing one — so it waits for one.
  const ready =
    value.title.trim() !== "" &&
    addressOf(value).trim() !== "" &&
    addressState !== "taken" &&
    addressState !== "invalid" &&
    (!product || value.productId !== null) &&
    !pending

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <DialogContent closeLabel={text.cancel} className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (ready) onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{text.newTitle}</DialogTitle>
            <DialogDescription>{text.newDescription}</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="new-landing-name">{text.name}</FieldLabel>
            <Input
              id="new-landing-name"
              value={value.title}
              maxLength={80}
              placeholder={text.namePlaceholder}
              onChange={(event) => onChange({ ...value, title: event.target.value })}
            />
          </Field>

          <PageAddressField
            id="new-landing-address"
            prefix={addressPrefix}
            value={addressOf(value)}
            onChange={(slug) => onChange({ ...value, slug })}
            state={addressState}
            messages={messages}
          />

          <LandingTemplatePicker
            value={value.template}
            onChange={(template) => onChange({ ...value, template })}
            available={templates}
            messages={messages}
          />

          {product ? (
            <div className="flex flex-col gap-1">
              <OptionSearch
                id="new-landing-product"
                label={text.product}
                placeholder={text.productPlaceholder}
                options={products}
                onPick={(productId) => onChange({ ...value, productId })}
                {...(value.productId ? { selectedId: value.productId } : {})}
                emptyText={text.productEmpty}
                state={productsState}
                {...(onProductQuery ? { onQueryChange: onProductQuery } : {})}
                messages={messages}
              />
              <p className="text-muted-foreground text-xs">{text.productHint}</p>
            </div>
          ) : null}

          <PageDisplayFields
            id="new-landing"
            value={{ inMenu: value.inMenu, usesChrome: value.usesChrome }}
            onChange={(display) => onChange({ ...value, ...display })}
            messages={messages}
          />

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {text.cancel}
            </Button>
            <Button type="submit" disabled={!ready}>
              {pending ? text.creating : text.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
