// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFilterChips } from "./storefront-filter-chips"

const chips = [
  { label: "Em promoção", href: "/loja/produtos?opcao=Peso%3A300+g" },
  { label: "300 g", href: "/loja/produtos?desconto=1" },
]

describe("StorefrontFilterChips", () => {
  it("is one link per filter in force, each taking it off, named for a reader", () => {
    render(<StorefrontFilterChips chips={chips} />)

    expect(screen.getByRole("link", { name: "Remover filtro 300 g" })).toHaveAttribute("href", "/loja/produtos?desconto=1")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("draws nothing with nothing in force", () => {
    const { container } = render(<StorefrontFilterChips chips={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFilterChips chips={chips} />)

    await expectNoA11yViolations(container)
  })
})
