"use client"

// Libs
import { PlusIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface InsertPointProps {
  /** Where it inserts, said in full: "Nova faixa na posição 2". Every "+" looks alike; this is what tells them apart. */
  label: string
  onInsert: () => void
  disabled?: boolean
  /** A list item where it sits in a list; a plain block at the foot of a band, which is not one. */
  as?: "li" | "div"
  className?: string
}

/**
 * A "+" between two things of the panel, where a new one goes.
 *
 * One verb for adding, where it lands: the "Adicionar bloco" at the top put a band at the foot of
 * the page and the one at each band's foot put a block at the band's end, so two buttons that read
 * alike did different things, and neither could put anything between two others.
 *
 * Shown on hover and on keyboard focus, so a page of bands is not a column of plus signs; always
 * shown where the pointer cannot hover, since a touch screen has no hover to reveal it. A list item,
 * because it sits in the list it inserts into.
 */
export function InsertPoint({ label, onInsert, disabled = false, as: Tag = "li", className }: InsertPointProps) {
  return (
    <Tag className={cn("group/insert relative flex h-3 items-center justify-center", className)}>
      {/* The line the "+" sits on, drawn only while it is in reach. */}
      <span
        aria-hidden="true"
        className="bg-primary/40 absolute inset-x-2 h-px opacity-0 transition-opacity group-focus-within/insert:opacity-100 group-hover/insert:opacity-100"
      />
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onInsert}
        className={cn(
          "bg-background border-shell-border text-foreground relative flex size-6 items-center justify-center rounded-full border shadow-sm",
          "opacity-0 transition-opacity group-hover/insert:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
          "focus-visible:ring-ring outline-none focus-visible:ring-2 disabled:pointer-events-none",
        )}
      >
        <PlusIcon aria-hidden="true" className="size-3.5" />
      </button>
    </Tag>
  )
}
