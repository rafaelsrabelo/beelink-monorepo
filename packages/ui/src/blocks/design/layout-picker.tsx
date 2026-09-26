"use client"

// React
import { useState, type ReactElement } from "react"

// UI
import { Popover, PopoverContent, PopoverTrigger } from "@harness-monorepo/ui/components/popover"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ComponentDisplay } from "./design-types"
import { LayoutThumbnail } from "./layout-thumbnail"

export interface LayoutPickerProps {
  /** The layouts the section's kind draws, in the order offered. */
  layouts: readonly ComponentDisplay[]
  value: ComponentDisplay
  onChange: (value: ComponentDisplay) => void
  /** The button that opens it: the bar's icon, or the Layout tab's field. */
  trigger: ReactElement
  /** The group's name for a screen reader: "Trocar layout de Banner". */
  label: string
  messages?: UiMessages
}

/**
 * The layouts a section can take, drawn small and named, in a popover — "Trocar layout", from the
 * bar over the section and from the Layout tab alike. Picking one changes only the look: the
 * section's words, pictures and links stay, for the next layout that draws them.
 *
 * Toggle buttons and not a menu: each says whether it is the one in use, and one press picks it.
 */
export function LayoutPicker({ layouts, value, onChange, trigger, label, messages = defaultMessages }: LayoutPickerProps) {
  const [open, setOpen] = useState(false)
  const names = messages.design.displays

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="w-auto p-2">
        <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
          {layouts.map((layout) => (
            <button
              key={layout}
              type="button"
              aria-pressed={layout === value}
              onClick={() => {
                onChange(layout)
                setOpen(false)
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors",
                "hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                layout === value && "border-primary bg-primary/5",
              )}
            >
              <LayoutThumbnail display={layout} />
              {names[layout]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
