// Libs
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountDropdown, type StorefrontAccountDropdownItem } from "./storefront-account-dropdown"

const items: StorefrontAccountDropdownItem[] = [
  { key: "orders", href: "/loja/conta/pedidos" },
  { key: "profile", href: "/loja/conta/perfil" },
  { key: "messages", href: "/loja/conta/conversas" },
]

function renderMenu(given: readonly StorefrontAccountDropdownItem[] = items) {
  return render(
    <main>
      <StorefrontAccountDropdown name="Marina Souza" href="/loja/conta" items={given} signOutAction="/loja/api/customer/sair" />
      <p>Fora do menu</p>
    </main>,
  )
}

const accountButton = () => screen.getByRole("button", { name: "Olá, Marina — Minha conta" })

describe("StorefrontAccountDropdown", () => {
  it("opens the account's pages and Sair on a press, and closes on a second one", async () => {
    renderMenu()

    const button = accountButton()
    expect(button).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(button)

    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "Meus pedidos" })).toHaveAttribute("href", "/loja/conta/pedidos")
    expect(screen.getByRole("link", { name: "Meu perfil" })).toHaveAttribute("href", "/loja/conta/perfil")
    expect(screen.getByRole("link", { name: "Falar com a loja" })).toHaveAttribute("href", "/loja/conta/conversas")
    expect(screen.getByRole("link", { name: /Marina Souza\s*Ver minha conta/ })).toHaveAttribute("href", "/loja/conta")
    expect(screen.getByRole("button", { name: "Sair" }).closest("form")).toHaveAttribute("action", "/loja/api/customer/sair")

    await userEvent.click(button)
    expect(screen.queryByRole("link", { name: "Meus pedidos" })).not.toBeInTheDocument()
  })

  it("lists only the pages it is given", async () => {
    renderMenu([{ key: "orders", href: "/loja/conta/pedidos" }])
    await userEvent.click(accountButton())

    expect(screen.getByRole("link", { name: "Meus pedidos" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Meu perfil" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Falar com a loja" })).not.toBeInTheDocument()
  })

  it("opens on a mouse hover, closes when the pointer leaves, and a press made while hovering keeps it open", async () => {
    renderMenu()
    const button = accountButton()

    await userEvent.hover(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
    await userEvent.unhover(button)
    await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "false"))

    await userEvent.hover(button)
    await userEvent.click(button)
    await userEvent.unhover(button)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("does not take a touch for a hover: the tap alone opens it", () => {
    renderMenu()
    const button = accountButton()

    fireEvent.pointerOver(button, { pointerType: "touch" })
    expect(button).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("closes on Escape with the focus back on its button, and on a press elsewhere", async () => {
    renderMenu()
    const button = accountButton()

    await userEvent.click(button)
    await userEvent.keyboard("{Escape}")
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).toHaveFocus()

    await userEvent.click(button)
    await userEvent.click(screen.getByText("Fora do menu"))
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("closes when the focus leaves it", async () => {
    render(
      <main>
        <StorefrontAccountDropdown name="Marina Souza" href="/loja/conta" items={items.slice(0, 1)} signOutAction="/loja/api/customer/sair" />
        <a href="/loja/carrinho">Carrinho</a>
      </main>,
    )
    const button = accountButton()

    await userEvent.click(button)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "Sair" })).toHaveFocus()
    await userEvent.tab()

    expect(screen.getByRole("link", { name: "Carrinho" })).toHaveFocus()
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("has no accessibility violations, open", async () => {
    const { container } = renderMenu()
    await userEvent.click(accountButton())

    await expectNoA11yViolations(container)
  })
})
