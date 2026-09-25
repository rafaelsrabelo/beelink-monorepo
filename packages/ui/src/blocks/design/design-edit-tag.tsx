"use client"

// React
import type { ReactNode } from "react"

// Libs
import { PencilIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DesignEditTagProps {
  /** Names the button for a screen reader, and is the word shown on the block. */
  label: string
  onEdit: () => void
  /** Drawn as selected: the panel's row and the block are the same thing seen twice. */
  selected?: boolean
  /** The chosen block's actions (`DesignSelectionBar`), drawn in the chip's place while it is selected. */
  bar?: ReactNode
  /** The node the editor's keys walk from — ↑↓ and Alt+↑↓ work with the focus on the block. */
  nodeId?: string
  children: ReactNode
  className?: string
  messages?: UiMessages
}

/** Undoes the surface's scale, anchored top right — the chip's reasoning below applies to the bar alike. */
const COUNTER_SCALE = { transform: "scale(calc(1 / var(--design-scale, 1)))", transformOrigin: "top right" } as const

/**
 * Something in the shop preview, and the way into its fields.
 *
 * **The whole block is the target.** It used to be a 36px circle in the corner — 0.9% of a block
 * 928 by 160 — drawn at `opacity-0` until the wrapper was hovered, over a `<div>` with no cursor
 * and no tab stop. The owner's words were that you could not tell anything there was clickable,
 * and the measurement agrees: a control that is invisible until you find it is a control you find
 * by accident. Now the cover spans the block, so pointing anywhere at it is pointing at the way in.
 *
 * **It says which block it is.** The panel beside it truncates a name to fit its row — a banner
 * read as "B…" — so the block names itself where there is room for the word.
 *
 * The cover is a `<button>` and not a handler on a div: it takes a tab stop, answers Enter and
 * Space, and carries the name a screen reader reads. Dragging still belongs to the band handle
 * around it, never here — a drag and an edit on one gesture makes "change these words" start a
 * drag by accident.
 */
export function DesignEditTag({
  label,
  onEdit,
  selected = false,
  bar,
  nodeId,
  children,
  className,
  messages = defaultMessages,
}: DesignEditTagProps) {
  const text = messages.design

  /*
    No scrolling from here, deliberately.

    Bringing the selected block into view is worth doing — the API puts a new band last — but
    `scrollIntoView` from inside this block is the wrong place to do it: the preview paints under
    `transform: scale()`, so the browser resolves the element's box through that transform and
    scrolls an ancestor by an amount that does not match what the owner sees. It was reported as
    the screen jumping and locking up. Whoever owns the scroll container is the one that can do
    this correctly, and until that exists the panel's row is the way to find a block.
  */

  const barShown = selected && bar !== undefined

  return (
    <div className={cn("relative", className)}>
      {children}

      <button
        type="button"
        aria-label={`${text.editComponent}: ${label}`}
        aria-current={selected ? "true" : undefined}
        {...(nodeId ? { "data-design-node": nodeId } : {})}
        // Stops the capture handler above the preview from swallowing it — that handler exists to
        // make the shop's own links inert, and this is the one click in the preview that should land.
        onClick={(event) => {
          event.stopPropagation()
          onEdit()
        }}
        className={cn(
          "group/edit absolute inset-0 z-10 flex cursor-pointer items-start justify-end p-3",
          "ring-primary rounded-md transition-[box-shadow,background-color]",
          "hover:bg-primary/5 hover:ring-2",
          "focus-visible:ring-2 focus-visible:outline-none",
          selected && "ring-2",
        )}
      >
        {/*
          The chip carries the pencil and the name together. Shown on hover, on focus and while the
          block is the selected one — the third case is what keeps the preview and the panel
          agreeing about which block the open form belongs to. The bar takes its place when given.
        */}
        {barShown ? null : (
          <span
            /*
              Undoes the surface's scale, so the name is the size it says it is.

              `DesignPreview` paints the shop at a desktop width and shrinks it with `transform`,
              which shrinks this chip too: at the panel widths the admin actually gives, the scale
              lands near 0.5 and a 12px name paints at 6px. The number arrives as `--design-scale`,
              published by the surface, so there is no second measurement to drift from the first.
              Absolutely positioned and anchored top-right, so undoing the scale moves nothing in
              flow — the surface's own height measurement feeds a ResizeObserver, and changing what
              it measures from inside it is how a layout loop starts.
            */
            style={COUNTER_SCALE}
            className={cn(
              "bg-background/90 text-foreground flex max-w-[70%] items-center gap-1.5 rounded-full",
              "px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur",
              "opacity-0 transition-opacity",
              "group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100",
              selected && "opacity-100",
            )}
          >
            <PencilIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
        )}
      </button>

      {/* Beside the cover and not in it: a button inside a button is invalid, and its clicks would open the fields again. */}
      {barShown ? (
        <div className="absolute top-3 right-3 z-20" style={COUNTER_SCALE}>
          {bar}
        </div>
      ) : null}
    </div>
  )
}
