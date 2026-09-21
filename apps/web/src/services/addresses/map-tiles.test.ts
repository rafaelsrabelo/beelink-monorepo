// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { pointOf } from "./map-tiles"

/**
 * `mapTileUrl` reads its key from a module-level constant, so each case needs the module loaded
 * again under a different environment. Importing it at the top would fix the key for the file.
 */
async function loadWith(key?: string) {
  vi.resetModules()
  if (key === undefined) vi.stubEnv("NEXT_PUBLIC_MAPTILER_TILE_KEY", "")
  else vi.stubEnv("NEXT_PUBLIC_MAPTILER_TILE_KEY", key)

  return import("./map-tiles")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("mapTileUrl", () => {
  it("addresses MapTiler's raster tiles with the configured key", async () => {
    const { mapTileUrl } = await loadWith("uma-chave")

    expect(mapTileUrl()).toBe(
      "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=uma-chave",
    )
  })

  /**
   * No key is a state worth running in: every address field still works and the map is simply not
   * drawn. It is what a preview build and a fresh checkout both look like.
   */
  it("gives nothing when no key is configured, rather than a broken address", async () => {
    const { mapTileUrl } = await loadWith(undefined)

    expect(mapTileUrl()).toBeUndefined()
  })

  it("escapes the key, so one with a slash cannot rewrite the path", async () => {
    const { mapTileUrl } = await loadWith("a/b?c")

    expect(mapTileUrl()).toContain("key=a%2Fb%3Fc")
  })
})

describe("pointOf", () => {
  it("reads a shop that was geocoded when it was saved", () => {
    expect(pointOf({ latitude: -3.7436, longitude: -38.4998 })).toEqual({
      latitude: -3.7436,
      longitude: -38.4998,
    })
  })

  // A shop carried over without coordinates shows the country until an address is picked.
  it.each([
    [null, -38.4998],
    [-3.7436, null],
    [null, null],
  ])("gives nothing for latitude %s and longitude %s", (latitude, longitude) => {
    expect(pointOf({ latitude, longitude })).toBeNull()
  })
})
