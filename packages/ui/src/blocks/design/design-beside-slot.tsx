"use client"

// Libs
import { PlusIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DesignBesideSlotProps {
  /** The block it adds beside, for the button's name. */
  name: string
  onAdd: () => void
  disabled?: boolean
  className?: string
  messages?: UiMessages
}

/**
 * The room a row has left, drawn in the preview as a place to put something: "+ Adicionar ao lado".
 *
 * A banner at a third stood alone with two thirds of nothing beside it, and nothing on the page
 * said the nothing could be filled. The slot is as wide as the block that would land there, so the
 * owner sees the row they are about to make. Design mode only; the shop window never draws it.
 */
export function DesignBesideSlot({ name, onAdd, disabled = false, className, messages = defaultMessages }: DesignBesideSlotProps) {
  const text = messages.design

  return (
    <button
      type="button"
      aria-label={format(text.addBesideOf, { name })}
      disabled={disabled}
      // The shop's links are made inert by a capture handler above the preview; this one must land.
      onClick={(event) => {
        event.stopPropagation()
        onAdd()
      }}
      className={cn(
        "border-muted-foreground/30 text-muted-foreground flex h-full min-h-32 w-full cursor-pointer items-center",
        "justify-center rounded-lg border-2 border-dashed transition-colors",
        "hover:border-primary hover:text-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {/* Undoes the surface's scale, as the edit chip does, so the words are the size they say. */}
      <span
        className="flex items-center gap-1.5 text-sm font-medium"
        style={{ transform: "scale(calc(1 / var(--design-scale, 1)))" }}
      >
        <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
        {text.addBeside}
      </span>
    </button>
  )
}
