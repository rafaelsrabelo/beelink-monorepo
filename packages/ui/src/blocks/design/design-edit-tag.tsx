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
  /** Names the button for a screen reader. A page of buttons called "Editar" names nothing. */
  label: string
  onEdit: () => void
  children: ReactNode
  className?: string
  messages?: UiMessages
}

/**
 * Something in the shop preview, with a way into its fields floating over it.
 *
 * The pencil sits over the corner rather than beside the thing, because the thing is the shop's
 * own card and there is no room beside it that is not the shop. It appears on hover and on focus:
 * a pencil drawn over every component all the time is chrome the owner is trying to see past.
 *
 * It is not the drag handle, and that is the point of it being a second block. Dragging in the
 * preview moves a band; editing opens a component. Putting both on one grip would make the more
 * common gesture — "let me change these words" — start a drag by accident.
 */
export function DesignEditTag({
  label,
  onEdit,
  children,
  className,
  messages = defaultMessages,
}: DesignEditTagProps) {
  const text = messages.design

  return (
    <div className={cn("group/edit relative", className)}>
      {children}

      <button
        type="button"
        aria-label={`${text.editComponent}: ${label}`}
        // Stops the capture handler above the preview from swallowing it — that handler exists to
        // make the shop's own links inert, and this is the one click in the preview that should land.
        onClick={(event) => {
          event.stopPropagation()
          onEdit()
        }}
        className={cn(
          "bg-background/90 text-foreground absolute top-3 right-3 flex size-9 items-center justify-center",
          "rounded-full opacity-0 shadow-sm backdrop-blur transition-opacity",
          "group-hover/edit:opacity-100 focus-visible:opacity-100",
        )}
      >
        <PencilIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
