// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingMenu } from "./landing-menu"

function renderMenu() {
  const view = render(
    <LandingMenu
      label="Menu"
      sections={[
        { href: "#solucoes", label: "Soluções" },
        { href: "#perguntas", label: "Perguntas" },
      ]}
      pages={[{ href: "/privacidade", label: "Política de privacidade" }]}
      signIn={{ href: "/login", label: "Entrar" }}
      createStore={{ href: "/signup", label: "Criar minha loja" }}
    />,
  )
  return { ...view, menu: view.container.querySelector("details")! }
}

describe("LandingMenu", () => {
  /** A `<details>`: the browser opens it before any script arrives, and says which state it is in. */
  it("is a disclosure the browser itself opens, closed at first and named for a reader", () => {
    const { menu } = renderMenu()

    expect(menu.open).toBe(false)
    expect(menu.querySelector("summary")).toHaveAccessibleName("Menu")
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade")
  })

  /** An anchor leaves the page where it is: the open menu would cover the section just reached. */
  it("closes once a link in it is followed", async () => {
    const { menu } = renderMenu()
    menu.open = true

    await userEvent.click(screen.getByRole("link", { name: "Perguntas" }))

    expect(menu.open).toBe(false)
  })

  it("stays open when the click lands between its links", async () => {
    const { menu } = renderMenu()
    menu.open = true

    await userEvent.click(screen.getByRole("navigation", { name: "Menu" }))

    expect(menu.open).toBe(true)
  })

  it("closes on Escape, and hands the focus back to its button", async () => {
    const { menu } = renderMenu()
    menu.open = true
    screen.getByRole("link", { name: "Soluções" }).focus()

    await userEvent.keyboard("{Escape}")

    expect(menu.open).toBe(false)
    expect(menu.querySelector("summary")).toHaveFocus()
  })

  it("has no accessibility violations, closed and open", async () => {
    const { container, menu } = renderMenu()
    await expectNoA11yViolations(container)

    menu.open = true
    await expectNoA11yViolations(container)
  })
})
