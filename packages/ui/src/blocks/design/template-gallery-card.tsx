"use client"

// React
import type { ReactNode, RefObject } from "react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { TemplatePreviewFrame } from "./template-preview-frame"
import { useSeen } from "./use-seen"

/** A model the dictionary has words for. */
export type GalleryTemplateId = keyof UiMessages["design"]["pages"]["form"]["templates"]

/** A model as the gallery offers it: the API's summary, narrowed to what a card says. */
export interface GalleryTemplate {
  id: GalleryTemplateId
  /** Suggested for this shop's category. */
  recommended: boolean
  /** Built around a product the owner has to choose before it can be drawn. */
  needsProduct: boolean
}

export interface TemplateGalleryCardProps {
  template: GalleryTemplate
  selected: boolean
  onSelect: () => void
  /** The model drawn small. Called only once the card has been on screen. */
  renderPreview: () => ReactNode
  /** The card's button, for the gallery to put the focus back on it. */
  buttonRef?: RefObject<HTMLButtonElement | null>
  messages?: UiMessages
}

/**
 * One model on offer: how it looks in this shop, what it is called, what it builds, whether it is
 * suggested and what it asks for. The button and not the card is the target, as in the gallery of
 * sections: a card of pictures and words read aloud as one button says everything at once.
 *
 * Its preview is asked for when the card comes on screen, not when the gallery opens: each one is
 * a page of the shop resolved on the server.
 */
export function TemplateGalleryCard({ template, selected, onSelect, renderPreview, buttonRef, messages = defaultMessages }: TemplateGalleryCardProps) {
  const text = messages.design.templateGallery
  const words = messages.design.pages.form.templates[template.id]
  const [frame, seen] = useSeen<HTMLDivElement>()

  return (
    <li className={cn("bg-card flex flex-col gap-2 rounded-lg border p-2", selected && "border-primary ring-primary/30 ring-2")}>
      <div ref={frame} className="bg-muted/40 min-h-40 overflow-hidden rounded-md">
        {seen ? renderPreview() : <TemplatePreviewFrame state="loading" messages={messages} />}
      </div>

      <div className="flex flex-col gap-1 px-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-semibold">{words.title}</h3>
          {template.recommended ? <Badge variant="secondary">{text.recommended}</Badge> : null}
          {template.needsProduct ? <Badge variant="outline">{text.needsProduct}</Badge> : null}
        </div>
        <p className="text-muted-foreground text-xs">{words.description}</p>
      </div>

      <Button
        ref={buttonRef}
        type="button"
        size="sm"
        variant={selected ? "default" : "outline"}
        aria-pressed={selected}
        aria-label={format(text.viewNamed, { name: words.title })}
        onClick={onSelect}
      >
        {selected ? text.selected : text.view}
      </Button>
    </li>
  )
}
