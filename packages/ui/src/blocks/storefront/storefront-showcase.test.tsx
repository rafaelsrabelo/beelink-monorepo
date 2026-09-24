// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontShowcase, type StorefrontShowcaseItem } from "./storefront-showcase"

const creatina: StorefrontShowcaseItem = {
  id: "1",
  title: "Creatina Ultramesh",
  subtitle: "MESH 500",
  imageUrl: "https://cdn/1.png",
  href: "/loja/produtos/creatina",
}

describe("StorefrontShowcase", () => {
  it("sends the card where the shopkeeper pointed it", () => {
    render(<StorefrontShowcase items={[creatina]} span="THIRD" />)

    expect(screen.getByRole("link", { name: /Creatina Ultramesh/ })).toHaveAttribute("href", "/loja/produtos/creatina")
  })

  /**
   * The artwork is decorative: the title is written over it and is the card's whole accessible
   * name. Naming the photograph after the card hands a screen reader the same words twice.
   */
  it("names the card by what is written on it, never by the artwork as well", () => {
    render(<StorefrontShowcase items={[creatina]} span="THIRD" />)

    const card = screen.getByRole("link", {
      name: (name: string) => name.split("Creatina Ultramesh").length - 1 === 1,
    })
    expect(within(card).queryAllByRole("img")).toHaveLength(0)
  })

  /**
   * The width is the cell's, and the shape follows it: a full-width poster is a cinema frame, a
   * third is nearly square. A card that kept one shape at every width would be a letterbox in a
   * third and a tower across the band.
   */
  it("takes its proportion from the slice it sits in", () => {
    const { rerender } = render(<StorefrontShowcase items={[creatina]} span="FULL" />)
    expect(screen.getByRole("link").className).toContain("lg:aspect-[21/9]")

    rerender(<StorefrontShowcase items={[creatina]} span="THIRD" />)
    expect(screen.getByRole("link").className).toContain("aspect-[4/3]")
    expect(screen.getByRole("link").className).not.toContain("21/9")
  })

  /** A card with nowhere to go is a poster: no link, and no arrow promising one. */
  it("draws no arrow and no link for a card with no destination", () => {
    render(<StorefrontShowcase items={[{ ...creatina, href: null }]} span="HALF" />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.getByText("Creatina Ultramesh")).toBeInTheDocument()
  })

  it("renders nothing at all for a banner with no picture", () => {
    const { container } = render(<StorefrontShowcase items={[]} span="FULL" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontShowcase items={[creatina]} span="HALF" />)

    await expectNoA11yViolations(container)
  })
})
