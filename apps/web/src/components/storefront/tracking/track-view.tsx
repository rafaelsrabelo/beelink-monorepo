"use client"

// App
import { useTrackView } from "./use-track"
import type { StorefrontEvent } from "@/lib/storefront-event"

export interface TrackViewProps {
  event: StorefrontEvent
  /** What makes this view another one: the search's term, the product's id. */
  viewKey: string
}

/** `useTrackView` for a page drawn on the server: it draws nothing, and tells what the page is. */
export function TrackView({ event, viewKey }: TrackViewProps) {
  useTrackView(event, viewKey)

  return null
}
