// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontBandCell } from "./storefront-band-cell"
import { StorefrontBandGrid } from "./storefront-band-grid"

function grid(bleed?: boolean) {
  return render(
    <StorefrontBandGrid {...(bleed === undefined ? {} : { bleed })}>
      <StorefrontBandCell span="HALF">
        <p>Frete grátis</p>
      </StorefrontBandCell>
      <StorefrontBandCell span="HALF">
        <p>Pix com desconto</p>
      </StorefrontBandCell>
    </StorefrontBandGrid>,
  )
}

describe("StorefrontBandGrid", () => {
  it("lays a contained band on twelve columns, 16px between neighbours and 32px between rows", () => {
    const { container } = grid()

    const classes = (container.firstElementChild as HTMLElement).className.split(" ")
    expect(classes).toEqual(expect.arrayContaining(["grid", "grid-cols-12", "gap-x-4", "gap-y-8"]))
  })

  // Stacked, two pictures used to touch and a phone drew two banners as one.
  it("keeps 16px between the blocks of an edge-to-edge band both ways, side by side and stacked", () => {
    const { container } = grid(true)

    const classes = (container.firstElementChild as HTMLElement).className.split(" ")
    expect(classes).toContain("gap-4")
    expect(classes).not.toContain("gap-y-8")
  })

  it("gives words in an edge-to-edge band the page's side margin, and pictures none", () => {
    const { getByText } = render(
      <StorefrontBandGrid bleed>
        <StorefrontBandCell span="HALF" gutter>
          <p>Frete grátis</p>
        </StorefrontBandCell>
        <StorefrontBandCell span="HALF">
          <p>Foto</p>
        </StorefrontBandCell>
      </StorefrontBandGrid>,
    )

    expect(getByText("Frete grátis").parentElement).toHaveClass("px-4", "shop-sm:px-6", "shop-lg:px-8")
    expect(getByText("Foto").parentElement).not.toHaveClass("px-4")
  })

  it("has no accessibility violations", async () => {
    const { container } = grid()

    await expectNoA11yViolations(container)
  })
})
