// Types
import type { AddressSuggestion } from "@harness-monorepo/contracts"

/** A point, as the address tab passes one around. */
export type Point = Pick<AddressSuggestion, "latitude" | "longitude">

/**
 * The map's tiles.
 *
 * This key reaches the browser, and that is the design rather than a slip: tiles are fetched by
 * the page, so no key can stay behind. MapTiler builds for exactly this — a key restricted by
 * `Allowed HTTP Origins`, which the browser sends and a page cannot forge.
 *
 * It is therefore **not** the key the API geocodes with. That one is server-side, restricted by
 * user-agent instead, and lives in `apps/api/.env` where no page can read it. Two keys, because
 * the two restrictions cannot both apply to one: a server sends no `Origin` and would be refused
 * the moment any origin were listed.
 *
 * Absent, there is no map. The form works exactly as well without it.
 */
const TILE_KEY = process.env.NEXT_PUBLIC_MAPTILER_TILE_KEY

/**
 * Raster and not vector. Vector tiles need a WebGL renderer, which is most of a megabyte of
 * JavaScript for a map nobody is asked to explore — and a static rendered image, which would be
 * smaller still, is a paid product at MapTiler while these are not.
 */
const STYLE = "streets-v2"

export function mapTileUrl(): string | undefined {
  if (!TILE_KEY) return undefined

  return `https://api.maptiler.com/maps/${STYLE}/{z}/{x}/{y}.png?key=${encodeURIComponent(TILE_KEY)}`
}

/**
 * The point a shop already has, if it has one. A shop saved before this existed was geocoded on
 * the server and carries its coordinates; one that was not shows the country until an address is
 * picked.
 */
export function pointOf(store: { latitude: number | null; longitude: number | null }): Point | null {
  return store.latitude !== null && store.longitude !== null
    ? { latitude: store.latitude, longitude: store.longitude }
    : null
}
