"use client"

// React
import { useCallback, useRef, useSyncExternalStore, type ReactNode } from "react"

/** What the surface is built at. It is what the storefront's own `max-w-[1440px]` targets. */
export const PREVIEW_WIDTH = 1440

export interface DesignPreviewProps {
  children: ReactNode
}

/**
 * The shop window at its real size, painted small enough to sit beside an editor.
 *
 * **Why not just let it fill the pane.** The storefront's blocks size against the viewport, not
 * against a container — thirty-three `sm:`/`lg:` variants across them and no `@container` anywhere
 * — so a narrow pane does not give a narrow *phone*, it gives a broken desktop. Measured before
 * this was written: the poster band collapsed from 1440px to 700px and the footer's columns from
 * 322px to 137px. What the owner would have been arranging is a layout no visitor ever sees.
 *
 * So the surface is built at a desktop width and `transform: scale()` paints it smaller.
 * `transform` runs at paint time and changes no layout, so nothing inside is squeezed.
 *
 * **Why this is a desktop preview and not a device switcher.** A media query resolves against the
 * window, which the surface's width does not change. The storefront uses `sm:` and `lg:` and no
 * other breakpoint, so at any editor window of 1024px or more the 1440px surface draws exactly
 * what a desktop visitor is served — the preview is true. A 390px surface is not: measured in
 * Chrome at a 1574px window, `sm:` still matched and the payment band drew its four columns inside
 * 390 pixels, where a real phone draws two. Scaling cannot fix that; only a separate viewport can,
 * which means an iframe. Until there is one, this shows the one width it can show honestly.
 *
 * The wrapper's height has to be set by hand: a scaled element still occupies its unscaled box, so
 * without this the pane would reserve the full 1440-wide height and leave a hole under the shop.
 */
export function DesignPreview({ children }: DesignPreviewProps) {
  const pane = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const width = PREVIEW_WIDTH

  // `useSyncExternalStore` rather than a `setState` in an effect: it is what React 19 offers for
  // reading layout, and its server snapshot is a scale of 1 — so the markup is the shop at full
  // size until the browser can measure, never a flash of something mis-sized.
  const watch = useCallback((changed: () => void) => {
    const el = pane.current
    const inner = surface.current
    if (!el) return () => {}

    const observer = new ResizeObserver(changed)
    observer.observe(el)
    if (inner) observer.observe(inner)

    return () => observer.disconnect()
  }, [])

  const measured = useSyncExternalStore(
    watch,
    () => {
      const el = pane.current
      const inner = surface.current
      if (!el || !inner) return "1:0"

      // One string, because `useSyncExternalStore` compares snapshots by identity and a fresh
      // object every read is an infinite render.
      return `${el.clientWidth / width}:${inner.scrollHeight}`
    },
    () => "1:0",
  )

  const [scaleRaw, heightRaw] = measured.split(":")
  const scale = Math.min(Number(scaleRaw) || 1, 1)
  const height = Number(heightRaw) || 0

  return (
    <div ref={pane} className="w-full overflow-hidden" style={height ? { height: height * scale } : undefined}>
      <div
        ref={surface}
        style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  )
}
