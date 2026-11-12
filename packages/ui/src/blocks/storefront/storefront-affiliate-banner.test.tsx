// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAffiliateBanner } from "./storefront-affiliate-banner"

describe("StorefrontAffiliateBanner", () => {
  it("says whose shop the visitor is in, the badge and what the link does, in a named region of the page's flow", () => {
    render(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} />)

    const band = screen.getByRole("region", { name: "Indicação" })
    expect(band).toHaveTextContent("Você está na loja de")
    expect(band).toHaveTextContent("Margarida Marino Pereira")
    expect(band).toHaveTextContent("Parceria oficial")
    expect(band).toHaveTextContent("Suas compras por este link contam para esta indicação.")
    expect(band).not.toHaveClass("fixed", "sticky", "absolute")
    expect(band).not.toHaveAttribute("aria-live")
  })

  it("is painted in the shop's brand colour and its readable ink, never a colour of its own", () => {
    render(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} />)

    expect(screen.getByRole("region", { name: "Indicação" })).toHaveClass("bg-shop-primary", "text-shop-on-primary")
  })

  it("draws the initials when there is no photo, and keeps the picture out of what is read", () => {
    const { container } = render(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} />)

    expect(container.querySelector('[data-slot="avatar"]')).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("MP")).toBeInTheDocument()
  })

  it("says the affiliate's phrase when it is handed one, and nothing in its place otherwise", () => {
    const { rerender } = render(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} tagline="Meus favoritos da loja" />)
    expect(screen.getByText("“Meus favoritos da loja”")).toBeInTheDocument()

    rerender(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} />)
    expect(screen.queryByText(/“/)).toBeNull()
  })

  it("has nothing to close: it is drawn only where the link is in the address", () => {
    render(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} />)

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("speaks the language it is handed", () => {
    render(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} messages={en} />)

    expect(screen.getByRole("region", { name: "Referral" })).toHaveTextContent("Official partner")
  })

  it("has no accessibility violations, with and without the phrase", async () => {
    const { container, rerender } = render(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} tagline="Meus favoritos" />)
    await expectNoA11yViolations(container)

    rerender(<StorefrontAffiliateBanner name="Margarida Marino Pereira" photoUrl={null} />)
    await expectNoA11yViolations(container)
  })
})
