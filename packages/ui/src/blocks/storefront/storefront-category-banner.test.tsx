// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCategoryBanner } from "./storefront-category-banner"

describe("StorefrontCategoryBanner", () => {
  it("draws the picture as decoration, asked for at once", () => {
    const { container } = render(<StorefrontCategoryBanner imageUrl="https://cdn.example/ferramentas.png" />)

    const picture = container.querySelector("img")!
    expect(picture).toHaveAttribute("src", "https://cdn.example/ferramentas.png")
    // The h1 under it names the category: an alt would say it twice.
    expect(picture).toHaveAttribute("alt", "")
    expect(picture).toHaveAttribute("loading", "eager")
    expect(picture).toHaveAttribute("fetchpriority", "high")
  })

  // Artwork with words in it: a frame that changed shape with the screen would crop it differently on a phone.
  it("holds one proportion at every width, on the frame, so the page does not jump while it loads", () => {
    const { container } = render(<StorefrontCategoryBanner imageUrl="https://cdn.example/ferramentas.png" />)

    const frame = container.firstElementChild!
    expect(frame.className.split(" ").filter((name) => name.includes("aspect-"))).toEqual(["aspect-[4/1]"])
    expect(frame).toHaveClass("w-full", "overflow-hidden", "rounded-2xl")
    expect(container.querySelector("img")).toHaveClass("size-full", "object-cover")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCategoryBanner imageUrl="https://cdn.example/ferramentas.png" />)

    await expectNoA11yViolations(container)
  })
})
