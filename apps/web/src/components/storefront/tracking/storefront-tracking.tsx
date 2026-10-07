"use client"

// React
import { useEffect, useMemo, type ReactNode } from "react"

// Next
import Script from "next/script"

// App
import { useConsent } from "../consent-provider"
import { StorefrontPageViews } from "./storefront-page-views"
import { TrackingContext } from "./use-track"
import { marketingAllowed } from "@/lib/consent-cookie"
import { leaveMetaPixel, META_PIXEL_SRC, startMetaPixel, stopMetaPixel } from "@/lib/meta-pixel"
import { createTrack } from "@/lib/storefront-track"

export interface StorefrontTrackingProps {
  /** The shop's Meta Pixel, digits only by the API's rule and the database's; null with none. Data, handed to the library as an argument. */
  pixelId: string | null
  /** The shop's pages no event leaves from (`quietPathsOf`). */
  quietPaths: readonly string[]
  /** Every page of the shop. */
  children: ReactNode
}

/**
 * What a shop tells of its visitor's path, and to whom (BEELINK-272). Around every page of the
 * shop, in its layout — and nowhere else, which is what keeps the panel and the design preview
 * silent: they draw the same blocks and never pass through here.
 *
 * Nothing of Meta's exists until `marketingAllowed()` says yes: no script, no queue for its calls, no cookie. A
 * yes given on the page loads the library and starts the shop's pixel with no reload. A yes taken
 * back stops the sending at once, and so does leaving for a shop that was given none — the library
 * stays in the tab until the next load, shut.
 */
export function StorefrontTracking({ pixelId, quietPaths, children }: StorefrontTrackingProps) {
  const choice = useConsent((consent) => consent.choice)
  const allowed = marketingAllowed({ metaPixelId: pixelId }, choice)
  // The paths arrive as a new array with every page: joined, they are the same value while they say the same.
  const quiet = quietPaths.join("\n")
  const tracking = useMemo(() => ({ allowed, track: createTrack({ pixelId, allowed, quietPaths: quiet ? quiet.split("\n") : [] }) }), [pixelId, allowed, quiet])

  useEffect(() => {
    if (!allowed || !pixelId) return stopMetaPixel()

    startMetaPixel(pixelId)
    // Leaving the shop's pages — for another shop, the landing page, the panel — leaves the library shut behind.
    return leaveMetaPixel
  }, [allowed, pixelId])

  return (
    <TrackingContext value={tracking}>
      <StorefrontPageViews />
      {children}
      {/* Fetched by an effect, after the ones above created the queue: the library finds its calls waiting. */}
      {allowed ? <Script id="meta-pixel" src={META_PIXEL_SRC} strategy="afterInteractive" /> : null}
    </TrackingContext>
  )
}
