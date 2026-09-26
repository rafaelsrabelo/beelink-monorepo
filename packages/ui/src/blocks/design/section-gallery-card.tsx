"use client"

// React
import type { ReactNode } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BlockThumbnail } from "./block-thumbnail"
import type { GalleryEntry } from "./section-gallery-entries"

export interface SectionGalleryCardProps {
  entry: GalleryEntry
  /** The section drawn as the shop would draw it; its wireframe where the screen draws none. */
  preview?: ReactNode
  onAdd: () => void
  pending?: boolean
  messages?: UiMessages
}

/**
 * One section on offer: how it looks, what it is called, one line of what it does, and the button
 * that adds it. The button and not the card is the target: a card of pictures and words read aloud
 * as one button says everything at once, and a preview with links of its own would nest them.
 */
export function SectionGalleryCard({ entry, preview, onAdd, pending = false, messages = defaultMessages }: SectionGalleryCardProps) {
  const text = messages.design.gallery

  return (
    <li className="bg-card flex flex-col gap-2 rounded-lg border p-2">
      {/*
        Inert and not only hidden: a preview is the shop's own renderer, and a contact form in it has
        fields a keyboard would otherwise tab into — invisible to a screen reader, out of the mouse's reach.
      */}
      <div aria-hidden="true" inert className="bg-muted/40 pointer-events-none overflow-hidden rounded-md">
        {preview ?? <BlockThumbnail kind={entry.kind} across={entry.across} />}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">{entry.name}</span>
          <span className="text-muted-foreground text-xs">{entry.hint}</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={format(text.addNamed, { name: entry.name })}
          disabled={pending}
          onClick={onAdd}
          className="shrink-0"
        >
          {text.add}
        </Button>
      </div>
    </li>
  )
}
