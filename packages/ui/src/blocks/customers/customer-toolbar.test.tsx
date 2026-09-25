// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerToolbar, type CustomerToolbarProps } from "./customer-toolbar"

function renderToolbar(overrides: Partial<CustomerToolbarProps> = {}) {
  const onSearchChange = vi.fn()
  const onSortChange = vi.fn()
  const view = render(<CustomerToolbar search="" onSearchChange={onSearchChange} sort="RECENT" onSortChange={onSortChange} {...overrides} />)
  return { onSearchChange, onSortChange, ...view }
}

describe("CustomerToolbar", () => {
  it("reports every keystroke, and leaves the settling to the screen", async () => {
    const user = userEvent.setup()
    const { onSearchChange } = renderToolbar()

    await user.type(screen.getByRole("searchbox", { name: "Buscar clientes" }), "bi")

    expect(onSearchChange).toHaveBeenCalledTimes(2)
    expect(onSearchChange).toHaveBeenLastCalledWith("i")
  })

  it("names the order the list is in, never the code it sends", () => {
    renderToolbar({ sort: "TOP_SPENT" })

    expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveTextContent("Maior gasto")
  })

  it("offers the four orders and tells the screen the one picked", async () => {
    const user = userEvent.setup()
    const { onSortChange } = renderToolbar()

    await user.click(screen.getByRole("combobox", { name: "Ordenar por" }))
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(["Mais recentes", "Último pedido", "Mais pedidos", "Maior gasto"])
    await user.click(screen.getByRole("option", { name: "Mais pedidos" }))

    expect(onSortChange).toHaveBeenCalledWith("MOST_ORDERS")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderToolbar({ search: "bia", sort: "LAST_ORDER" })

    await expectNoA11yViolations(container)
  })
})
