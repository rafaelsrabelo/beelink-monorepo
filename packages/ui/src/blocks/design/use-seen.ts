"use client"

// React
import { useEffect, useRef, useState, type RefObject } from "react"

/** How far outside the screen an element counts as about to be seen, so it is ready as it scrolls in. */
const AHEAD = "200px"

/**
 * Whether an element has been on screen yet. It turns true once and stays: what was drawn for it is
 * kept, so scrolling back does not ask for it again.
 *
 * Where the browser cannot watch (no `IntersectionObserver`) the element counts as seen at once:
 * drawing everything is the safe way to be wrong.
 */
export function useSeen<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (seen || !element) return

    if (typeof IntersectionObserver === "undefined") {
      // Asked of the browser once, on mount: there is nothing to subscribe to.
      setSeen(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true)
      },
      { rootMargin: AHEAD },
    )
    observer.observe(element)

    return () => observer.disconnect()
  }, [seen])

  return [ref, seen]
}
