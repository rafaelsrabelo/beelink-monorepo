// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontMasthead } from "./storefront-masthead"

describe("StorefrontMasthead", () => {
  it("draws a site's button apart from its menu", () => {
    render(
      <StorefrontMasthead
        name="Asfalto Norte"
        homeHref="/asfalto-norte"
        menu={[{ id: "s", label: "Serviços", href: "#servicos" }]}
        cta={{ label: "Pedir orçamento", href: "#contato" }}
      />,
    )

    const menu = screen.getByRole("navigation", { name: "Seções do site" })
    expect(within(menu).queryByRole("link", { name: "Pedir orçamento" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pedir orçamento" })).toHaveAttribute("href", "#contato")
  })

  it("draws no button when there is none", () => {
    render(<StorefrontMasthead name="Lessari" homeHref="/lessari" />)

    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("draws the account in two lines and the cart with its count, as words beside their marks", () => {
    render(<StorefrontMasthead name="Lessari" homeHref="/lessari" accountHref="/lessari/conta" cartHref="/lessari/carrinho" cartCount={2} />)

    expect(screen.getByRole("link", { name: /Olá, entre.*Minha conta/ })).toHaveAttribute("href", "/lessari/conta")
    const cart = screen.getByRole("link", { name: "Carrinho, 2 itens" })
    expect(cart).toHaveAttribute("href", "/lessari/carrinho")
    expect(within(cart).getByText("2")).toBeInTheDocument()
  })

  it("shows no badge on an empty cart, and still names the cart", () => {
    render(<StorefrontMasthead name="Lessari" homeHref="/lessari" cartHref="/lessari/carrinho" />)

    const cart = screen.getByRole("link", { name: "Carrinho, 0 itens" })
    expect(within(cart).queryByText("0")).not.toBeInTheDocument()
  })

  it("sticks to the top, and carries what measures it for the page below", () => {
    render(<StorefrontMasthead name="Lessari" homeHref="/lessari" />)

    const banner = screen.getByRole("banner")
    expect(banner).toHaveClass("sticky", "top-0")
    // MastheadHeight's marker, the header's last child; its behaviour is masthead-height.test's.
    expect(banner.lastElementChild).toHaveAttribute("hidden")
  })

  it("puts the search between the delivery block and the account, taking the room between them", () => {
    render(
      <StorefrontMasthead name="Lessari" homeHref="/lessari" deliverTo={<span>Entregar em</span>} searchAction="/lessari/busca" accountHref="/c" />,
    )

    const row = screen.getByRole("banner").firstElementChild!
    const order = [...row.children].map((child) => child.textContent?.slice(0, 12))
    expect(order).toEqual(["Lessari", "Entregar em", "Buscar nesta", "Olá, entreMi"])
    expect(screen.getByRole("search").parentElement).toHaveClass("flex-1")
    expect(row.querySelector(".max-w-md")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontMasthead name="Asfalto Norte" homeHref="/a" cta={{ label: "Pedir orçamento", href: "#contato" }} />,
    )

    await expectNoA11yViolations(container)
  })
})
