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

  it("draws the front with the menu and the overview, and no way back", () => {
    render(
      <StorefrontAccountShell menu={menu} page={{ kind: "overview" }}>
        <StorefrontAccountOverview name="Bia Cliente" shortcuts={[{ key: "profile", href: "/loja/conta/perfil", hint: "Seus dados" }]} />
      </StorefrontAccountShell>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Olá, Bia" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull()
    // The overview's card, apart from the menu's entry of the same name.
    expect(within(screen.getByRole("list")).getByRole("link", { name: /Perfil e endereços/ })).toHaveAttribute("href", "/loja/conta/perfil")
  })

  it("has no accessibility violations on the front and on a tab", async () => {
    const front = render(
      <StorefrontAccountShell menu={menu} page={{ kind: "overview" }}>
        <StorefrontAccountOverview name="Bia" shortcuts={[{ key: "profile", href: "#" }]} />
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
