// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { FeaturedProductFields } from "./featured-product-fields"

const products = [
  { id: "p1", name: "Whey Baunilha" },
  { id: "p2", name: "Creatina" },
]

describe("FeaturedProductFields", () => {
  it("says none is chosen yet, and picks one by name", async () => {
    const onChange = vi.fn()
    render(<FeaturedProductFields value={[]} onChange={onChange} products={products} newItemId={() => "novo"} />)

    expect(screen.getByText("nenhum escolhido")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Buscar produto"), "crea")
    await userEvent.click(screen.getByRole("button", { name: /Creatina/ }))
    expect(onChange).toHaveBeenCalledWith([{ id: "novo", productId: "p2" }])
  })

  it("keeps the pick's id when the product changes", async () => {
    const onChange = vi.fn()
    render(<FeaturedProductFields value={[{ id: "pick", productId: "p1" }]} onChange={onChange} products={products} newItemId={() => "novo"} />)

    expect(screen.getByText("Whey Baunilha", { selector: "span.font-medium" })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Buscar produto"), "crea")
    await userEvent.click(screen.getByRole("button", { name: /Creatina/ }))
    expect(onChange).toHaveBeenCalledWith([{ id: "pick", productId: "p2" }])
  })

  it("says a pick it cannot find is unknown, never that none is chosen", () => {
    render(<FeaturedProductFields value={[{ id: "pick", productId: "gone" }]} onChange={vi.fn()} products={products} newItemId={() => "novo"} />)

    expect(screen.getByText("Produto não encontrado")).toBeInTheDocument()
  })

  it("waits for the list before calling a pick unknown", () => {
    render(<FeaturedProductFields value={[{ id: "pick", productId: "p9" }]} onChange={vi.fn()} products={[]} newItemId={() => "novo"} optionsState="loading" />)

    expect(screen.queryByText("Produto não encontrado")).not.toBeInTheDocument()
  })

  it("hands what is typed to the screen, which asks the API", async () => {
    const onQueryChange = vi.fn()
    render(<FeaturedProductFields value={[]} onChange={vi.fn()} products={products} newItemId={() => "novo"} onQueryChange={onQueryChange} />)

    await userEvent.type(screen.getByLabelText("Buscar produto"), "w")
    expect(onQueryChange).toHaveBeenLastCalledWith("w")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <FeaturedProductFields value={[{ id: "pick", productId: "p1" }]} onChange={vi.fn()} products={products} newItemId={() => "novo"} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
