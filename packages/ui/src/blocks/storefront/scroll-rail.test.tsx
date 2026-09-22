// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ScrollRail } from "./scroll-rail"

/**
 * jsdom lays nothing out: every element measures zero, nothing implements scrolling, and there is
 * no ResizeObserver. So the three things the block reads are supplied by hand — a viewport width,
 * a content width, and a spy where the browser would have a method — and the observer is a stub
 * that fires once, which is what a real one does on `observe`.
 */
function renderRail({ contentWidth = 2400, at = 0 }: { contentWidth?: number; at?: number } = {}) {
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

  // Measured off the prototype, so the values are in place before the block's first read.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(contentWidth)
  vi.spyOn(HTMLElement.prototype, "scrollLeft", "get").mockReturnValue(at)
  // Defined rather than spied on: jsdom implements no scrolling at all, so there is no `scrollBy`
  // on the prototype for a spy to stand in front of.
  Object.defineProperty(HTMLElement.prototype, "scrollBy", {
    value: scrollBy,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    value: scrollTo,
    configurable: true,
    writable: true,
  })

  const view = render(
    <ScrollRail label="Destaques" previousLabel="Anterior" nextLabel="Próximos">
      <ul>
        <li>um</li>
        <li>dois</li>
      </ul>
    </ScrollRail>,
  )

  return { ...view, scrollBy, scrollTo }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ScrollRail", () => {
  /**
   * The reason this block exists rather than `components/carousel`: Embla hides the overflow and
   * drives by transform, so a visitor whose script has not arrived cannot reach past the fold.
   * Here the browser scrolls, and the arrows are an addition on top.
   */
  it("scrolls natively, so the row is reachable before any script runs", () => {
    renderRail()

    const track = screen.getByRole("group", { name: "Destaques" })
    expect(track.className).toContain("overflow-x-auto")
    expect(track.className).not.toContain("overflow-hidden")
  })

  /**
   * A region that scrolls sideways cannot be reached by a keyboard unless it can hold focus — the
   * arrow keys scroll whatever is focused, and a div is nothing. WCAG 2.1.1, and axe cannot catch
   * it here because jsdom measures nothing as scrollable.
   */
  it("can hold focus and says what it is", () => {
    renderRail()

    const track = screen.getByRole("group", { name: "Destaques" })
    expect(track).toHaveAttribute("tabindex", "0")
  })

  it("steps by about a screenful, in both directions", async () => {
    const user = userEvent.setup()
    // From the middle, so neither end's wrap-around is what is being measured here.
    const { scrollBy } = renderRail({ at: 800 })

    await user.click(screen.getByRole("button", { name: "Próximos" }))
    expect(scrollBy).toHaveBeenCalledWith({ left: 800 - 96 })

    await user.click(screen.getByRole("button", { name: "Anterior" }))
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -(800 - 96) })
  })

  /**
   * The regression this pins is one this file cannot otherwise see. Passing `behavior: "smooth"`
   * in the options fights `scroll-snap-type`: measured in Chrome, the step landed back at 0 with
   * snap on and only travelled with snap off. The smoothness is CSS, and it stays CSS.
   */
  it("leaves the smoothness to CSS, because the option fights scroll-snap", async () => {
    const user = userEvent.setup()
    const { scrollBy } = renderRail()

    await user.click(screen.getByRole("button", { name: "Próximos" }))

    expect(scrollBy.mock.calls[0]?.[0]).not.toHaveProperty("behavior")
    expect(screen.getByRole("group", { name: "Destaques" }).className).toContain("scroll-smooth")
  })

  /** Two unnamed icon buttons announce as "button" and nothing else. */
  it("names both arrows", () => {
    renderRail()

    expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Próximos" })).toBeInTheDocument()
  })

  /**
   * The common case on this product: a shop with four items fills less than a screen. Two arrows
   * that do nothing on a shop's front door are worse than no arrows, and this is the shape a
   * measurement-free version would get wrong on almost every shop.
   */
  it("draws no arrows at all when the row already fits", () => {
    renderRail({ contentWidth: 400 })

    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Próximos" })).not.toBeInTheDocument()
    // And the row is still there, still scrollable by hand.
    expect(screen.getByRole("group", { name: "Destaques" })).toBeInTheDocument()
  })

  /**
   * An arrow that goes quiet on the last card is a control that teaches you to stop using it. The
   * shopkeeper asked for the row to come back round, and it is also what says the row was finite.
   */
  it("comes back to the first card when the last one is already in view", async () => {
    const user = userEvent.setup()
    // 2400 of content in an 800 viewport ends at 1600.
    const { scrollTo, scrollBy } = renderRail({ at: 1600 })

    await user.click(screen.getByRole("button", { name: "Próximos" }))

    expect(scrollTo).toHaveBeenCalledWith({ left: 0 })
    expect(scrollBy).not.toHaveBeenCalled()
  })

  it("goes to the last card when stepping back from the first", async () => {
    const user = userEvent.setup()
    const { scrollTo } = renderRail({ at: 0 })

    await user.click(screen.getByRole("button", { name: "Anterior" }))

    expect(scrollTo).toHaveBeenCalledWith({ left: 1600 })
  })

  /**
   * A focused control is one the browser scrolls into view, and these sit halfway down a band that
   * is often at the fold — so the page lurches vertically at the moment the reader asked for a
   * horizontal move. Preventing the default on mousedown stops focus from a pointer only.
   */
  it("does not take focus from a pointer, so the page cannot lurch", async () => {
    const user = userEvent.setup()
    renderRail()

    const next = screen.getByRole("button", { name: "Próximos" })
    await user.click(next)

    expect(next).not.toHaveFocus()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderRail()

    await expectNoA11yViolations(container)
  })
})
