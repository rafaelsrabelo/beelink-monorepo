// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAffiliateNote } from "./storefront-affiliate-note"

describe("StorefrontAffiliateNote", () => {
  it("says whose recommendation the order is, and that they will read the buyer's name on it", () => {
    render(<StorefrontAffiliateNote name="João Silva" photoUrl={null} />)

    expect(screen.getByText("Indicação de João")).toBeInTheDocument()
    expect(screen.getByText("João verá seu nome neste pedido.")).toBeInTheDocument()
  })

  it("is never a thing to close", () => {
    render(<StorefrontAffiliateNote name="João Silva" photoUrl={null} />)

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("speaks the language it is handed", () => {
    render(<StorefrontAffiliateNote name="Maria" photoUrl={null} messages={en} />)

    expect(screen.getByText("Maria will see your name on this order.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAffiliateNote name="João Silva" photoUrl={null} />)
    await expectNoA11yViolations(container)
  })
})
