"use client"

// React
import { useId, useRef, useState, type ReactNode } from "react"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { Switch } from "@harness-monorepo/ui/components/switch"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { OptionSearch } from "./option-search"
import type { TargetOption } from "./target-fields"
import { TemplateGalleryCard, type GalleryTemplate, type GalleryTemplateId } from "./template-gallery-card"
import type { TemplatePreviewSize } from "./template-preview-frame"

export type { GalleryTemplate, GalleryTemplateId, TemplatePreviewSize }

/** The product the models that ask for one are drawn around: one choice for the whole gallery. */
export interface TemplateGalleryProduct {
  options: readonly TargetOption[]
  state: "ready" | "loading" | "failed"
  selectedId: string | null
  onPick: (productId: string) => void
  /** What is typed, for a shop with more products than one page holds. */
  onQueryChange?: (query: string) => void
}

export interface TemplateGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Whether the models have arrived: grey cards while they are on their way, a sentence when they could not be read. */
  state: "loading" | "failed" | "ready"
  onRetry?: () => void
  /** In the order the API gave them: the suggested ones first. */
  templates: readonly GalleryTemplate[]
  selectedId: GalleryTemplateId | null
  onSelect: (id: GalleryTemplateId) => void
  /**
   * A model drawn by the shop's own renderer, for its card or whole. The screen answers with a
   * `TemplatePreviewFrame` in whichever state its request is; a card asks only once it is on screen.
   */
  renderPreview: (template: GalleryTemplate, size: TemplatePreviewSize) => ReactNode
  product?: TemplateGalleryProduct
  /**
   * Applying the chosen model. Without it — while the screen does not apply yet — the large preview
   * has no such button: choosing a model only shows it.
   */
  onApply?: (template: GalleryTemplate) => void
  applying?: boolean
  messages?: UiMessages
}

/**
 * The gallery of whole-page models: a card each, drawn with this shop's products and colours, and
 * the one chosen shown as the whole page beside them.
 *
 * Two panes where there is room. Below that, one: the cards in a column, and the chosen model's
 * page in their place with a way back — a page beside a list is two stamps on a phone.
 *
 * It asks for nothing itself. The list and each preview are the screen's, handed in.
 */
export function TemplateGallery({
  open,
  onOpenChange,
  state,
  onRetry,
  templates,
  selectedId,
  onSelect,
  renderPreview,
  product,
  onApply,
  applying = false,
  messages = defaultMessages,
}: TemplateGalleryProps) {
  const text = messages.design.templateGallery
  const names = messages.design.pages.form.templates
  const switchId = useId()
  const [recommendedOnly, setRecommendedOnly] = useState(false)
  // Below `lg` only: whether the chosen model's page has taken the list's place.
  const [viewing, setViewing] = useState(false)
  const back = useRef<HTMLButtonElement>(null)
  const chosenButton = useRef<HTMLButtonElement>(null)

  const suggested = templates.filter((template) => template.recommended)
  // A switch that would keep everything, or nothing, filters nothing.
  const canFilter = suggested.length > 0 && suggested.length < templates.length
  const shown = canFilter && recommendedOnly ? suggested : templates
  const selected = templates.find((template) => template.id === selectedId) ?? null

  const select = (id: GalleryTemplateId) => {
    onSelect(id)
    setViewing(true)
    // Where the list gives way to the page, the pressed button is gone: the focus goes to the way back.
    requestAnimationFrame(() => (back.current?.offsetParent ? back.current.focus() : undefined))
  }
  const leave = () => {
    setViewing(false)
    requestAnimationFrame(() => chosenButton.current?.focus())
  }
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setViewing(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        closeLabel={messages.design.frame.close}
        className="flex h-[92dvh] w-[min(88rem,96vw)] max-w-none flex-col gap-0 p-0 sm:max-w-none"
      >
        <DialogHeader className="border-b p-4">
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className={cn("min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:w-[26rem] lg:flex-none lg:border-r", viewing && selected ? "hidden lg:flex" : "flex")}>
            {state === "ready" && canFilter ? (
              <div className="flex items-center gap-2">
                <Switch id={switchId} checked={recommendedOnly} onCheckedChange={(checked: boolean) => setRecommendedOnly(checked)} />
                <label htmlFor={switchId} className="text-sm font-medium">
                  {text.recommendedOnly}
                </label>
              </div>
            ) : null}

            {state === "ready" && product && templates.some((template) => template.needsProduct) ? (
              <div className="flex flex-col gap-1">
                <OptionSearch
                  id={`${switchId}-product`}
                  label={text.product}
                  placeholder={text.productPlaceholder}
                  options={product.options}
                  onPick={product.onPick}
                  {...(product.selectedId ? { selectedId: product.selectedId } : {})}
                  emptyText={text.productEmpty}
                  limit={4}
                  state={product.state}
                  {...(product.onQueryChange ? { onQueryChange: product.onQueryChange } : {})}
                  messages={messages}
                />
                <p className="text-muted-foreground text-xs">{text.productHint}</p>
              </div>
            ) : null}

            {state === "loading" ? (
              <div role="status" aria-busy="true" className="flex flex-col gap-3">
                <span className="sr-only">{text.loading}</span>
                {[0, 1, 2].map((card) => (
                  <Skeleton key={card} aria-hidden="true" className="h-64 w-full rounded-lg" />
                ))}
              </div>
            ) : state === "failed" ? (
              <div className="flex flex-col items-start gap-2 py-6">
                <p role="alert" className="text-destructive text-sm">
                  {text.failed}
                </p>
                {onRetry ? (
                  <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                    {text.retry}
                  </Button>
                ) : null}
              </div>
            ) : shown.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">{text.empty}</p>
            ) : (
              <ul aria-label={text.listLabel} className="flex flex-col gap-3">
                {shown.map((template) => (
                  <TemplateGalleryCard
                    key={template.id}
                    template={template}
                    selected={template.id === selectedId}
                    onSelect={() => select(template.id)}
                    renderPreview={() => renderPreview(template, "card")}
                    {...(template.id === selectedId ? { buttonRef: chosenButton } : {})}
                    messages={messages}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className={cn("bg-muted/30 min-h-0 min-w-0 flex-1 flex-col", viewing && selected ? "flex" : "hidden lg:flex")}>
            {selected ? (
              <>
                <div className="bg-background flex flex-wrap items-center gap-3 border-b p-3">
                  <Button ref={back} type="button" size="sm" variant="ghost" className="lg:hidden" onClick={leave}>
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                    {text.back}
                  </Button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="truncate text-sm font-semibold">{names[selected.id].title}</h3>
                    <p className="text-muted-foreground hidden text-xs sm:block">{names[selected.id].description}</p>
                  </div>
                  {onApply ? (
                    <Button type="button" size="sm" disabled={applying} onClick={() => onApply(selected)}>
                      {text.apply}
                    </Button>
                  ) : null}
                </div>
                {/* Focusable, so the page scrolls from the keyboard: what is inside it takes no focus. */}
                <div
                  role="region"
                  tabIndex={0}
                  aria-label={format(text.previewOf, { name: names[selected.id].title })}
                  className="focus-visible:ring-ring/50 min-h-0 flex-1 overflow-y-auto outline-none focus-visible:ring-3 focus-visible:ring-inset lg:p-4"
                >
                  {/* Keyed by the model: a page left half scrolled is not where the next one opens. */}
                  <div key={selected.id} className="bg-background overflow-hidden lg:rounded-lg lg:border">
                    {renderPreview(selected, "large")}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground m-auto max-w-xs p-6 text-center text-sm">{text.largeHint}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
