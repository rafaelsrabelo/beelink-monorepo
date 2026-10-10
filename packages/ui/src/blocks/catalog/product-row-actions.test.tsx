// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductRowActions } from "./product-row-actions"

describe("ProductRowActions", () => {
  it("links to the product's page on the shop window in another tab, and edits and deletes by name", async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const { container } = render(<ProductRowActions name="Whey" draft={false} viewHref="https://loja.exemplo/whey" onEdit={onEdit} onDelete={onDelete} />)

    const view = screen.getByRole("link", { name: "Ver na loja: Whey" })
    expect(view).toHaveAttribute("href", "https://loja.exemplo/whey")
    expect(view).toHaveAttribute("target", "_blank")
    await userEvent.click(screen.getByRole("button", { name: "Editar produto: Whey" }))
    await userEvent.click(screen.getByRole("button", { name: "Excluir: Whey" }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })

  it("keeps the eye in place for a product with no page, and says a draft is why only when it is one", () => {
    const { rerender } = render(<ProductRowActions name="Creatina" draft viewHref={null} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Rascunho não tem página na loja: Creatina" })).toBeDisabled()

    rerender(<ProductRowActions name="Creatina" draft={false} viewHref={null} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole("button", { name: "Ver na loja: Creatina" })).toBeDisabled()
  })

  it("goes quiet while its row is being deleted", () => {
    render(<ProductRowActions name="Whey" draft={false} viewHref={null} onEdit={() => {}} onDelete={() => {}} busy />)

    expect(screen.getByRole("button", { name: "Editar produto: Whey" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Excluir: Whey" })).toBeDisabled()
  })
})
