// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"
import { ptBR } from "../../locales/pt-BR"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminHeader } from "./admin-header"

function renderHeader(overrides: Partial<Parameters<typeof AdminHeader>[0]> = {}) {
  return render(
    <AdminHeader
      brandHref="/admin/lessari"
      onToggleSidebar={() => {}}
      search={<input aria-label="Pesquisar na loja" />}
      bell={<button type="button">Sino</button>}
      storeMenu={<button type="button">Loja</button>}
      {...overrides}
    />,
  )
}

describe("AdminHeader", () => {
  // Read from the dictionary rather than repeated as a literal: the product's own name is copy,
  // and a test that spells it out fails the day someone renames the shop window.
  it("takes the brand back where the screen said", () => {
    renderHeader()

    expect(screen.getByRole("link", { name: ptBR.shell.brand })).toHaveAttribute(
      "href",
      "/admin/lessari",
    )
  })

  // Everything in the outer columns arrives as a node: this package may not fetch and may not
  // route, so what a bell does and which shops exist belong to the screen.
  it("renders the three things the screen handed it", () => {
    renderHeader()

    expect(screen.getByLabelText("Pesquisar na loja")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sino" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Loja" })).toBeInTheDocument()
  })

  it("asks the screen to open the rail, which owns whether it is showing", async () => {
    const onToggleSidebar = vi.fn()
    renderHeader({ onToggleSidebar })

    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }))

    expect(onToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it("names the bar as a banner, so a screen reader can skip to and from it", () => {
    renderHeader()

    expect(screen.getByRole("banner")).toBeInTheDocument()
  })

  it("speaks the other language", () => {
    renderHeader({ messages: en })

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderHeader()

    await expectNoA11yViolations(container)
  })
})
