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

  it("does nothing outside a shop window", () => {
    const { container } = render(
      <header>
        <MastheadHeight />
      </header>,
    )

    expect(container.querySelector("header")!.getAttribute("style")).toBeNull()
  })
})
