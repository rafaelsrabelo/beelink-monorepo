"use client"

// React
import type { ReactNode } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** Where a preview is drawn: small in a model's card, or whole beside the list. */
export type TemplatePreviewSize = "card" | "large"

/**
 * What stands where a model's preview goes: on its way, refused, waiting for a product, not
 * something this gallery can ask for — or there, as `children`.
 */
export type TemplatePreviewState = "loading" | "failed" | "needsProduct" | "unavailable" | "ready"

export interface TemplatePreviewFrameProps {
  state: TemplatePreviewState
  size?: TemplatePreviewSize
  /** Why it failed, in the owner's words; the gallery's own sentence when the screen has none. */
  error?: string | null
  onRetry?: () => void
  /** The model drawn by the shop's own renderer. Only read when `state` is "ready". */
  children?: ReactNode
  messages?: UiMessages
}

/**
 * One model's preview, in whichever state it is. Each card holds its own, so a preview that fails
 * says so in its card and the others go on drawing.
 *
 * The drawing is inert and hidden from a screen reader: it is the shop's real renderer, with links, a
 * cart button and a contact form of its own, none of which should take the focus or do anything here.
 * What describes the model is its name and its line, beside it.
 */
export function TemplatePreviewFrame({ state, size = "card", error = null, onRetry, children, messages = defaultMessages }: TemplatePreviewFrameProps) {
  const text = messages.design.templateGallery
  const card = size === "card"

  if (state === "ready") {
    return (
      // Capped in a card: a page drawn at a computer's width and shrunk is still taller than a card.
      <div aria-hidden="true" inert className={cn("pointer-events-none", card && "max-h-56 overflow-hidden")}>
        {children}
      </div>
    )
  }

  if (state === "loading") {
    return (
      <div role="status" aria-busy="true" className={cn("flex flex-col gap-2 p-2", !card && "p-6")}>
        <span className="sr-only">{text.loadingPreview}</span>
        <Skeleton aria-hidden="true" className={cn("w-full", card ? "h-24" : "h-64")} />
        <Skeleton aria-hidden="true" className="h-4 w-2/3" />
        <Skeleton aria-hidden="true" className={cn("w-full", card ? "h-12" : "h-40")} />
      </div>
    )
  }

  const sentence = state === "failed" ? (error ?? text.previewFailed) : state === "needsProduct" ? text.chooseProduct : text.previewUnavailable

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 p-4 text-center", card ? "min-h-40" : "min-h-64")}>
      <p role={state === "failed" ? "alert" : undefined} className={cn("text-sm", state === "failed" ? "text-destructive" : "text-muted-foreground")}>
        {sentence}
      </p>
      {state === "failed" && onRetry ? (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          {text.retry}
        </Button>
      ) : null}
    </div>
  )
}
