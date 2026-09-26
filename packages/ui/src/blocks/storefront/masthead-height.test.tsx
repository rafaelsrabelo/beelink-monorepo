// Libs
import { render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { MastheadHeight } from "./masthead-height"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("MastheadHeight", () => {
  it("writes the header's height on the shop window's root, where the page below can read it", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(117)

    const { container } = render(
      <div data-shop-window="">
        <header>
          <MastheadHeight />
        </header>
        <main />
      </div>,
    )

    const root = container.querySelector<HTMLElement>("[data-shop-window]")!
    expect(root.style.getPropertyValue("--shop-masthead-height")).toBe("117px")
  })

  // A phone's header grows a line for the search, and the category photographs wrap: it is measured again.
  it("writes the height again when the header changes size", () => {
    const height = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(117)
    let resized: () => void = () => undefined
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback
        }
        observe() {}
        disconnect() {}
      },
    )

    const { container } = render(
      <div data-shop-window="">
        <header>
          <MastheadHeight />
        </header>
      </div>,
    )
    height.mockReturnValue(161)
    resized()

    const root = container.querySelector<HTMLElement>("[data-shop-window]")!
    expect(root.style.getPropertyValue("--shop-masthead-height")).toBe("161px")
    vi.unstubAllGlobals()
  })

  it("does nothing outside a shop window", () => {
    const { container } = render(
      <header>
        <MastheadHeight />
      </header>,
    )

    expect(container.querySelector("header")!.getAttribute("style")).toBeNull()
  })
})
