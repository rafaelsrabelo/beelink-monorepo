// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontBenefits } from "./storefront-benefits"

describe("StorefrontBenefits", () => {
  it("says what the shopkeeper wrote", () => {
    render(<StorefrontBenefits items={[{ id: "1", title: "Frete grátis", detail: "Acima de R$ 199" }]} />)

    expect(screen.getByText("Frete grátis")).toBeInTheDocument()
    expect(screen.getByText("Acima de R$ 199")).toBeInTheDocument()
  })

  // This is the off switch. A band with no rows is a band the shopkeeper emptied, not an empty
  // strip to look at.
  it("draws no band at all when it has no rows", () => {
    const { container } = render(<StorefrontBenefits items={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("draws a row that has no line under it", () => {
    render(<StorefrontBenefits items={[{ id: "1", title: "Entrega em toda a cidade" }]} />)

    expect(screen.getByText("Entrega em toda a cidade")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontBenefits
        items={[
          { id: "1", title: "Frete grátis", detail: "Acima de R$ 199" },
          { id: "2", title: "PIX", detail: "Na hora" },
        ]}
      />,
    )

    await expectNoA11yViolations(container)
  })

  // The same promises, another look: each its own card.
  it("has no accessibility violations as cards", async () => {
    const { container } = render(<StorefrontBenefits layout="CARDS" items={[{ id: "1", title: "Frete grátis", detail: "Acima de R$ 199" }]} />)

    await expectNoA11yViolations(container)
  })

  it("gives each promise a card of its own when laid out as Cartões", () => {
    render(<StorefrontBenefits layout="CARDS" items={[{ id: "1", title: "Frete grátis", detail: "Acima de R$ 199" }, { id: "2", title: "Pix" }]} />)

    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByText("Acima de R$ 199")).toBeInTheDocument()
  })
})
