// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontImageText } from "./storefront-image-text"

const media = {
  imageUrl: "https://cdn.example/bolsa.png",
  alt: "Uma bolsa caramelo",
  button: { label: "Ver a coleção", href: "/loja/bolsas", external: false },
}

describe("StorefrontImageText", () => {
  it("draws the picture, the words and the button", () => {
    render(<StorefrontImageText layout="IMAGE_LEFT" title="Feito à mão" body="Peça por peça." media={media} />)

    expect(screen.getByRole("img", { name: "Uma bolsa caramelo" })).toHaveAttribute("src", media.imageUrl)
    expect(screen.getByRole("heading", { level: 2, name: "Feito à mão" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver a coleção" })).toHaveAttribute("href", "/loja/bolsas")
  })

  it("keeps the picture first in the page and moves it right only where it sits beside the words", () => {
    const { container, rerender } = render(<StorefrontImageText layout="IMAGE_RIGHT" title="Feito à mão" media={media} />)

    expect(container.firstElementChild!.firstElementChild!.tagName).toBe("IMG")
    expect(screen.getByRole("img")).toHaveClass("shop-md:order-last")

    rerender(<StorefrontImageText layout="IMAGE_RIGHT" title="Feito à mão" media={media} span="THIRD" />)
    expect(screen.getByRole("img")).not.toHaveClass("shop-md:order-last")
  })

  it("treats a picture nobody described as decorative", () => {
    const { container } = render(<StorefrontImageText layout="IMAGE_LEFT" title="Feito à mão" media={{ ...media, alt: null }} />)

    expect(container.querySelector("img")).toHaveAttribute("alt", "")
  })

  it("draws the words alone with no picture, and nothing with neither", () => {
    const { container, rerender } = render(<StorefrontImageText layout="IMAGE_LEFT" title="Feito à mão" />)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByRole("heading")).toBeInTheDocument()

    rerender(<StorefrontImageText layout="IMAGE_LEFT" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("draws no button where it leads nowhere any more", () => {
    render(<StorefrontImageText layout="IMAGE_LEFT" title="Feito à mão" media={{ ...media, button: { ...media.button, href: null } }} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <StorefrontImageText layout="IMAGE_RIGHT" title="Feito à mão" body="Peça por peça." media={media} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
