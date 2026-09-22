// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductTable, type ProductTableItem } from "./product-table"

const products: ProductTableItem[] = [
  { id: "1", name: "Whey Concentrado", sku: "WHEY-900", priceCents: 13990, compareAtPriceCents: 16900, imageUrl: "https://cdn/1.png", categoryName: "Proteínas", status: "ACTIVE", origin: "RESALE", trackStock: true, stockQuantity: 12 },
  { id: "2", name: "Creatina", sku: null, priceCents: 8990, compareAtPriceCents: null, imageUrl: null, categoryName: null, status: "DRAFT", origin: null, trackStock: false, stockQuantity: null },
]

function renderTable(overrides: Partial<Parameters<typeof ProductTable>[0]> = {}) {
  return render(<ProductTable products={products} onEdit={() => {}} onDelete={() => {}} {...overrides} />)
}

function row(name: string) {
  return screen.getByRole("row", { name: new RegExp(name) })
}

describe("ProductTable", () => {
  it("shows the price in the shop's money, from the cents the wire carries", () => {
    renderTable()

    expect(within(row("Whey Concentrado")).getByText(/139,90/)).toBeInTheDocument()
    expect(within(row("Whey Concentrado")).getByText(/169,00/)).toBeInTheDocument()
  })

  /** This is the screen where a draft is published, so it has to be here, and marked. */
  it("keeps a draft in the table, and says which one it is", () => {
    renderTable()

    expect(within(row("Creatina")).getByText("Rascunho")).toBeInTheDocument()
    expect(within(row("Whey Concentrado")).getByText("Ativo")).toBeInTheDocument()
  })

  /**
   * The distinction the boolean this replaced could not make. A shop selling made to order counts
   * nothing, and printing 0 would read as "sold out" — which is a different thing to fix.
   */
  it("tells an uncounted product apart from one with none left", () => {
    renderTable()

    expect(within(row("Creatina")).getByText("Não controlado")).toBeInTheDocument()
    expect(within(row("Whey Concentrado")).getByText("12")).toBeInTheDocument()
  })

  it("says the shopkeeper has not said, rather than guessing who made it", () => {
    renderTable()

    expect(within(row("Creatina")).getByText("Não informado")).toBeInTheDocument()
    expect(within(row("Whey Concentrado")).getByText("Revenda")).toBeInTheDocument()
  })

  it("fills the code column rather than leaving a gap when there is no code", () => {
    renderTable()

    expect(within(row("Whey Concentrado")).getByText("WHEY-900")).toBeInTheDocument()
    expect(within(row("Creatina")).getByText("—")).toBeInTheDocument()
  })

  it("says so when a product has no category rather than leaving a gap", () => {
    renderTable()

    expect(within(row("Creatina")).getByText("Sem categoria")).toBeInTheDocument()
  })

  /** Two icon buttons a row: unnamed, each announces as "button" and nothing else. */
  it("names every action after the product it acts on", async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    renderTable({ onDelete })

    await user.click(screen.getByRole("button", { name: "Excluir: Creatina" }))

    expect(onDelete).toHaveBeenCalledWith("2")
  })

  it("says what to do when the shop sells nothing yet", () => {
    renderTable({ products: [] })

    expect(screen.getByText("Nenhum produto ainda.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderTable()

    await expectNoA11yViolations(container)
  })
})
