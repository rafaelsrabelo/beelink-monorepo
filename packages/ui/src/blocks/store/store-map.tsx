"use client"

// React
import { useEffect, useRef, useState } from "react"

// Types
import type * as Leaflet from "leaflet"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import type { StorePoint } from "./store-types"

export interface StoreMapProps {
  /**
   * The tile template, key and all — `https://api.maptiler.com/maps/…/{z}/{x}/{y}.png?key=…`.
   * The screen owns it: this block knows no provider and holds no key, exactly like every other
   * block here, and a different provider is a different string rather than a different component.
   */
  tileUrl: string
  /**
   * Shown in the corner and not optional. MapTiler's licence asks for "© MapTiler © OpenStreetMap
   * contributors" visibly, and the free plan is the one that asks hardest.
   */
  attribution: string
  /** Where the shop is, once something has said. Null draws the fallback view with no marker. */
  point?: StorePoint | null
  /** What to look at before an address is picked. */
  fallbackCenter: StorePoint
  fallbackZoom?: number
  pointZoom?: number
  /** What a screen reader calls the map. */
  label: string
  className?: string
}

/**
 * A pin drawn by us rather than Leaflet's own.
 *
 * The default icon is a pair of PNGs addressed relative to the stylesheet, and every bundler moves
 * the stylesheet somewhere the images are not — a marker that silently 404s is the most reported
 * bug in this library. Ours is inline SVG on a token colour, which also means it is not a hex
 * literal (`web/no-hex-colors`).
 */
function pinIcon(L: typeof Leaflet): Leaflet.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: `
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"
           class="drop-shadow-sm" style="color: var(--color-primary)">
        <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"/>
        <circle cx="12" cy="9" r="2.5" fill="var(--color-background)"/>
      </svg>`,
  })
}

/**
 * Where the shop is, on a map, from the moment the tab opens.
 *
 * Tiles and not a rendered image: a static map is a paid product at MapTiler and tiles are not,
 * and the difference is only ever visible here. It also means the map is live rather than a
 * picture, so the fallback view is something to look at before an address exists — which is the
 * whole reason it is drawn before one does.
 *
 * **Leaflet is imported inside the effect, and that is load-bearing.** It reads `window` while its
 * module is evaluating, so a top-level import throws during server rendering — `"use client"` does
 * not prevent that, because a client component is still rendered on the server for the first HTML.
 * An effect never runs there, so the import cannot happen there either. The type import above is
 * erased at compile time and costs nothing.
 *
 * Leaflet owns a DOM node and React must not touch it, which is why everything below happens
 * against a ref. The map is created once; later renders move it.
 *
 * Its stylesheet is imported from `src/styles/globals.css`, not from here — see the note there.
 */
export function StoreMap({
  tileUrl,
  attribution,
  point,
  fallbackCenter,
  fallbackZoom = 4,
  pointZoom = 16,
  label,
  className,
}: StoreMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const leaflet = useRef<typeof Leaflet | null>(null)
  const map = useRef<Leaflet.Map | null>(null)
  const marker = useRef<Leaflet.Marker | null>(null)
  /** Only so the effect below re-runs once the map exists; a ref alone would not wake it. */
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    let abandoned = false

    void (async () => {
      const L = (await import("leaflet")).default

      // The component may have gone while the module was loading.
      if (abandoned || !container.current || map.current) return

      const created = L.map(container.current, {
        center: [fallbackCenter.latitude, fallbackCenter.longitude],
        zoom: fallbackZoom,
        // A form is a column someone scrolls. A map that swallows the wheel traps them inside it.
        scrollWheelZoom: false,
        attributionControl: true,
      })

      L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(created)
      leaflet.current = L
      map.current = created
      setDrawn(true)
    })()

    return () => {
      abandoned = true
      map.current?.remove()
      map.current = null
      marker.current = null
      setDrawn(false)
    }
    // Created once. The tile URL changing would mean a different provider mid-session, which does
    // not happen, and rebuilding the map on it would throw away the view the shopkeeper is reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const L = leaflet.current
    const current = map.current
    if (!L || !current) return

    if (!point) {
      marker.current?.remove()
      marker.current = null
      return
    }

    const position: Leaflet.LatLngExpression = [point.latitude, point.longitude]

    if (marker.current) marker.current.setLatLng(position)
    else marker.current = L.marker(position, { icon: pinIcon(L), keyboard: false }).addTo(current)

    current.flyTo(position, pointZoom, { duration: 0.6 })
  }, [point, pointZoom, drawn])

  return (
    <div
      role="region"
      aria-label={label}
      ref={container}
      className={cn("h-48 w-full overflow-hidden rounded-lg border border-border", className)}
    />
  )
}
