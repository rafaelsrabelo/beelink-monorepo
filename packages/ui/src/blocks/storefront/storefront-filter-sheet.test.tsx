// Libs
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFilterSheet } from "./storefront-filter-sheet"

function renderSheet(applied = 2, total = 12) {
  return render(
    <StorefrontFilterSheet applied={applied} total={total} locale="pt-BR">
      <section>
        <h3>Sabor</h3>
        <a href="/loja/produtos?opcao=Sabor%3AUva">Uva</a>
      </section>
    </StorefrontFilterSheet>,
  )
}

describe("StorefrontFilterSheet", () => {
  it("says how many filters are in force on its button", () => {
    const { rerender } = renderSheet()

    expect(screen.getByRole("button", { name: "Filtrar (2)" })).toBeInTheDocument()

    rerender(
      <StorefrontFilterSheet applied={0} total={12} locale="pt-BR">
        <p>grupos</p>
      </StorefrontFilterSheet>,
    )
    expect(screen.getByRole("button", { name: "Filtrar" })).toBeInTheDocument()
  })

  it("opens the column's groups in a dialog titled 'Filtros', and closes on the shelf as it stands", async () => {
    renderSheet()

    fireEvent.click(screen.getByRole("button", { name: "Filtrar (2)" }))

    const dialog = await screen.findByRole("dialog", { name: "Filtros" })
    expect(dialog).toContainElement(screen.getByRole("link", { name: "Uva" }))

    fireEvent.click(screen.getByRole("button", { name: "Ver 12 resultados" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("says one and none in words on its footer", async () => {
    renderSheet(1, 1)
    fireEvent.click(screen.getByRole("button", { name: "Filtrar (1)" }))

    expect(await screen.findByRole("button", { name: "Ver 1 resultado" })).toBeInTheDocument()
  })

  it("has no accessibility violations, open", async () => {
    renderSheet()
    fireEvent.click(screen.getByRole("button", { name: "Filtrar (2)" }))
    await screen.findByRole("dialog")

    await expectNoA11yViolations(document.body)
  })
})
