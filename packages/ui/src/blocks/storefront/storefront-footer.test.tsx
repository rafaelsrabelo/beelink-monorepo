// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFooter, type StorefrontFooterProps } from "./storefront-footer"
import { StorefrontFooterAction } from "./storefront-footer-action"

function renderFooter(overrides: Partial<StorefrontFooterProps> = {}) {
  return render(<StorefrontFooter name="Padaria da Ana" {...overrides} />)
}

describe("StorefrontFooter", () => {
  it("lets the logo stand in for the name, and say it", () => {
    renderFooter({ logoUrl: "https://cdn/logo.png" })
    const footer = screen.getByRole("contentinfo")

    expect(within(footer).getByRole("img", { name: "Padaria da Ana" })).toBeInTheDocument()
    expect(within(footer).queryByText("Padaria da Ana")).not.toBeInTheDocument()
  })

  it("names the shop and where it is when there is no logo", () => {
    renderFooter({ addressLine: "Rua das Flores, 120 — Fortaleza" })

    expect(screen.getByText("Padaria da Ana")).toBeInTheDocument()
    expect(screen.getByText("Rua das Flores, 120 — Fortaleza")).toBeInTheDocument()
  })

  // An icon with no words announces itself as "link" and nothing else.
  it("names every network it links to", () => {
    renderFooter({ links: [{ network: "instagram", href: "https://instagram.com/padaria" }] })

    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/padaria")
  })

  it("draws the columns the screen built, each a named landmark", () => {
    renderFooter({
      columns: [{ id: "shop", title: "A loja", items: [{ label: "Todos os produtos", href: "/padaria-da-ana/produtos" }] }],
      copyright: "© 2026 Padaria da Ana",
    })

    expect(within(screen.getByRole("navigation", { name: "A loja" })).getByRole("link", { name: "Todos os produtos" })).toHaveAttribute(
      "href",
      "/padaria-da-ana/produtos",
    )
    expect(screen.getByText("© 2026 Padaria da Ana")).toBeInTheDocument()
  })

  /** BEELINK-271: the way back to the cookie choice is something to do here, not somewhere to go. */
  it("draws an action among a column's links, as the screen handed it", () => {
    renderFooter({
      columns: [
        {
          id: "legal",
          title: "Termos e privacidade",
          items: [
            { label: "Política de privacidade", href: "/privacidade" },
            { id: "cookies", action: <StorefrontFooterAction onClick={() => {}}>Cookies</StorefrontFooterAction> },
          ],
        },
      ],
    })

    const column = within(screen.getByRole("navigation", { name: "Termos e privacidade" }))
    expect(column.getAllByRole("listitem")).toHaveLength(2)
    expect(column.getByRole("button", { name: "Cookies" })).toBeInTheDocument()
    expect(column.queryByRole("link", { name: "Cookies" })).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderFooter({
      logoUrl: "https://cdn/logo.png",
      links: [{ network: "whatsapp", href: "https://wa.me/55" }],
      columns: [{ id: "shop", title: "A loja", items: [{ label: "Categorias", href: "/x" }] }],
      copyright: "© 2026",
    })

    await expectNoA11yViolations(container)
  })
})
