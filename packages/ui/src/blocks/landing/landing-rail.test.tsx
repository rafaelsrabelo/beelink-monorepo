// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingRail } from "./landing-rail"

/**
 * jsdom lays nothing out and scrolls nothing, as `scroll-rail.test.tsx` says: the widths the row
 * reads, where it stands and the two scrolling methods are supplied by hand, and the observer is a
 * stub that fires once.
 */
function renderRail({ at = 0 }: { at?: number } = {}) {
  const scrollBy = vi.fn()
  const scrollTo = vi.fn()

  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly changed: () => void) {}
      observe() {
        this.changed()
      }
      disconnect() {}
    },
  )
  // Three banners of 600px in a 1200px window: the row ends 600px in.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200)
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1800)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, "scrollLeft", "get").mockReturnValue(at)
  Object.defineProperty(HTMLElement.prototype, "scrollBy", { value: scrollBy, configurable: true, writable: true })
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: scrollTo, configurable: true, writable: true })

  const view = render(
    <LandingRail heading={<h2>Uma plataforma.</h2>} label="Destaques" previousLabel="Anterior" nextLabel="Próximo" position="Destaque {current} de {total}" count={3}>
      <li>um</li>
      <li>dois</li>
      <li>três</li>
    </LandingRail>,
  )
  const dots = () => [...view.container.querySelectorAll("[aria-hidden='true'] > span")].map((dot) => (dot.className.includes("w-7") ? "●" : "○")).join("")

  return { ...view, scrollBy, scrollTo, dots }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("LandingRail", () => {
  it("is a named row a keyboard can hold and scroll, with its banners as a list inside", () => {
    renderRail()

    const row = screen.getByRole("group", { name: "Destaques" })
    expect(row).toHaveAttribute("tabindex", "0")
    expect(row.querySelectorAll("li")).toHaveLength(3)
    expect(screen.getByRole("heading", { level: 2, name: "Uma plataforma." })).toBeInTheDocument()
  })

  it("steps a banner at a time, and leaves the smoothness to CSS", async () => {
    const { scrollBy } = renderRail()

    await userEvent.click(screen.getByRole("button", { name: "Próximo" }))

    // No `behavior`: passed here it fights the row's snap.
    expect(scrollBy).toHaveBeenCalledWith({ left: 600 })
  })

  it("wraps round at either end rather than dead-ending", async () => {
    const atEnd = renderRail({ at: 600 })
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }))
    expect(atEnd.scrollTo).toHaveBeenCalledWith({ left: 0 })
    atEnd.unmount()
    vi.restoreAllMocks()

    const atStart = renderRail({ at: 0 })
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }))
    expect(atStart.scrollTo).toHaveBeenCalledWith({ left: 600 })
  })

  it("lights the dot of the banner in view, and says which to a reader", () => {
    const start = renderRail({ at: 0 })
    expect(start.dots()).toBe("●○○")
    expect(screen.getByText("Destaque 1 de 3")).toHaveAttribute("aria-live", "polite")
    start.unmount()
    vi.restoreAllMocks()

    // The row's end: the last banner is in view, though its edge never reached the row's start.
    const end = renderRail({ at: 600 })
    expect(end.dots()).toBe("○○●")
    expect(screen.getByText("Destaque 3 de 3")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderRail()

    await expectNoA11yViolations(container)
  })
})
