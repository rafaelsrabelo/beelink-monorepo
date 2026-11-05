"use client"

// React
import { useEffect, type RefObject } from "react"

/**
 * Says how tall an element stands, as a custom property of the document, for as long as `on` holds —
 * so a stylesheet can keep that much room for it. Measured, and measured again on every resize: the
 * height changes with the width, the language and what the element is saying.
 */
export function useHeightProperty(element: RefObject<HTMLElement | null>, name: `--${string}`, on = true): void {
  useEffect(() => {
    const node = element.current
    if (!on || !node || typeof ResizeObserver === "undefined") return
    const root = document.documentElement
    const say = () => root.style.setProperty(name, `${node.offsetHeight}px`)
    say()
    const observer = new ResizeObserver(say)
    observer.observe(node)
    return () => {
      observer.disconnect()
      root.style.removeProperty(name)
    }
  }, [element, name, on])
}
