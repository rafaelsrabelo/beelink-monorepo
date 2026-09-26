// Libs
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignPreview, PHONE_WIDTH, PREVIEW_WIDTH } from "./design-preview"

/**
 * jsdom lays nothing out, so every element measures zero and the scale the block computes is
 * whatever that arithmetic gives. What is worth asserting here is the part that does not depend on
 * layout: the surface is a fixed pixel width — the device's — and the shop's breakpoints answer to
 * the `shop` container inside it, not to the window. The scale itself is measured in Storybook and
 * Playwright.
 */
afterEach(() => {
  vi.restoreAllMocks()
})

describe("DesignPreview", () => {
  it("draws its children at a desktop width, not the pane's", () => {
    const { container } = render(
      <DesignPreview>
        <p>Vitrine</p>
      </DesignPreview>,
    )

    const surface = container.querySelector<HTMLElement>("[style*='scale']")

    expect(surface?.style.width).toBe(`${PREVIEW_WIDTH}px`)
    expect(screen.getByText("Vitrine")).toBeInTheDocument()
  })

  // A phone's width, in a column of its own down the middle of the pane.
  it("draws a phone at a phone's width, centred", () => {
    const { container } = render(
      <DesignPreview device="PHONE">
        <p>Vitrine</p>
      </DesignPreview>,
    )

    expect(container.querySelector<HTMLElement>("[style*='scale']")?.style.width).toBe(`${PHONE_WIDTH}px`)
    expect(container.querySelector("[data-device='PHONE']")?.className).toContain("mx-auto")
  })

  // The shop's shop-* breakpoints ask this surface inside the preview, and the window outside it.
  it("is the shop's container, marked as the preview", () => {
    const { container } = render(
      <DesignPreview device="PHONE">
        <p>Vitrine</p>
      </DesignPreview>,
    )

    const surface = container.querySelector<HTMLElement>("[data-shop-preview]")
    expect(surface?.className).toContain("@container/shop")
    expect(surface?.style.width).toBe(`${PHONE_WIDTH}px`)
  })

  /**
   * The chrome the editor draws over the shop is painted by the same transform, so it needs the
   * number to undo it. Published as data rather than measured a second time — two measurements of
   * one thing is how they drift.
   */
  it("publishes its scale as a custom property on the scaled element", () => {
    const { container } = render(
      <DesignPreview>
        <p>loja</p>
      </DesignPreview>,
    )

    const surface = container.querySelector<HTMLElement>("[style*='scale']")

    expect(surface).not.toBeNull()
    expect(surface!.style.getPropertyValue("--design-scale")).not.toBe("")
  })

  // Before the first measurement the scale is 1: a 1440px shop painted at full size, then a jump.
  it("keeps the shop out of sight until it has measured the pane, and shows it once it has", () => {
    const { container, unmount } = render(
      <DesignPreview>
        <p>Vitrine</p>
      </DesignPreview>,
    )
    expect(container.querySelector<HTMLElement>("[data-device]")?.style.visibility).toBe("hidden")
    unmount()

    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(720)
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2400)
    const measured = render(
      <DesignPreview>
        <p>Vitrine</p>
      </DesignPreview>,
    )
    expect(measured.container.querySelector<HTMLElement>("[data-device]")?.style.visibility).toBe("")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <DesignPreview>
        <main>
          <h1>Vitrine</h1>
        </main>
      </DesignPreview>,
    )

    await expectNoA11yViolations(container)
  })
})
