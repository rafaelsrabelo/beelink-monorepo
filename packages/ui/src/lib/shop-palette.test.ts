// Libs
import { describe, expect, it } from "vitest"

// Lib
import { contrastRatio, readableOn } from "./contrast"
import colours from "./contrast.fixtures.json"
import { shopPaletteStyle, shopPaletteVariables } from "./shop-palette"

const vars = (colors: Parameters<typeof shopPaletteVariables>[0]) =>
  shopPaletteVariables(colors) as unknown as Record<string, string>

describe("the shop's palette", () => {
  it("keeps the brand visible on a header painted in the same colour", () => {
    // The example shop: primary and header are one navy, so the active underline and the cart's
    // badge used to be navy on navy.
    const palette = vars(colours.mutante)
    const accent = palette["--shop-primary-on-header"] as string

    expect(accent).not.toBe(colours.mutante.primary)
    expect(readableOn(accent)).toBe(palette["--shop-on-primary-on-header"])
  })

  it("leaves the brand as the accent when the header is another colour", () => {
    const palette = vars({ ...colours.mutante, header: colours.white })

    expect(palette["--shop-primary-on-header"]).toBe(colours.mutante.primary)
    expect(contrastRatio(colours.mutante.primary, colours.white)).toBeGreaterThanOrEqual(4.5)
  })

  it("picks the dark-page ink of a semantic colour on a dark shop, and the base on a pale one", () => {
    expect(vars(colours.darkShop)["--shop-sale-ink"]).toBe("var(--shop-sale-on-dark)")
    expect(vars(colours.darkShop)["--shop-positive-ink"]).toBe("var(--shop-positive-on-dark)")
    expect(vars(colours.mutante)["--shop-sale-ink"]).toBe("var(--shop-sale)")
    expect(vars(colours.mutante)["--shop-verified-ink"]).toBe("var(--shop-verified)")
  })

  it("derives every neutral from the page's own ink, never from a grey", () => {
    const palette = vars(colours.mutante)

    for (const name of ["muted", "line", "line-strong", "frame", "fill", "placeholder", "canvas"]) {
      expect(palette[`--shop-${name}`]).toMatch(/^color-mix\(in oklab, var\(--shop-on-background\) \d+%, var\(--shop-background\)\)$/)
    }
  })

  it("paints the root and nothing else", () => {
    const style = shopPaletteStyle(colours.mutante)

    expect(style.backgroundColor).toBe("var(--shop-background)")
    expect(style.color).toBe("var(--shop-on-background)")
    expect(shopPaletteVariables(colours.mutante)).not.toHaveProperty("backgroundColor")
  })
})
