"use client"

// React
import { useEffect, useRef, useState } from "react"

// Libs
import { XIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { focusNode, regionOf } from "./design-focus"

/** The panel's title, and how a closing panel tells that another has already replaced it. */
export const INSPECTOR_TITLE = "component-inspector-title"

export interface InspectorHeaderProps {
  /** What the panel does: "Editar componente", "Editar faixa". */
  title: string
  /** What it does it to: the block's or the band's name. */
  name: string
  onClose: () => void
  /** False when the editor's keys chose: the focus stays where they are pressed. */
  takeFocus?: boolean
  /** The node the editor's keys walk from, so ↑↓ work with the focus on the heading. */
  nodeId?: string
  messages: UiMessages
}

/**
 * The panel's heading and its close button, and where the focus goes on the way in and out.
 *
 * Mounted once per thing chosen: the focus lands on the heading when a block or a band is chosen —
 * from the preview it would otherwise stay there — and goes back to what chose it when the panel
 * closes, unless another panel has replaced this one and its heading holds the focus now.
 */
export function InspectorHeader({ title, name, onClose, takeFocus = true, nodeId, messages }: InspectorHeaderProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  // What opened this: the preview's block or the list's row. Read while rendering, before the effect
  // of the panel this replaces has run its cleanup and moved the focus somewhere else.
  const [from] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))

  // Read once: the heading takes the focus on the way in, not whenever the flag changes later.
  const [focusOnMount] = useState(takeFocus)

  useEffect(() => {
    if (focusOnMount) heading.current?.focus()
    return () => {
      if (document.getElementById(INSPECTOR_TITLE)) return
      // Chosen by ↑↓, the opener is the stop the key was pressed on, not this one: back to this one's.
      if (!focusOnMount && nodeId) focusNode(from?.isConnected ? regionOf(from) : null, nodeId)
      else if (from?.isConnected) from.focus()
    }
  }, [from, focusOnMount, nodeId])

  return (
    <header className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col">
        <h2
          id={INSPECTOR_TITLE}
          ref={heading}
          tabIndex={-1}
          {...(nodeId ? { "data-design-node": nodeId } : {})}
          className="text-sm font-semibold outline-none"
        >
          {title}
        </h2>
        <p id={`${INSPECTOR_TITLE}-block`} className="text-muted-foreground truncate text-xs">
          {name}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label={messages.design.closeInspector} onClick={onClose}>
        <XIcon aria-hidden="true" className="size-4" />
      </Button>
    </header>
  )
}
