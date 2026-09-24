// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CategoriesFields } from "./categories-fields"

describe("CategoriesFields", () => {
  it("offers a rail or a grid, never a carousel, and says what the chosen one does", () => {
    render(<CategoriesFields value={{ display: "RAIL", columns: 0 }} onChange={vi.fn()} />)

    expect(screen.getByRole("button", { name: /Trilho/, pressed: true })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Carrossel/ })).not.toBeInTheDocument()
    expect(screen.getByText(/rola para o lado/)).toBeInTheDocument()
  })

  // A rail's cards have their own width at every screen, so a count would change nothing there.
  it("asks for the columns only of a grid", () => {
    const { rerender } = render(<CategoriesFields value={{ display: "RAIL", columns: 0 }} onChange={vi.fn()} />)
    expect(screen.queryByRole("combobox", { name: "Colunas" })).not.toBeInTheDocument()

    rerender(<CategoriesFields value={{ display: "GRID", columns: 4 }} onChange={vi.fn()} />)
    expect(screen.getByRole("combobox", { name: "Colunas" })).toHaveTextContent("4")
  })

  it("hands the chosen format back", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CategoriesFields value={{ display: "RAIL", columns: 0 }} onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: /Grade/ }))

    expect(onChange).toHaveBeenCalledWith({ display: "GRID" })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<CategoriesFields value={{ display: "GRID", columns: 0 }} onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
