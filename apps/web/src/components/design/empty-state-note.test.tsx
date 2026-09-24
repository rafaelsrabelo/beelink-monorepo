// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { EmptyStateNote } from "./empty-state-note"

describe("EmptyStateNote — the cause, and where it is fixed", () => {
  // The case reported: four categories, none with a product.
  it("says how many categories have no product, and leads to where products get one", () => {
    render(<EmptyStateNote state={{ kind: "categoriesUnlinked", count: 4 }} slug="loja" messages={ptBR} />)

    expect(screen.getByText(/4 categorias ainda não têm produto/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Vincular produtos às categorias/ })).toHaveAttribute("href", "/admin/loja/products")
  })

  it("leads to creating categories, or the first product, when there are none", () => {
    const { unmount } = render(<EmptyStateNote state={{ kind: "categoriesNone" }} slug="loja" messages={ptBR} />)
    expect(screen.getByRole("link", { name: /Criar categorias/ })).toHaveAttribute("href", "/admin/loja/categories")
    unmount()

    render(<EmptyStateNote state={{ kind: "productsNone" }} slug="loja" messages={ptBR} />)
    expect(screen.getByRole("link", { name: /Cadastrar o primeiro produto/ })).toHaveAttribute("href", "/admin/loja/products/new")
  })

  it("offers no link when the fix is the sheet's own source field", () => {
    render(<EmptyStateNote state={{ kind: "sourceEmpty" }} slug="loja" messages={ptBR} />)

    expect(screen.getByText("Esta fonte não traz nenhum produto agora")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("speaks English with the English dictionary, in the singular for one", () => {
    render(<EmptyStateNote state={{ kind: "categoriesUnlinked", count: 1 }} slug="loja" messages={en} />)

    expect(screen.getByText(/1 category has no product yet/)).toBeInTheDocument()
  })
})
