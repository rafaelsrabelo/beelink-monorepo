// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreMap } from "./store-map"

const TILES = "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=abc"
const ATTRIBUTION = "&copy; MapTiler &copy; OpenStreetMap contributors"
const BRAZIL = { latitude: -14.235, longitude: -51.9253 }

function renderMap(overrides: Partial<Parameters<typeof StoreMap>[0]> = {}) {
  return render(
    <StoreMap
      tileUrl={TILES}
      attribution={ATTRIBUTION}
      fallbackCenter={BRAZIL}
      label="Mapa mostrando onde fica a loja"
      {...overrides}
    />,
  )
}

describe("StoreMap", () => {
  it("is a named region, so it is not an unlabelled box in a list of fields", () => {
    renderMap()

    expect(screen.getByRole("region", { name: "Mapa mostrando onde fica a loja" })).toBeInTheDocument()
  })

  /**
   * MapTiler's licence asks for the credit visibly, and the free plan asks hardest. Leaflet draws
   * it in the corner from what it is handed, so what is asserted is that it was handed something.
   */
  it("credits the provider, which the licence requires", () => {
    const { container } = renderMap()

    expect(container.querySelector(".leaflet-control-attribution")?.textContent).toContain("MapTiler")
  })

  it("draws the tiles the screen addressed, and holds no provider of its own", () => {
    const { container } = renderMap()

    // The template reaches Leaflet as given: a key belongs to the screen, and a block that built
    // this string would be a block that knew a provider.
    expect(container.querySelector(".leaflet-tile-pane")).not.toBeNull()
  })

  it("shows no pin until something says where the shop is", () => {
    const { container } = renderMap()

    expect(container.querySelector(".leaflet-marker-icon")).toBeNull()
  })

  it("drops a pin once a point arrives", () => {
    const { container } = renderMap({ point: { latitude: -3.7436, longitude: -38.4998 } })

    expect(container.querySelector(".leaflet-marker-icon")).not.toBeNull()
  })

  /**
   * Leaflet's default marker is a pair of PNGs addressed relative to its stylesheet, and every
   * bundler moves that stylesheet somewhere the images are not. Ours is inline SVG, so there is
   * nothing to 404.
   */
  it("draws its own pin rather than loading one", () => {
    const { container } = renderMap({ point: { latitude: -3.7436, longitude: -38.4998 } })
    const pin = container.querySelector(".leaflet-marker-icon")

    expect(pin?.querySelector("svg")).not.toBeNull()
    expect(pin?.querySelector("img")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderMap({ point: { latitude: -3.7436, longitude: -38.4998 } })

    await expectNoA11yViolations(container)
  })
})
