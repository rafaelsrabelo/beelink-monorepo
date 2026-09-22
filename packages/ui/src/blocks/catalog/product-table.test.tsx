// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductTable, type ProductTableItem } from "./product-table"

const products: ProductTableItem[] = [
  { id: "1", name: "Whey Concentrado", sku: "WHEY-900", priceCents: 13990, compareAtPriceCents: 16900, imageUrl: "https://cdn/1.png", categoryName: "Proteínas", status: "ACTIVE", soldOut: false, origin: "RESALE", trackStock: true, stockQuantity: 12, viewHref: "https://loja.exemplo/mutante/produtos/whey" },
  { id: "2", name: "Creatina", sku: null, priceCents: 8990, compareAtPriceCents: null, imageUrl: null, categoryName: null, status: "DRAFT", soldOut: false, origin: null, trackStock: false, stockQuantity: null, viewHref: null },
  { id: "3", name: "BCAA", sku: "BCAA-01", priceCents: 6990, compareAtPriceCents: null, imageUrl: null, categoryName: "Proteínas", status: "ACTIVE", soldOut: true, origin: "RESALE", trackStock: true, stockQuantity: 0, viewHref: "https://loja.exemplo/mutante/produtos/bcaa" },
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
   * The row that started all this. "Ativo" beside a stock of zero answered "is it on sale?" with
   * yes when the truth was no, and a shopkeeper went looking for a bug that was in the words.
   */
  it("does not call a product with an empty shelf active", () => {
    renderTable()

    expect(within(row("BCAA")).getByText("Esgotado")).toBeInTheDocument()
    expect(within(row("BCAA")).queryByText("Ativo")).not.toBeInTheDocument()
  })

  /** The shopkeeper's intention is the headline: nobody could have bought an unpublished product. */
  it("calls an unpublished product a draft even when it is also out of stock", () => {
    renderTable({
      products: [{ ...products[1]!, soldOut: true, trackStock: true, stockQuantity: 0 }],
    })

    expect(screen.getByText("Rascunho")).toBeInTheDocument()
    expect(screen.queryByText("Esgotado")).not.toBeInTheDocument()
  })

  /**
   * A link, not a button calling `window.open`: it has to sit in the tab order as a link, open on
   * a middle click and offer "copy address" on a right click.
   */
  it("opens the shop's own page in another tab, as a real link", () => {
    renderTable()

    const eye = within(row("Whey Concentrado")).getByRole("link", { name: /Ver na loja/ })
    expect(eye).toHaveAttribute("href", "https://loja.exemplo/mutante/produtos/whey")
    expect(eye).toHaveAttribute("target", "_blank")
    expect(eye).toHaveAttribute("rel", "noreferrer")
  })

  /** A draft has no public page, so the eye must not point at a 404 — and must say why. */
  it("keeps the eye in place on a draft, disabled and explained", () => {
    renderTable()

    expect(within(row("Creatina")).queryByRole("link", { name: /Ver na loja/ })).not.toBeInTheDocument()
    expect(
      within(row("Creatina")).getByRole("button", { name: /Rascunho não tem página na loja/ }),
    ).toBeDisabled()
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

  /**
   * The eye's reason has to come from the row, not from the missing address. A published product
   * whose shop has not loaded yet also has no href, and calling it a draft tells a screen reader
   * the one thing about it that is false.
   */
  it("does not call a published product a draft when its address is simply not known yet", () => {
    renderTable({ products: [{ ...products[0]!, viewHref: null }] })

    expect(screen.getByRole("button", { name: "Ver na loja: Whey Concentrado" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: /Rascunho/ })).not.toBeInTheDocument()
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
