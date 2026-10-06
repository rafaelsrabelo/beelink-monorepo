"use client"

// React
import { createContext, useContext, useEffect, useEffectEvent, useRef } from "react"

// App
import type { StorefrontEvent, Track } from "@/lib/storefront-event"

export interface TrackingContextValue {
  /** Whether anything told now would be sent: the shop has a pixel and the visitor said yes here. */
  allowed: boolean
  track: Track
}

export const TrackingContext = createContext<TrackingContextValue | null>(null)

const UNTOLD: Track = () => {}

/**
 * How a component of the shop window says something happened (BEELINK-272):
 * `track({ name: "AddToCart", item })`. It knows nothing of who is told, or whether anyone is.
 *
 * Outside a shop's own pages — the panel, the design preview, which draw the same blocks — it is a
 * function that does nothing: nothing a shopkeeper does in their panel is a visitor's doing.
 */
export function useTrack(): Track {
  return useContext(TrackingContext)?.track ?? UNTOLD
}

/**
 * Tells what the visitor is looking at — a page, a product, a search — once per `key`, and no
 * event with a null one. It is told when the page is drawn, or at the yes of a visitor who gave it
 * on this very page: where they are then is a fact from after the yes. Whatever they did before it
 * is never told.
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

  useEffect(() => {
    if (allowed) tell()
    // A yes taken back forgets what was told: given again, it is told where the visitor is, like any yes.
    else told.current = null
  }, [allowed, key])
}
