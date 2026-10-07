"use client"

// React
import { createContext, useContext, useEffect, useEffectEvent, useRef } from "react"

// App
import type { StorefrontEvent, Track } from "@/lib/storefront-event"

export interface TrackingContextValue {
  /** Whether anything told now would be sent to the shop's pixel: the shop has one and the visitor said yes here. */
  allowed: boolean
  track: Track
}

export const TrackingContext = createContext<TrackingContextValue | null>(null)

const UNTOLD: Track = () => false

/**
 * How a component of the shop window says something happened (BEELINK-272):
 * `track({ name: "AddToCart", item })`. It knows nothing of who is told, or whether anyone is: the
 * shop's pixel and the shop's own count of its funnel (BEELINK-276) are both behind it.
 *
 * Outside a shop's own pages — the panel, the design preview, which draw the same blocks — it is a
 * function that does nothing: nothing a shopkeeper does in their panel is a visitor's doing.
 */
export function useTrack(): Track {
  return useContext(TrackingContext)?.track ?? UNTOLD
}

/**
 * Tells what the visitor is looking at — a page, a product, a search — once per `key`, and no
 * event with a null one.
 *
 * To the shop's pixel it is told when the page is drawn, or at the yes of a visitor who gave it on
 * this very page: where they are then is a fact from after the yes, and whatever they did before
 * it is never told. Without a yes it is told all the same (BEELINK-276) — the dispatch hands it to
 * the shop's own count alone, which counts a view once per page however often it hears of it.
 */
export function useTrackView(event: StorefrontEvent | null, key: string): void {
  const tracking = useContext(TrackingContext)
  const allowed = tracking?.allowed ?? false
  const told = useRef<string | null>(null)
  const tell = useEffectEvent(() => {
    if (!event || told.current === key) return
    // Remembered in a ref, so an effect run twice does not tell it twice.
    told.current = key
    tracking?.track(event)
  })
  const count = useEffectEvent(() => {
    if (event) tracking?.track(event)
  })

  useEffect(() => {
    if (allowed) return tell()
    // A yes taken back forgets what was told: given again, it is told where the visitor is, like any yes.
    told.current = null
    count()
  }, [allowed, key])
}
