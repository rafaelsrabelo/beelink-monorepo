// Types
import type { AddressSuggestion } from "@harness-monorepo/contracts"

/** A point, as the address tab passes one around. */
export type Point = Pick<AddressSuggestion, "latitude" | "longitude">

/**
 * Where to ask this app for a picture of a point.
 *
 * A route of this app and never MapTiler's own address: theirs carries the key, and a key in an
 * `<img src>` is a key in every visitor's page source. The handler behind this holds it.
 */
export function mapSrcFor(point: Point | null): string | undefined {
  if (!point) return undefined

  return `/api/addresses/map?lat=${encodeURIComponent(point.latitude)}&lon=${encodeURIComponent(point.longitude)}`
}

/**
 * The point a shop already has, if it has one. A shop saved before this existed was geocoded on
 * the server and carries its coordinates; one that was not shows no map until an address is picked.
 */
export function pointOf(store: { latitude: number | null; longitude: number | null }): Point | null {
  return store.latitude !== null && store.longitude !== null
    ? { latitude: store.latitude, longitude: store.longitude }
    : null
}
