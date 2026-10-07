// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFooterAction } from "./storefront-footer-action"

describe("StorefrontFooterAction", () => {
  it("is a button, named by its words, that does what it was handed", () => {
    const onClick = vi.fn()
    render(<StorefrontFooterAction onClick={onClick}>Cookies</StorefrontFooterAction>)

    const button = screen.getByRole("button", { name: "Cookies" })
    // Inside a form it must not submit it.
    expect(button).toHaveAttribute("type", "button")

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("hands its element to whoever has to give the focus back to it", () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<StorefrontFooterAction onClick={() => {}} ref={ref}>Cookies</StorefrontFooterAction>)

    expect(ref.current).toBe(screen.getByRole("button", { name: "Cookies" }))
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFooterAction onClick={() => {}}>Cookies</StorefrontFooterAction>)
    await expectNoA11yViolations(container)
  })
})
