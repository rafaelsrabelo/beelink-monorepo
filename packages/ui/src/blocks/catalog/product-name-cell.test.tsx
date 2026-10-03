// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductNameCell } from "./product-name-cell"
import { ProductTable } from "./product-table"

describe("ProductNameCell (BEELINK-184)", () => {
  it("says under the name what keeps a carrier from quoting the product", async () => {
    const { container, rerender } = render(<ProductNameCell name="Camiseta" imageUrl={null} carrierGap="NO_WEIGHT" />)
    expect(screen.getByText("Sem peso: não é cotado por transportadora")).toBeInTheDocument()
    await expectNoA11yViolations(container)

    rerender(<ProductNameCell name="Caneca" imageUrl={null} carrierGap="NO_SIZE" messages={en} />)
    expect(screen.getByText("No size: set the default parcel in Integrations")).toBeInTheDocument()
  })

  it("says nothing of carriers for a product nothing is missing from, or a shop with none", () => {
    render(<ProductNameCell name="Whey" imageUrl="/whey.jpg" />)

    expect(screen.getByText("Whey")).toBeInTheDocument()
    expect(screen.queryByText(/transportadora|Integrações/)).toBeNull()
  })

  it("is the name cell of the panel's list, row by row", () => {
    const base = { sku: null, priceCents: 1000, compareAtPriceCents: null, imageUrl: null, categoryName: null, status: "ACTIVE" as const, soldOut: false, origin: null, trackStock: false, stockQuantity: null }
    render(<ProductTable products={[{ ...base, id: "1", name: "Whey" }, { ...base, id: "2", name: "Camiseta", carrierGap: "NO_WEIGHT" }]} onEdit={() => {}} onDelete={() => {}} />)

    const row = screen.getByText("Camiseta").closest("tr")
    expect(row).toHaveTextContent("Sem peso: não é cotado por transportadora")
    expect(screen.getByText("Whey").closest("tr")).not.toHaveTextContent("transportadora")
  })
})
