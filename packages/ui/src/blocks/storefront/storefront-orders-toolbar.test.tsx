// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrdersToolbar } from "./storefront-orders-toolbar"

const periods = [
  { value: "", label: "Todo o período" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "2026", label: "2026" },
]

describe("StorefrontOrdersToolbar", () => {
  it("is a GET form to the list, with the search, the period and the tab kept", () => {
    render(<StorefrontOrdersToolbar action="/loja/conta/pedidos" names={{ search: "q", period: "periodo" }} value={{ search: "whey", period: "2026" }} periods={periods} hidden={{ situacao: "entregues" }} />)

    const form = screen.getByRole("search")
    expect(form).toHaveAttribute("action", "/loja/conta/pedidos")
    expect(form).toHaveAttribute("method", "get")
    expect(screen.getByRole("searchbox", { name: "Buscar nos pedidos" })).toHaveValue("whey")
    expect(screen.getByRole("combobox", { name: "Período" })).toHaveValue("2026")
    expect(form.querySelector('input[name="situacao"]')).toHaveValue("entregues")
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrdersToolbar action="#" names={{ search: "q", period: "periodo" }} value={{ search: "", period: "" }} periods={periods} />)
    await expectNoA11yViolations(container)
  })
})
