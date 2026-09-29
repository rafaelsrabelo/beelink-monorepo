// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderTabs } from "./storefront-order-tabs"

const tabs = [
  { label: "Todos", count: 4, href: "/loja/conta/pedidos", current: false },
  { label: "Em andamento", count: 2, href: "/loja/conta/pedidos?situacao=em-andamento", current: true },
  { label: "Entregues", count: 1, href: "/loja/conta/pedidos?situacao=entregues", current: false },
  { label: "Cancelados", count: 1, href: "/loja/conta/pedidos?situacao=cancelados", current: false },
]

describe("StorefrontOrderTabs", () => {
  it("lists each tab as a link with its count, and marks the current one", () => {
    render(<StorefrontOrderTabs tabs={tabs} />)

    const nav = screen.getByRole("navigation", { name: "Filtrar pedidos" })
    expect(nav).toHaveTextContent("Todos(4)")
    expect(screen.getByRole("link", { name: /Em andamento/ })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: /Entregues/ })).toHaveAttribute("href", "/loja/conta/pedidos?situacao=entregues")
    expect(screen.getByRole("link", { name: /Todos/ })).not.toHaveAttribute("aria-current")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderTabs tabs={tabs} />)
    await expectNoA11yViolations(container)
  })
})
