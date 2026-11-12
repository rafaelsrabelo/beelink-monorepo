// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAffiliateStrip } from "./storefront-affiliate-strip"

describe("StorefrontAffiliateStrip", () => {
  it("says, in one line and by the first name, whose recommendation the visitor is shopping on", () => {
    render(<StorefrontAffiliateStrip name="João Silva" photoUrl={null} />)

    expect(screen.getByRole("region", { name: "Indicação" })).toHaveTextContent("Comprando pela indicação de João")
    expect(screen.queryByText(/Silva/)).toBeNull()
  })

  it("closes when asked, and offers no button when it cannot be closed", async () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<StorefrontAffiliateStrip name="João Silva" photoUrl={null} onDismiss={onDismiss} />)

    await userEvent.click(screen.getByRole("button", { name: "Fechar indicação" }))
    expect(onDismiss).toHaveBeenCalledOnce()

    rerender(<StorefrontAffiliateStrip name="João Silva" photoUrl={null} />)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAffiliateStrip name="João Silva" photoUrl={null} onDismiss={() => {}} />)
    await expectNoA11yViolations(container)
  })
})
