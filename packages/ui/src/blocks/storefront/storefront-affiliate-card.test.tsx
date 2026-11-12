// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAffiliateCard } from "./storefront-affiliate-card"

describe("StorefrontAffiliateCard", () => {
  it("says whose recommendation the page is, with the whole name, in a named region of the page's flow", () => {
    render(<StorefrontAffiliateCard name="João Silva" photoUrl={null} />)

    const card = screen.getByRole("region", { name: "Indicação" })
    expect(card).toHaveTextContent("Você chegou pela indicação de João Silva")
    expect(card).not.toHaveClass("fixed", "sticky", "absolute")
    expect(card).not.toHaveAttribute("aria-live")
  })

  it("draws the initials when there is no photo, and keeps the picture out of what is read", () => {
    const { container } = render(<StorefrontAffiliateCard name="João Silva" photoUrl={null} />)

    expect(container.querySelector('[data-slot="avatar"]')).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("JS")).toBeInTheDocument()
  })

  it("says the affiliate's phrase when there is one, and nothing in its place when there is none", () => {
    const { rerender } = render(<StorefrontAffiliateCard name="João Silva" photoUrl={null} tagline="Separei meus favoritos aqui" />)
    expect(screen.getByText("“Separei meus favoritos aqui”")).toBeInTheDocument()

    rerender(<StorefrontAffiliateCard name="João Silva" photoUrl={null} />)
    expect(screen.queryByText(/“/)).toBeNull()
  })

  it("speaks the language it is handed", () => {
    render(<StorefrontAffiliateCard name="João Silva" photoUrl={null} messages={en} />)

    expect(screen.getByRole("region", { name: "Referral" })).toHaveTextContent("You came here on the recommendation of João Silva")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAffiliateCard name="João Silva" photoUrl={null} tagline="Separei meus favoritos aqui" />)
    await expectNoA11yViolations(container)
  })
})
