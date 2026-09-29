// React
import type { MouseEvent } from "react"

/**
 * A link that opens its place on the page — the conversations' panel — rather than leaving it, for
 * a plain click only. A click that asks for a new tab or window, and a page without scripts, follow
 * the address, which leads to the same thing as a page of its own.
 */
export function openInPlace(event: MouseEvent<HTMLAnchorElement>, open: (() => void) | undefined): void {
  if (!open || event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  open()
}
