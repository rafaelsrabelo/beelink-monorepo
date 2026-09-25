// Libs
import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCardPhotos } from "./storefront-card-photos"

const urls = ["/1.jpg", "/2.jpg", "/3.jpg"]

/** jsdom lays nothing out: the strip gets a width, and a scroll is told to it by hand. */
function stripOf(container: HTMLElement): HTMLElement {
  const strip = container.querySelector<HTMLElement>(".snap-x")!
  Object.defineProperty(strip, "clientWidth", { configurable: true, value: 200 })
  return strip
}

describe("StorefrontCardPhotos", () => {
  it("puts every photo in a strip that snaps, each linking to the product, the rest loaded as reached", () => {
    const { container } = render(<StorefrontCardPhotos urls={urls} href="/loja/produtos/whey" />)

    const links = container.querySelectorAll("a")
    expect(links).toHaveLength(3)
    for (const link of links) expect(link).toHaveAttribute("href", "/loja/produtos/whey")
    expect([...container.querySelectorAll("img")].map((img) => img.getAttribute("loading"))).toEqual(["lazy", "lazy", "lazy"])
  })

  it("is decoration to a reader: hidden, and out of the tab order", () => {
    const { container } = render(<StorefrontCardPhotos urls={urls} href="/x" />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    for (const control of container.querySelectorAll("a, button")) expect(control).toHaveAttribute("tabindex", "-1")
  })

  it("passes the photos with the arrows, round from the last to the first, and marks the dot in view", () => {
    const { container } = render(<StorefrontCardPhotos urls={urls} href="/x" />)
    const strip = stripOf(container)
    const [previous, next] = container.querySelectorAll<HTMLButtonElement>("button")

    fireEvent.click(next!)
    fireEvent.scroll(strip)
    expect(strip.scrollLeft).toBe(200)
    fireEvent.click(previous!)
    fireEvent.scroll(strip)
    expect(strip.scrollLeft).toBe(0)

    fireEvent.click(previous!)
    fireEvent.scroll(strip)
    expect(strip.scrollLeft).toBe(400)
    const dots = [...container.querySelectorAll("button span")]
    expect(dots[2]).toHaveClass("bg-shop-primary")
  })

  it("lets a rail keep a finger's swipe on a touch screen, where the dots pass the photos", () => {
    const { container } = render(<StorefrontCardPhotos urls={urls} href="/x" inRail />)

    expect(container.querySelector(".snap-x")).toHaveClass("pointer-coarse:overflow-x-hidden")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCardPhotos urls={urls} href="/x" />)

    await expectNoA11yViolations(container)
  })
})
