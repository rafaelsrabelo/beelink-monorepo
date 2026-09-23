// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { StorefrontSectionBand } from "./storefront-section-band"

const palette = presets[0]!.colors
// The header of a preset is the darkest value the fixture has, which is what a "dark band" is.
const dark = presets[5]!.colors

describe("StorefrontSectionBand", () => {
  it("paints nothing when the band has no colour of its own", () => {
    render(
      <StorefrontSectionBand primary={palette.primary}>
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )

    const outer = screen.getByText("conteúdo").parentElement!.parentElement!
    expect(outer.getAttribute("style")).toBeNull()
  })

  /**
   * The promise of the level: a shopkeeper picks a colour and never a text colour, and the words
   * on the band are readable anyway. Asserted on the variable the components read, not on a
   * computed style — jsdom does not resolve custom properties into `color`.
   */
  it("redefines the page's ink for everything inside a coloured band", () => {
    render(
      <StorefrontSectionBand primary={palette.primary} background={dark.header}>
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )

    const outer = screen.getByText("conteúdo").parentElement!.parentElement!
    const style = outer.getAttribute("style") ?? ""

    expect(style).toContain("--shop-background")
    expect(style).toContain("--shop-on-background")
    expect(style).toContain("--shop-primary-ink")
    expect(style).toContain("--shop-text")
  })

  it("contains its content inside the shop's measure unless told otherwise", () => {
    const { rerender } = render(
      <StorefrontSectionBand primary={palette.primary}>
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )

    expect(screen.getByText("conteúdo").parentElement!.className).toContain("max-w-")

    rerender(
      <StorefrontSectionBand primary={palette.primary} width="FULL">
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )

    expect(screen.getByText("conteúdo").parentElement!.className).not.toContain("max-w-")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontSectionBand primary={palette.primary} background={dark.header}>
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )

    await expectNoA11yViolations(container)
  })
})
