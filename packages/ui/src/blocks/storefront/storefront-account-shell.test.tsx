// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountMenu } from "./storefront-account-menu"
import { StorefrontAccountOverview } from "./storefront-account-overview"
import { StorefrontAccountShell } from "./storefront-account-shell"

const menu = (
  <StorefrontAccountMenu
    shopper={{ name: "Bia Cliente", contact: null }}
    items={[
      { key: "overview", href: "/loja/conta" },
      { key: "profile", href: "/loja/conta/perfil" },
    ]}
    current="profile"
    signOutAction="#"
  />
)

describe("StorefrontAccountShell", () => {
  it("titles a tab and offers the way back to the area", () => {
    render(
      <StorefrontAccountShell menu={menu} page={{ kind: "tab", title: "Perfil e endereços", backHref: "/loja/conta" }}>
        <p>o formulário</p>
      </StorefrontAccountShell>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Perfil e endereços" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Minha conta" })).toHaveAttribute("href", "/loja/conta")
    expect(screen.getByText("o formulário")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Minha conta" })).toBeInTheDocument()
  })

  it("holds a tab's tools beside its title, inside its header", () => {
    render(
      <StorefrontAccountShell menu={menu} page={{ kind: "tab", title: "Meus pedidos", backHref: "/loja/conta", tools: <form role="search" aria-label="Buscar nos pedidos" /> }}>
        <p>a lista</p>
      </StorefrontAccountShell>,
    )

    const header = screen.getByRole("heading", { level: 1, name: "Meus pedidos" }).closest("header")!
    expect(within(header).getByRole("search", { name: "Buscar nos pedidos" })).toBeInTheDocument()
  })

  it("draws the front with the menu and what the overview tells, under one heading and no way back", () => {
    render(
      <StorefrontAccountShell menu={menu} page={{ kind: "overview" }}>
        <StorefrontAccountOverview name="Bia Cliente">
          <p>o pedido em andamento</p>
        </StorefrontAccountOverview>
      </StorefrontAccountShell>,
    )

    expect(screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent)).toEqual(["Olá, Bia"])
    expect(screen.getByText("o pedido em andamento")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Minha conta" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull()
  })

  it("has no accessibility violations on the front and on a tab", async () => {
    const front = render(
      <StorefrontAccountShell menu={menu} page={{ kind: "overview" }}>
        <StorefrontAccountOverview name="Bia">
          <p>o pedido em andamento</p>
        </StorefrontAccountOverview>
      </StorefrontAccountShell>,
    )
    await expectNoA11yViolations(front.container)
    front.unmount()

    const tab = render(
      <StorefrontAccountShell menu={menu} page={{ kind: "tab", title: "Perfil e endereços", backHref: "#" }}>
        <p>conteúdo</p>
      </StorefrontAccountShell>,
    )
    await expectNoA11yViolations(tab.container)
  })
})
