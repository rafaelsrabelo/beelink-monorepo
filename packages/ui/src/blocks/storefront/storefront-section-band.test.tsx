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

  // Declared on the root, a mix keeps the page's colours inside the band: a card in the page's pale
  // wash under a dark band's white words. Declared again here, it is mixed from the band's own.
  it("declares again every wash, neutral and ink mixed from the page's background", () => {
    render(
      <StorefrontSectionBand primary={palette.primary} background={dark.header}>
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )

    const style = screen.getByText("conteúdo").parentElement!.parentElement!.getAttribute("style") ?? ""
    for (const name of ["--shop-primary-tint", "--shop-fill", "--shop-line", "--shop-muted", "--shop-sale-ink"]) {
      expect(style).toContain(name)
    }
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

  // The page's one spacing, painted: a coloured band of words gets 32px of its colour around them.
  it("gives its words 32px of its own colour above and below when padded, at either width", () => {
    const { rerender } = render(
      <StorefrontSectionBand primary={palette.primary} background={dark.header} padded>
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )
    expect(screen.getByText("conteúdo").parentElement).toHaveClass("py-8")

    rerender(
      <StorefrontSectionBand primary={palette.primary} background={dark.header} width="FULL" padded>
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )
    expect(screen.getByText("conteúdo").parentElement).toHaveClass("py-8")

    rerender(
      <StorefrontSectionBand primary={palette.primary} background={dark.header}>
        <p>conteúdo</p>
      </StorefrontSectionBand>,
    )
    expect(screen.getByText("conteúdo").parentElement).not.toHaveClass("py-8")
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
