// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSpecTable } from "./storefront-spec-table"

const rows = [
  { label: "Categoria", value: "Pré-treino" },
  { label: "Sabor", value: "Frutas vermelhas, Limão" },
]

describe("StorefrontSpecTable", () => {
  it("heads each row with its label on the fill, and draws no rule under the last", () => {
    const { container } = render(<StorefrontSpecTable rows={rows} />)

    expect(screen.getByRole("rowheader", { name: "Sabor" })).toHaveClass("w-2/5", "bg-shop-fill", "font-semibold")
    expect(screen.getByRole("cell", { name: "Frutas vermelhas, Limão" })).toBeInTheDocument()
    expect(container.querySelector("tr:last-child")).toHaveClass("last:border-b-0")
  })

  it("draws nothing without rows", () => {
    const { container } = render(<StorefrontSpecTable rows={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontSpecTable rows={rows} />)

    await expectNoA11yViolations(container)
  })
})
