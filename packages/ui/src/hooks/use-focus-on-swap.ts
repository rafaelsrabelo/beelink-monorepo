"use client"

// React
import { useEffect, useRef } from "react"
import type { RefObject } from "react"

const FOCUSABLE = "input:not([type=hidden]), button:not([disabled]), [tabindex='-1']"

/**
 * When a block swaps what it shows — a search for a card, a list for a form — the control that had
 * focus is gone, and the browser drops focus to the page. This puts it on the first control of what
 * replaced it. The first view, and one arriving after `skipAfter`, are left alone: a page that
 * loads, or a record that arrives, must not pull focus away from wherever the reader is.
 */
export function useFocusOnSwap(view: string, container: RefObject<HTMLElement | null>, skipAfter?: string): void {
  const previous = useRef(view)

  useEffect(() => {
    const was = previous.current
    previous.current = view
    if (was === view || was === skipAfter) return
    container.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [view, container, skipAfter])
}
