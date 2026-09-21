/**
 * @vitest-environment node
 *
 * The one test that runs where `window` does not exist.
 *
 * Every other test in this package runs in jsdom, which defines `window` — so none of them could
 * ever have caught what this exists for: Leaflet reads `window` while its module evaluates, and a
 * top-level `import` of it threw during server rendering. `"use client"` does not prevent that.
 * A client component is still rendered on the server to produce the first HTML, and Next reported
 * it as "Switched to client rendering because the server rendering errored".
 */

// Libs
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

// Block
import { StoreMap } from "./store-map"

describe("StoreMap, rendered on a server", () => {
  it("renders without reaching for a browser", () => {
    const html = renderToString(
      <StoreMap
        tileUrl="https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=abc"
        attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
        fallbackCenter={{ latitude: -14.235, longitude: -51.9253 }}
        point={{ latitude: -3.7436, longitude: -38.4998 }}
        label="Mapa mostrando onde fica a loja"
      />,
    )

    // The container and its name, and nothing of Leaflet: the map is drawn by an effect, which
    // never runs here.
    expect(html).toContain('aria-label="Mapa mostrando onde fica a loja"')
    expect(html).toContain('role="region"')
    expect(html).not.toContain("leaflet")
  })

  it("does not pull Leaflet in merely by being imported", async () => {
    // If the module graph reached Leaflet at import time, the import above would already have
    // thrown. Importing it again here states that plainly rather than relying on the render.
    await expect(import("./store-map")).resolves.toBeDefined()
  })
})
