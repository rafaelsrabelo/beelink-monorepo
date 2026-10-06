"use client"

// React
import { useState } from "react"

// Libs
import { GalleryVerticalIcon, LayoutGridIcon, LayoutListIcon, LayoutPanelTopIcon, TagIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export type OpeningTemplateChoice = "vitrine-com-capa" | "por-categorias" | "ofertas" | "catalogo-enxuto"

/** How each model is drawn. Which models there are is the API's to say. */
const ICONS = {
  "vitrine-com-capa": LayoutPanelTopIcon,
  "por-categorias": LayoutGridIcon,
  ofertas: TagIcon,
  "catalogo-enxuto": LayoutListIcon,
} as const

/** Whether an id is a model this picker can draw: a newer catalogue may list one it cannot. */
export function isOpeningTemplate(id: string): id is OpeningTemplateChoice {
  return Object.hasOwn(ICONS, id)
}

export interface OpeningTemplateOption {
  id: OpeningTemplateChoice
  /** Suggested for the category picked in the form. It came first; it hides nothing. */
  recommended: boolean
}

export interface StoreOpeningTemplateProps {
  /** The model picked, or "" for the default page — what a shop opens with when nobody chooses. */
  value: string
  onChange: (value: string) => void
  /** The models a shop's home may open with, in the API's order. */
  templates: readonly OpeningTemplateOption[]
  state?: "loading" | "failed" | "ready"
  onRetry?: () => void
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The page a new shop opens with: the default one, chosen from the start, or a model of the
 * catalogue. Folded away, because it is a choice nobody has to make — a shop that never opens it
 * gets the page every shop got before there were models.
 *
 * No preview: a model is drawn from the shop's own products, and the shop does not exist yet.
 */
export function StoreOpeningTemplate({ value, onChange, templates, state = "ready", onRetry, disabled = false, messages = defaultMessages }: StoreOpeningTemplateProps) {
  const text = messages.store.create.openingPage
  const gallery = messages.design.templateGallery
  const names = messages.design.pages.form.templates
  // Unfolded from the start when a model is already picked: a choice made is never out of sight.
  // Its own state after that — going back to the default page must not fold the choices under the pointer.
  const [open, setOpen] = useState(value !== "")

  const card = (id: string, Icon: typeof TagIcon, title: string, description: string, recommended: boolean) => (
    <label
      key={id || "default"}
      className={cn(
        "has-[:focus-visible]:ring-ring/50 flex cursor-pointer gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-3",
        value === id ? "border-primary bg-primary/5" : "border-border",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input type="radio" name="store-opening-template" value={id} checked={value === id} disabled={disabled} onChange={() => onChange(id)} className="sr-only" />
      <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <span className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          {title}
          {recommended ? <Badge variant="secondary">{gallery.recommended}</Badge> : null}
        </span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </span>
    </label>
  )

  return (
    <section className="flex flex-col gap-2 border-t pt-4">
      <h3 className="text-sm font-medium">{text.heading}</h3>
      <p className="text-muted-foreground text-sm">{text.hint}</p>
      <details className="group" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="text-primary focus-visible:ring-ring/50 w-fit cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-3">
          {text.choose}
        </summary>
        <fieldset className="mt-3 flex flex-col gap-2">
          <legend className="sr-only">{text.legend}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {card("", GalleryVerticalIcon, text.defaultTitle, text.defaultDescription, false)}
            {state === "ready" ? templates.map((template) => card(template.id, ICONS[template.id], names[template.id].title, names[template.id].description, template.recommended)) : null}
            {state === "loading" ? (
              <div role="status" aria-busy="true" className="contents">
                <span className="sr-only">{gallery.loading}</span>
                {[0, 1, 2].map((placeholder) => (
                  <Skeleton key={placeholder} aria-hidden="true" className="h-18 w-full rounded-lg" />
                ))}
              </div>
            ) : null}
          </div>
          {state === "failed" ? (
            <div className="flex flex-col items-start gap-2">
              <p role="alert" className="text-destructive text-sm">
                {gallery.failed}
              </p>
              {onRetry ? (
                <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                  {gallery.retry}
                </Button>
              ) : null}
            </div>
          ) : null}
          {state === "ready" && templates.length > 0 ? <p className="text-muted-foreground text-xs">{text.emptyShopNote}</p> : null}
        </fieldset>
      </details>
    </section>
  )
}
