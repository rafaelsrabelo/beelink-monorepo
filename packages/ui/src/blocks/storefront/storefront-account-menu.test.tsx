// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountMenu, initialsOf } from "./storefront-account-menu"

const items = [
  { key: "overview" as const, href: "/loja/conta" },
  { key: "orders" as const, href: "/loja/conta/pedidos", count: 1 },
  { key: "favorites" as const, href: "/loja/conta/favoritos", count: 12 },
  { key: "profile" as const, href: "/loja/conta/perfil" },
]

describe("initialsOf", () => {
  it("takes the first letter of the first and the last word, and one letter from one word", () => {
    expect(initialsOf("Rafael Souza")).toBe("RS")
    expect(initialsOf("Maria de Fátima Lima")).toBe("ML")
    expect(initialsOf("  bia ")).toBe("B")
  })
})

describe("StorefrontAccountMenu", () => {
  it("names who is signed in, lists only the pages given, marks the current one and counts what has a count", () => {
    render(<StorefrontAccountMenu shopper={{ name: "Rafael Souza", contact: "(85) 99999-4321" }} items={items} current="profile" signOutAction="/loja/api/customer/sair" />)

    const nav = screen.getByRole("navigation", { name: "Minha conta" })
    expect(within(nav).getByText("RS")).toBeInTheDocument()
    expect(within(nav).getByText("(85) 99999-4321")).toBeInTheDocument()
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual(["Visão geral", "Meus pedidos1", "Favoritos12", "Perfil e endereços"])
    expect(within(nav).queryByRole("link", { name: /Avaliar compras/ })).toBeNull()
    expect(within(nav).getByRole("link", { name: "Perfil e endereços" })).toHaveAttribute("aria-current", "page")
    expect(within(nav).getByRole("link", { name: "Visão geral" })).not.toHaveAttribute("aria-current")
  })

  it("signs out through a form of its own, under the pages", () => {
    render(<StorefrontAccountMenu shopper={{ name: "Bia", contact: null }} items={items} current={null} signOutAction="/loja/api/customer/sair" />)

    const button = screen.getByRole("button", { name: "Sair" })
    expect(button.closest("form")).toHaveAttribute("action", "/loja/api/customer/sair")
    expect(button.closest("form")).toHaveAttribute("method", "post")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAccountMenu shopper={{ name: "Rafael Souza", contact: "rafael@exemplo.com" }} items={items} current="overview" signOutAction="#" />)
    await expectNoA11yViolations(container)
  })
})
