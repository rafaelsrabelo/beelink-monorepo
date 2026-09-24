// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { STOREFRONT_SPANS, StorefrontBandCell } from "./storefront-band-cell"

const COLUMNS_OF = { FULL: 12, TWO_THIRDS: 8, HALF: 6, THIRD: 4 } as const

describe("StorefrontBandCell", () => {
  /**
   * jsdom has no layout, so the widths themselves are measured in the browser. What this pins is the
   * arithmetic: each slice's share of twelve, which is what two halves sitting side by side rests on.
   */
  it.each(STOREFRONT_SPANS)("takes %s's share of twelve columns from 640px up", (span) => {
    render(<StorefrontBandCell span={span}>bloco</StorefrontBandCell>)

    expect(screen.getByText("bloco").className).toContain(`sm:col-span-${COLUMNS_OF[span]}`)
  })

  it("is the whole width below 640px, whatever its slice", () => {
    render(<StorefrontBandCell span="THIRD">bloco</StorefrontBandCell>)

    const cell = screen.getByText("bloco")
    expect(cell.className.split(" ")).toContain("col-span-12")
    expect(cell).toHaveAttribute("data-span", "THIRD")
  })
})
