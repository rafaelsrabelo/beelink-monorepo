// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { STOREFRONT_SPANS, StorefrontBandCell } from "./storefront-band-cell"

/**
 * From a 1024px shop each slice is its own share of twelve; from 640px a third and two thirds are
 * halves. Measured on the shop's container, so design mode's phone preview collapses them too.
 */
const CLASSES_OF = {
  FULL: ["shop-sm:col-span-12"],
  TWO_THIRDS: ["shop-sm:col-span-6", "shop-lg:col-span-8"],
  HALF: ["shop-sm:col-span-6"],
  THIRD: ["shop-sm:col-span-6", "shop-lg:col-span-4"],
} as const

describe("StorefrontBandCell", () => {
  /**
   * jsdom has no layout, so the widths themselves are measured in the browser. What this pins is the
   * arithmetic: each slice's share of twelve, which is what two halves sitting side by side rests on.
   */
  it.each(STOREFRONT_SPANS)("takes %s's share of twelve columns", (span) => {
    render(<StorefrontBandCell span={span}>bloco</StorefrontBandCell>)

    expect(screen.getByText("bloco").className.split(" ")).toEqual(expect.arrayContaining([...CLASSES_OF[span]]))
  })

  it("is the whole width below 640px, whatever its slice", () => {
    render(<StorefrontBandCell span="THIRD">bloco</StorefrontBandCell>)

    const cell = screen.getByText("bloco")
    expect(cell.className.split(" ")).toContain("col-span-12")
    expect(cell).toHaveAttribute("data-span", "THIRD")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontBandCell span="HALF">
        <p>bloco</p>
      </StorefrontBandCell>,
    )

    await expectNoA11yViolations(container)
  })
})
