// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductDetails } from "./storefront-product-details"

const specs = [{ label: "Sabor", value: "Uva, Limão" }]

describe("StorefrontProductDetails", () => {
  it("puts the description beside the technical table, as #descricao", () => {
    const { container } = render(<StorefrontProductDetails description={"- Destaque\n\nO resto da descrição."} specs={specs} />)

    expect(screen.getByRole("heading", { level: 2, name: "Descrição do produto" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Informações técnicas" })).toBeInTheDocument()
    expect(screen.queryByText("Destaque")).not.toBeInTheDocument()
    expect(container.querySelector("#descricao .grid")).toHaveClass("shop-lg:grid-cols-2")
  })

  it("lets one stand alone across the width when the other has nothing", () => {
    const { container } = render(<StorefrontProductDetails description={null} specs={specs} />)

    expect(screen.queryByRole("heading", { name: "Descrição do produto" })).not.toBeInTheDocument()
    expect(container.querySelector(".grid")).not.toHaveClass("shop-lg:grid-cols-2")
  })

  it("draws no section with neither", () => {
    const { container } = render(<StorefrontProductDetails description={"- só a lista"} specs={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontProductDetails description="Texto." specs={specs} />)

    await expectNoA11yViolations(container)
  })
})
