// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductOrderList } from "./product-order-list"
import type { ProductOrderItem } from "./product-order-row"

const item = (id: string, over: Partial<ProductOrderItem> = {}): ProductOrderItem => ({
  id,
  name: id,
  slug: id.toLowerCase(),
  priceCents: 13990,
  compareAtPriceCents: null,
  imageUrl: null,
  status: "ACTIVE",
  soldOut: false,
  ...over,
})

const three = [item("Whey"), item("Creatina"), item("Barra")]

describe("ProductOrderList", () => {
  it("sends the whole list on every move, to the top, up and down", async () => {
    const onReorder = vi.fn()
    const { container } = render(<ProductOrderList items={three} onReorder={onReorder} />)

    await userEvent.click(screen.getByRole("button", { name: "Mover para o topo: Barra" }))
    expect(onReorder).toHaveBeenLastCalledWith(["Barra", "Whey", "Creatina"])

    await userEvent.click(screen.getByRole("button", { name: "Subir: Creatina" }))
    expect(onReorder).toHaveBeenLastCalledWith(["Creatina", "Whey", "Barra"])

    await userEvent.click(screen.getByRole("button", { name: "Descer: Whey" }))
    expect(onReorder).toHaveBeenLastCalledWith(["Creatina", "Whey", "Barra"])

    await expectNoA11yViolations(container)
  })

  it("offers no way past either end of the list", () => {
    render(<ProductOrderList items={three} onReorder={() => {}} />)

    expect(screen.getByRole("button", { name: "Mover para o topo: Whey" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Subir: Whey" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Descer: Whey" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Descer: Barra" })).toBeDisabled()
  })

  it("says which products hold a place the shop window does not show", () => {
    render(<ProductOrderList items={[item("Whey"), item("Creatina", { status: "DRAFT" }), item("Barra", { soldOut: true })]} onReorder={() => {}} />)

    const [whey, creatina, barra] = screen.getAllByRole("listitem")
    expect(within(whey!).queryByText("Rascunho")).not.toBeInTheDocument()
    expect(within(whey!).queryByText("Esgotado")).not.toBeInTheDocument()
    expect(within(creatina!).getByText("Rascunho")).toBeInTheDocument()
    expect(within(barra!).getByText("Esgotado")).toBeInTheDocument()
  })

  it("names every grip for a screen reader, and stops every way of moving while saving", () => {
    render(<ProductOrderList items={three} onReorder={() => {}} disabled />)

    expect(screen.getByRole("button", { name: "Arrastar: Creatina" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Subir: Creatina" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Descer: Creatina" })).toBeDisabled()
  })
})
