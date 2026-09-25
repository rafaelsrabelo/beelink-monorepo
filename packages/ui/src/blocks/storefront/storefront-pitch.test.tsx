// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontPitch } from "./storefront-pitch"

describe("StorefrontPitch", () => {
  it("names the shop as the page's heading and says what it is", () => {
    render(<StorefrontPitch name="Padaria da Ana" description="Pães e bolos feitos no dia." />)

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Padaria da Ana")
    expect(screen.getByText("Pães e bolos feitos no dia.")).toBeInTheDocument()
  })

  it("offers the order button only when the shop has a WhatsApp to send it to", () => {
    const { rerender } = render(<StorefrontPitch name="Padaria" description="Pães." />)
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument()

    rerender(<StorefrontPitch name="Padaria" description="Pães." orderHref="https://wa.me/5585999998888" />)
    expect(screen.getByRole("link", { name: "Fazer pedido no WhatsApp" })).toHaveAttribute("href", "https://wa.me/5585999998888")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontPitch name="Padaria" description="Pães." orderHref="https://wa.me/1" />)

    await expectNoA11yViolations(container)
  })
})
