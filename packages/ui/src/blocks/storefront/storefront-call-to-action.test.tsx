// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCallToAction } from "./storefront-call-to-action"

const button = { label: "Comprar agora", href: "/loja/produtos/whey", external: false }

describe("StorefrontCallToAction", () => {
  it("says its title and text, and leads where its button points", () => {
    render(<StorefrontCallToAction layout="BAND" title="Garanta o seu" body="Enquanto tem estoque." button={button} />)

    expect(screen.getByRole("heading", { level: 2, name: "Garanta o seu" })).toBeInTheDocument()
    expect(screen.getByText("Enquanto tem estoque.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Comprar agora" })).toHaveAttribute("href", "/loja/produtos/whey")
  })

  it("opens a link outside the shop in a new tab", () => {
    render(<StorefrontCallToAction layout="CARD" title="Fale com a gente" button={{ label: "WhatsApp", href: "https://wa.me/55", external: true }} />)

    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("target", "_blank")
  })

  it("draws no button where what it pointed at is gone", () => {
    render(<StorefrontCallToAction layout="BAND" title="Garanta o seu" button={{ ...button, href: null }} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.getByRole("heading")).toBeInTheDocument()
  })

  it("draws nothing without words: a button alone is not a call", () => {
    const { container } = render(<StorefrontCallToAction layout="BAND" button={button} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("keeps round corners on a strip that does not reach the edges", () => {
    const { container, rerender } = render(<StorefrontCallToAction layout="BAND" title="Garanta o seu" />)
    expect(container.firstElementChild).toHaveClass("rounded-2xl")

    rerender(<StorefrontCallToAction layout="BAND" title="Garanta o seu" bleed />)
    expect(container.firstElementChild).not.toHaveClass("rounded-2xl")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <StorefrontCallToAction layout="CARD" title="Garanta o seu" body="Enquanto tem estoque." button={button} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
