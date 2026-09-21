// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductList, type ProductListItem } from "./product-list"

const products: ProductListItem[] = [
  { id: "1", name: "Whey Concentrado", priceCents: 13990, compareAtPriceCents: 16900, imageUrl: "https://cdn/1.png", categoryName: "Proteínas", isAvailable: true },
  { id: "2", name: "Creatina", priceCents: 8990, compareAtPriceCents: null, imageUrl: null, categoryName: null, isAvailable: false },
]

function renderList(overrides: Partial<Parameters<typeof ProductList>[0]> = {}) {
  return render(<ProductList products={products} onEdit={() => {}} onDelete={() => {}} {...overrides} />)
}

describe("ProductList", () => {
  it("shows the price in the shop's money, from the cents the wire carries", () => {
    renderList()

    const row = screen.getByText("Whey Concentrado").closest("li")
    expect(within(row as HTMLElement).getByText(/139,90/)).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText(/169,00/)).toBeInTheDocument()
  })

  /** This is the screen where a product is put back on sale, so it has to be here, and marked. */
  it("keeps a product that is off sale, and says so", () => {
    renderList()

    const row = screen.getByText("Creatina").closest("li")
    expect(within(row as HTMLElement).getByText("Fora de venda")).toBeInTheDocument()
  })

  it("says so when a product has no category rather than leaving a gap", () => {
    renderList()

    const row = screen.getByText("Creatina").closest("li")
    expect(within(row as HTMLElement).getByText("Sem categoria")).toBeInTheDocument()
  })

  /** Two icon buttons a row: unnamed, each announces as "button" and nothing else. */
  it("names every action after the product it acts on", async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    renderList({ onDelete })

    await user.click(screen.getByRole("button", { name: "Excluir: Creatina" }))

    expect(onDelete).toHaveBeenCalledWith("2")
  })

  it("says what to do when the shop sells nothing yet", () => {
    renderList({ products: [] })

    expect(screen.getByText("Nenhum produto ainda.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList()

    await expectNoA11yViolations(container)
  })
})
