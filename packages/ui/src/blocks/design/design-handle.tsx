"use client"

// React
import type { ReactNode } from "react"

// Libs
import { GripVerticalIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useArrangeItem } from "./design-arrange"

export interface DesignHandleProps {
  id: string
  /** Names the grip for a screen reader. A panel of grips called "Arrastar" names nothing. */
  label: string
  /** The band chosen on its own — a band of several blocks, whose header was picked in the structure. */
  selected?: boolean
  /** The chosen band's actions (`DesignSelectionBar`), over its top right corner while it is selected. */
  bar?: ReactNode
  children: ReactNode
  className?: string
  messages?: UiMessages
}

/**
 * Something in the shop preview, made draggable where it stands.
 *
 * The grip floats over the corner rather than sitting beside the thing, because the thing is the
 * shop's own card and there is no room beside it that is not the shop. It appears on hover and on
 * focus — a handle drawn over every poster all the time is chrome the owner is trying to see past.
 *
 * The grip and not the card carries the drag. Dragging the card itself would mean a poster cannot
 * be clicked, and although nothing in the preview navigates today, a preview where selecting a
 * poster does something is the obvious next thing to want.
 */
export function DesignHandle({
  id,
  label,
  selected = false,
  bar,
  children,
  className,
  messages = defaultMessages,
}: DesignHandleProps) {
  const text = messages.design
  const drag = useArrangeItem(id)

  return (
    <div
      ref={drag.setNodeRef}
      style={drag.style}
      className={cn(
        "group/handle relative",
        drag.isDragging && "z-10 opacity-80 shadow-lg",
        className,
      )}
    >
      {children}

      {selected ? (
        <>
          {/* An outline over the band and not a border on it: a border would move what the shop draws. */}
          <div aria-hidden="true" className="ring-primary pointer-events-none absolute inset-0 z-10 rounded-md ring-2" />
          {bar ? (
            // Above the block covers (z-10) and the grip (z-20); counter-scaled as `DesignEditTag`'s chip is.
            <div
              className="absolute top-3 right-3 z-30"
              style={{ transform: "scale(calc(1 / var(--design-scale, 1)))", transformOrigin: "top right" }}
            >
              {bar}
            </div>
          ) : null}
        </>
      ) : null}

      <button
        type="button"
        aria-label={`${text.dragHandle}: ${label}`}
        className={cn(
          // Above the edit cover (z-10) of the block under it: at a phone's width the band's margin
          // is 16px, and the cover would otherwise sit on the grip and take the drag.
          "bg-background/90 text-foreground absolute top-3 left-3 z-20 flex size-9 cursor-grab items-center justify-center",
          "touch-none rounded-full opacity-0 shadow-sm backdrop-blur transition-opacity",
          "group-hover/handle:opacity-100 focus-visible:opacity-100",
        )}
        {...drag.handleProps}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
