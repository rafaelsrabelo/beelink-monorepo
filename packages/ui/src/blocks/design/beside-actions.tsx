"use client"

// Libs
import { ArrowUpToLineIcon, Columns2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface BesideActionsProps {
  /** The block's name, so each button says which block it acts beside. */
  name: string
  /** A block beside this one, in the same row. Absent when the row has no room for another. */
  onAddBeside?: () => void
  /** This band's only block, moved up beside the last block of the band above. */
  joinAbove?: { name: string; onJoin: () => void } | null
  disabled?: boolean
  messages?: UiMessages
}

/**
 * How two blocks end up side by side without the owner knowing what a band is.
 *
 * Two buttons in words, always in sight. The "+" at a band's foot did this before, drawn only on
 * hover and alike to the "+" between bands, and a block added through it came in whole and fell
 * below — "não consigo colocar banners ao lado do outro, somente embaixo", in the owner's words.
 */
export function BesideActions({ name, onAddBeside, joinAbove = null, disabled = false, messages = defaultMessages }: BesideActionsProps) {
  const text = messages.design
  if (!onAddBeside && !joinAbove) return null

  return (
    <div className="flex flex-wrap gap-2">
      {onAddBeside ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={format(text.addBesideOf, { name })}
          disabled={disabled}
          onClick={onAddBeside}
        >
          <Columns2Icon aria-hidden="true" />
          {text.addBeside}
        </Button>
      ) : null}
      {joinAbove ? (
        // Wraps rather than running out of a 360px column: the name is the owner's, and can be long.
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto min-h-7 max-w-full py-1 text-left whitespace-normal"
          disabled={disabled}
          onClick={joinAbove.onJoin}
        >
          <ArrowUpToLineIcon aria-hidden="true" />
          {format(text.joinAbove, { name: joinAbove.name })}
        </Button>
      ) : null}
    </div>
  )
}
