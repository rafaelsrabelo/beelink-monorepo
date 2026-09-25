"use client"

// React
import { useCallback, useSyncExternalStore, type RefObject } from "react"

/**
 * Which slide a snapping strip rests on, read from its scroll position: one slide per strip width.
 *
 * The strip scrolls by itself — a finger, a trackpad, before any script — and this only follows it,
 * so a thumbnail or a counter can say where the strip is. It reads 0 on the server and until the
 * strip has a width.
 */
export function useSnapIndex(ref: RefObject<HTMLElement | null>): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const node = ref.current
      if (!node) return () => {}
      node.addEventListener("scroll", onChange, { passive: true })
      window.addEventListener("resize", onChange)
      return () => {
        node.removeEventListener("scroll", onChange)
        window.removeEventListener("resize", onChange)
      }
    },
    [ref],
  )

  return useSyncExternalStore(
    subscribe,
    () => {
      const node = ref.current
      return node && node.clientWidth > 0 ? Math.round(node.scrollLeft / node.clientWidth) : 0
    },
    () => 0,
  )
}

/** Moves a snapping strip to a slide at once, kept within its slides. */
export function scrollToSlide(node: HTMLElement | null, index: number, count: number): void {
  if (!node) return
  node.scrollLeft = Math.max(0, Math.min(count - 1, index)) * node.clientWidth
}
