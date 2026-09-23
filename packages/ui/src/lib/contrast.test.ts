// Libs
import { describe, expect, it } from "vitest"

// Lib
import { contrastRatio, readableOn, relativeLuminance, toneOn } from "./contrast"
import colours from "./contrast.fixtures.json"

/**
 * The colours live in a `.json` beside this file, not in it. `web/no-hex-colors` scans this
 * package at an absolute zero baseline and is right to — but a test of a hex parser needs hex.
 * `store-palettes.json` already set the precedent and wrote down why: a `.json` can hold no
 * className, no style attribute and no component, which is the whole of what that gate stops.
 */
const { black, white, shortWhite, translucentWhite, midGrey, brands } = colours

const INK = "oklch(0 0 0)"
const PAPER = "oklch(1 0 0)"

describe("relativeLuminance", () => {
  it("puts black at 0 and white at 1", () => {
    expect(relativeLuminance(black)).toBe(0)
    expect(relativeLuminance(white)).toBe(1)
  })

  it("reads the three shapes the shop's colour columns accept", () => {
    // They are VarChar(9): #rgb, #rrggbb and #rrggbbaa all fit.
    expect(relativeLuminance(shortWhite)).toBe(1)
    expect(relativeLuminance(translucentWhite)).toBe(1)
  })

  it("reads mid-grey for anything it cannot parse", () => {
    // Which lands on white text — the safer of the two guesses on a page a stranger asked for.
    expect(relativeLuminance("rebeccapurple")).toBe(0.5)
    expect(relativeLuminance("")).toBe(0.5)
  })
})

describe("contrastRatio", () => {
  it("is 21 between black and white, and 1 for a colour against itself", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5)
    expect(contrastRatio(brands[0]!, brands[0]!)).toBeCloseTo(1, 5)
  })

  it("does not care which way round it is asked", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(contrastRatio(white, black), 5)
  })
})

describe("readableOn", () => {
  it("writes in black on a pale shop and in white on a dark one", () => {
    expect(readableOn(white)).toBe(INK)
    expect(readableOn(black)).toBe(PAPER)
  })

  // The defect this exists for: the storefront used to print every word on a coloured surface in
  // the page's own background colour. A shop with a black page and a black header was black on
  // black, and nothing in the panel would have warned the owner.
  it("keeps a black page and a black header apart", () => {
    expect(readableOn(black)).not.toBe(readableOn(white))
  })

  it("clears WCAG AA on every brand colour the product ships", () => {
    for (const brand of brands) {
      const chosen = readableOn(brand) === PAPER ? white : black

      expect(contrastRatio(brand, chosen)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("picks the better of the two even when both are poor", () => {
    // Mid-grey is the worst case there is: neither black nor white reaches 4.5:1 on it, and the
    // page still has to be as readable as it can be rather than correct.
    const chosen = readableOn(midGrey) === PAPER ? white : black
    const other = chosen === white ? black : white

    expect(contrastRatio(midGrey, chosen)).toBeGreaterThan(contrastRatio(midGrey, other))
  })
})

describe("toneOn", () => {
  it("leaves a brand that already reads exactly as the shopkeeper chose it", () => {
    // Most of them. This only ever moves the two a shopkeeper cannot see at all.
    for (const brand of brands) {
      if (contrastRatio(brand, white) >= 4.5) expect(toneOn(brand, white)).toBe(brand)
    }
  })

  it("darkens a pale brand until it reads on a pale page", () => {
    const toned = toneOn(colours.paleBrand, white)

    expect(toned).not.toBe(colours.paleBrand)
    expect(contrastRatio(colours.paleBrand, white)).toBeLessThan(4.5)
  })

  it("lightens a dark brand until it reads on a dark page", () => {
    const toned = toneOn(colours.darkBrand, black)

    expect(toned).not.toBe(colours.darkBrand)
    expect(toned).toMatch(/^rgb\(/)
  })

  // The whole point: the result is measured, not hoped for. A mix computed in one colour space and
  // checked in another would return a number the browser never renders.
  it("stops at the first step that actually clears AA", () => {
    for (const brand of [colours.paleBrand, colours.darkBrand]) {
      for (const surface of [white, black]) {
        const toned = toneOn(brand, surface)
        const [r, g, b] = toned.startsWith("rgb")
          ? toned.slice(4, -1).split(" ").map(Number)
          : [null, null, null]

        if (r !== null) {
          const asHex = `#${[r, g, b].map((c) => (c as number).toString(16).padStart(2, "0")).join("")}`
          expect(contrastRatio(asHex, surface)).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})
