// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontShowcase, type StorefrontShowcaseItem } from "./storefront-showcase"

const items: StorefrontShowcaseItem[] = [
  { id: "1", title: "Creatina Ultramesh", subtitle: "MESH 500", imageUrl: "https://cdn/1.png", href: "/loja/produtos/creatina", layout: "THIRDS" },
  { id: "2", title: "Whey Concentrado", subtitle: null, imageUrl: "https://cdn/2.png", href: "/loja/produtos/whey", layout: "THIRDS" },
  { id: "3", title: "Invoque seus treinos", subtitle: "Diabo Verde", imageUrl: "https://cdn/3.png", href: "/loja/diabo-verde", layout: "HALVES" },
]

describe("StorefrontShowcase", () => {
  it("sends each card where the shopkeeper pointed it", () => {
    render(<StorefrontShowcase items={items} />)

    expect(screen.getByRole("link", { name: /Creatina Ultramesh/ })).toHaveAttribute(
      "href",
      "/loja/produtos/creatina",
    )
  })

  /**
   * The artwork is decorative: the title is written over it and is the card's whole accessible
   * name. Naming the photograph after the card hands a screen reader the same words twice.
   */
  it("names the card by what is written on it, never by the artwork as well", () => {
    render(<StorefrontShowcase items={[items[0]]} />)

    const card = screen.getByRole("link", {
      name: (name: string) => name.split("Creatina Ultramesh").length - 1 === 1,
    })
    expect(within(card).queryAllByRole("img")).toHaveLength(0)
  })

  /**
   * Consecutive cards of one shape share a row; a change of shape starts a new one. The size is
   * the shopkeeper's choice, so the grid must not be the thing deciding it.
   */
  it("gives a shape of its own a row of its own", () => {
    const { container } = render(<StorefrontShowcase items={items} />)

    const rows = container.querySelectorAll("ul")
    expect(rows).toHaveLength(2)
    expect(rows[0].querySelectorAll("li")).toHaveLength(2)
    expect(rows[1].querySelectorAll("li")).toHaveLength(1)
  })

  /** A card with nowhere to go is a poster: no link, and no arrow promising one. */
  it("draws no arrow and no link for a card with no destination", () => {
    render(<StorefrontShowcase items={[{ ...items[0], href: null }]} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.getByText("Creatina Ultramesh")).toBeInTheDocument()
  })

  it("renders nothing at all for a shop with no blocks", () => {
    const { container } = render(<StorefrontShowcase items={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontShowcase items={items} />)

    await expectNoA11yViolations(container)
  })
})
