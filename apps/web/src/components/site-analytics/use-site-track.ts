"use client"

// React
import { createContext, useContext } from "react"

// App
import type { SiteTrack } from "@/lib/site-analytics"

export const SiteTrackContext = createContext<SiteTrack | null>(null)

const UNTOLD: SiteTrack = () => {}

/**
 * How a screen of Beelink's own site says something happened (BEELINK-320):
 * `track({ name: "sign_up" })`. It knows nothing of who is told, or whether anyone is — that is
 * `SiteAnalytics`, which a measured page is drawn inside.
 *
 * On any other page it is a function that does nothing: the same screen drawn elsewhere tells no one.
 */
export function useSiteTrack(): SiteTrack {
  return useContext(SiteTrackContext) ?? UNTOLD
}
