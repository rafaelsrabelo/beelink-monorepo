// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { importCategories, importRows } from "./product-import-fixtures"
import { ProductImportReview } from "./product-import-review"
import { ProductImportReviewSkeleton } from "./product-import-review-skeleton"

const noop = () => {}
const priced = importRows.map((row) => (row.price === "" ? { ...row, price: "7,00" } : row))

describe("ProductImportReview", () => {
  it("waits for every ticked row to have a price, and says so", async () => {
    const { container } = render(
      <ProductImportReview rows={importRows} categories={importCategories} onChange={noop} onSubmit={noop} onRestart={noop} />,
    )

    expect(screen.getByRole("button", { name: "Importar marcados (3)" })).toBeDisabled()
    expect(screen.getByText("Há produtos marcados sem preço. Digite o preço ou desmarque a linha.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("imports once every ticked row is priced, and counts the ticked ones", async () => {
    const onSubmit = vi.fn()
    render(
      <ProductImportReview
        rows={priced.map((row, index) => (index === 1 ? { ...row, include: false } : row))}
        categories={importCategories}
        onChange={noop}
        onSubmit={onSubmit}
        onRestart={noop}
      />,
    )

    expect(screen.getByText("2 de 3 marcados")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Importar marcados (2)" }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it("waits for a ticked row whose name was cleared", () => {
    render(
      <ProductImportReview
        rows={priced.map((row, index) => (index === 0 ? { ...row, name: " " } : row))}
        categories={importCategories}
        onChange={noop}
        onSubmit={noop}
        onRestart={noop}
      />,
    )

    expect(screen.getByText("Há produtos marcados sem nome. Dê um nome com ao menos duas letras.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Importar marcados (3)" })).toBeDisabled()
  })

  it("hands back the whole list with the one row changed", async () => {
    const onChange = vi.fn()
    render(<ProductImportReview rows={priced} categories={importCategories} onChange={onChange} onSubmit={noop} onRestart={noop} />)

    await userEvent.click(screen.getByRole("checkbox", { name: "Importar Picolé de uva" }))

    const [next] = onChange.mock.lastCall!
    expect(next.map((row: { include: boolean }) => row.include)).toEqual([true, false, true])
  })

  it("refuses to import with nothing ticked, and goes quiet while importing", () => {
    const none = priced.map((row) => ({ ...row, include: false }))
    const { rerender } = render(
      <ProductImportReview rows={none} categories={importCategories} onChange={noop} onSubmit={noop} onRestart={noop} />,
    )
    expect(screen.getByText("Marque ao menos um produto para importar.")).toBeInTheDocument()

    rerender(
      <ProductImportReview rows={priced} categories={importCategories} onChange={noop} onSubmit={noop} onRestart={noop} pending error="Recusado." />,
    )
    expect(screen.getByRole("button", { name: "Importando…" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Escolher outro arquivo" })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("Recusado.")
  })
})

describe("ProductImportReviewSkeleton", () => {
  it("says the read can take a minute, in the review's shape", async () => {
    const { container } = render(<ProductImportReviewSkeleton rows={3} />)

    expect(screen.getByRole("status")).toHaveTextContent("Lendo o documento. Isso pode levar até um minuto.")
    expect(container.querySelectorAll("li")).toHaveLength(3)
    await expectNoA11yViolations(container)
  })
})
