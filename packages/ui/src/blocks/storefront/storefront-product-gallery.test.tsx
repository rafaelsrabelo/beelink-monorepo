// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductGallery } from "./storefront-product-gallery"

const images = [
  { id: "i1", url: "https://cdn/1.png", alt: "De frente" },
  { id: "i2", url: "https://cdn/2.png", alt: null },
]

describe("StorefrontProductGallery", () => {
  it("shows the first photo, and another when its thumbnail is pressed", async () => {
    const user = userEvent.setup()
    render(<StorefrontProductGallery images={images} name="Blusa" />)

    expect(screen.getByRole("img", { name: "De frente" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Foto 2 de 2" }))

    expect(screen.getByRole("img", { name: "Blusa" })).toHaveAttribute("src", "https://cdn/2.png")
  })

  it("says there is no photo yet, and has no accessibility violations", async () => {
    const { container } = render(<StorefrontProductGallery images={[]} name="Blusa" />)

    expect(screen.getByText(/foto/i)).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
