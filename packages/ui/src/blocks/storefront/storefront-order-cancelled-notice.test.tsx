// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderCancelledNotice } from "./storefront-order-cancelled-notice"

describe("StorefrontOrderCancelledNotice", () => {
  /** A live region already in the page is announced when it fills; one added with its words often is not. */
  it("waits empty in the page, then says which order was cancelled", () => {
    const { rerender } = render(<StorefrontOrderCancelledNotice number={null} />)
    expect(screen.getByRole("status")).toBeEmptyDOMElement()

    rerender(<StorefrontOrderCancelledNotice number={14} />)
    expect(screen.getByRole("status")).toHaveTextContent("Pedido nº 14 cancelado.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderCancelledNotice number={14} />)
    await expectNoA11yViolations(container)
  })
})
