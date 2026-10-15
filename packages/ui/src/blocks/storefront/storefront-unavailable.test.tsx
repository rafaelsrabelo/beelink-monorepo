// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontUnavailable } from "./storefront-unavailable"

describe("StorefrontUnavailable", () => {
  it("names the shop and says it is unavailable, with the way to a customer's own orders", () => {
    render(<StorefrontUnavailable name="Padaria da Lia" ordersHref="/padaria/conta" />)

    expect(screen.getByRole("heading", { level: 1, name: "Padaria da Lia" })).toBeInTheDocument()
    expect(screen.getByText("Loja indisponível no momento")).toBeInTheDocument()
    expect(screen.getByText("Esta loja não está recebendo pedidos agora. Volte mais tarde.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Já comprou aqui? Veja seus pedidos" })).toHaveAttribute("href", "/padaria/conta")
  })

  it("offers a site, which takes no orders, no way to any", () => {
    render(<StorefrontUnavailable name="Estúdio Lia" />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("draws the logo as decoration beside the name it would repeat", () => {
    const { container } = render(<StorefrontUnavailable name="Padaria da Lia" logoUrl="https://res.cloudinary.com/demo/image/upload/logo.png" />)

    expect(container.querySelector("img")).toHaveAttribute("alt", "")
  })

  it("speaks the reader's language, and never why the shop is unavailable", () => {
    const { container } = render(<StorefrontUnavailable name="Padaria da Lia" ordersHref="/padaria/conta" messages={en} />)

    expect(screen.getByText("Shop unavailable right now")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Bought here before? See your orders" })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/pag|pay|assinatura|subscription|teste|trial/i)
  })

  it("has no accessibility violations", async () => {
    const { container, rerender } = render(<StorefrontUnavailable name="Padaria da Lia" ordersHref="/padaria/conta" />)
    await expectNoA11yViolations(container)

    rerender(<StorefrontUnavailable name="Padaria da Lia" logoUrl="https://res.cloudinary.com/demo/image/upload/logo.png" />)
    await expectNoA11yViolations(container)
  })
})
