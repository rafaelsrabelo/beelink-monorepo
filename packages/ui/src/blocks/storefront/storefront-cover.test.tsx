// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCover } from "./storefront-cover"

describe("StorefrontCover", () => {
  it("links the picture when the shopkeeper gave it somewhere to go", () => {
    render(<StorefrontCover banner={{ imageUrl: "https://cdn/capa.png", href: "/padaria-da-ana?categoria=promocoes" }} />)

    expect(screen.getByRole("link")).toHaveAttribute("href", "/padaria-da-ana?categoria=promocoes")
  })

  it("hides a wordless cover from a screen reader, and describes one that was described", () => {
    const { container, rerender } = render(<StorefrontCover banner={{ imageUrl: "https://cdn/a.png" }} />)
    expect(container.querySelector("img")).toHaveAttribute("aria-hidden", "true")

    rerender(<StorefrontCover banner={{ imageUrl: "https://cdn/a.png", alt: "Bolos de aniversário" }} />)
    expect(screen.getByAltText("Bolos de aniversário")).not.toHaveAttribute("aria-hidden")
  })

  it("is tall over the shop and a strip under it", () => {
    const { container, rerender } = render(<StorefrontCover banner={{ imageUrl: "https://cdn/a.png" }} tall />)
    expect(container.querySelector("img")).toHaveClass("shop-lg:h-96")

    rerender(<StorefrontCover banner={{ imageUrl: "https://cdn/a.png" }} />)
    expect(container.querySelector("img")).toHaveClass("shop-sm:h-48")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCover banner={{ imageUrl: "https://cdn/a.png", alt: "A loja" }} tall />)

    await expectNoA11yViolations(container)
  })
})
