// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckout } from "./storefront-checkout"

const hrefFor = (name: string) => `https://wa.me/5511?text=${encodeURIComponent(`pedido de ${name || "alguém"}`)}`

describe("StorefrontCheckout", () => {
  it("opens the shop's WhatsApp with the order, the name typed going with it", () => {
    const onSend = vi.fn()
    render(<StorefrontCheckout hrefFor={hrefFor} onSend={onSend} />)

    fireEvent.change(screen.getByLabelText("Seu nome (opcional)"), { target: { value: "Rafael" } })
    const link = screen.getByRole("link", { name: "Fechar pedido pelo WhatsApp" })

    expect(link).toHaveAttribute("href", hrefFor("Rafael"))
    expect(link).toHaveAttribute("target", "_blank")
    fireEvent.click(link)
    expect(onSend).toHaveBeenCalledWith(hrefFor("Rafael"))
  })

  it("draws no button for a shop without WhatsApp, and says why", () => {
    render(<StorefrontCheckout hrefFor={null} />)

    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByText(/não recebe pedidos pelo site/)).toBeInTheDocument()
  })

  it("holds the button while nothing can be ordered", () => {
    render(<StorefrontCheckout hrefFor={hrefFor} disabled />)

    expect(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCheckout hrefFor={hrefFor} />)

    await expectNoA11yViolations(container)
  })
})
