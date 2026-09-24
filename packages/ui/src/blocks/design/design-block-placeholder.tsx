// Libs
import { PlusIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BlockThumbnail } from "./block-thumbnail"
import type { ComponentKind } from "./design-types"

export interface DesignBlockPlaceholderProps {
  kind: ComponentKind
  /** What the block is called — its own title if it has one, else the kind's name. */
  label: string
  /** What the owner does next, when it is not the kind's own "add the first thing". */
  action?: string
  className?: string
  messages?: UiMessages
}

/**
 * The place a block holds on the page before it has anything in it.
 *
 * A new block used to draw nothing: the renderer returns `null` for a banner with no pictures, so
 * the owner added one, watched the page not change, and had no surface to point at — the edit
 * cover over it had no height either. The panel listed a block the page did not have.
 *
 * It is drawn only in design mode, never in the shop window. The two draw through one renderer on
 * purpose, so what the owner arranges is what a visitor gets; an empty band shipped to a visitor
 * would break exactly that promise. This is the design layer putting something where the block
 * will be, and the shop window passing nothing.
 *
 * The wireframe is the same one the gallery card carried, on purpose: the owner picked "Banner"
 * from a picture, and the page answers with that picture until the real one arrives.
 */
export function DesignBlockPlaceholder({
  kind,
  label,
  action,
  className,
  messages = defaultMessages,
}: DesignBlockPlaceholderProps) {
  const text = messages.design

  return (
    <div
      className={cn(
        // Container queries, not breakpoints: a band puts this block at a third or a half of the
        // page, and the page it sits in is a desktop-width surface painted small. A `sm:` here
        // would answer the window's width and lay a two-column row into a 300px column.
        "@container border-muted-foreground/30 bg-muted/40 flex min-h-20 flex-col items-center",
        "justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 text-center",
        "@sm:min-h-32 @sm:flex-row @sm:gap-4 @sm:px-6 @sm:py-8 @sm:text-left",
        className,
      )}
    >
      <BlockThumbnail kind={kind} className="w-20 shrink-0 @sm:w-24" />
      <div className="flex min-w-0 flex-col items-center gap-1 @sm:items-start">
        <span className="truncate text-sm font-semibold">{label}</span>
        {/*
          Not a button. The edit cover spans the whole block and is the one tab stop over it, so a
          second control here would be a second name for one action and a tab stop that goes to the
          same place.
        */}
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs @sm:text-sm">
          <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
          {action ?? text.emptyAction[kind]}
        </span>
      </div>
    </div>
  )
}
