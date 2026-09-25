"use client"

// React
import { useEffect, useRef } from "react"

/**
 * Writes the header's real height as `--shop-masthead-height` on the shop window's root, where
 * what sticks below the header — the product page's buy box — and what scrolls into view under it
 * — `#descricao` — can read it. The header sets the variable on itself too, but a variable set on
 * the header reaches only the header's own subtree, and the page is not in it.
 *
 * Measured, not computed: the row of category photographs is as tall as its longest name wraps.
 * Before this runs, readers fall back to the plain header's height, which is most shops.
 */
export function MastheadHeight() {
  const marker = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const header = marker.current?.closest("header")
    const root = header?.closest<HTMLElement>("[data-shop-window]")
    if (!header || !root) return

    const write = () => root.style.setProperty("--shop-masthead-height", `${header.offsetHeight}px`)
    write()
    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(write)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  return <span ref={marker} hidden />
}
