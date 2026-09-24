// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontHero, type StorefrontHeroItem } from "./storefront-hero"

const slide = (id: string, over: Partial<StorefrontHeroItem> = {}): StorefrontHeroItem => ({
  id,
  imageUrl: `/hero-${id}.jpg`,
  title: `Banner ${id}`,
  ...over,
})

describe("StorefrontHero", () => {
  it("draws one picture and no controls when there is one", () => {
    render(<StorefrontHero items={[slide("1")]} />)

    expect(screen.getByText("Banner 1")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument()
  })

  // The whole of how a carousel is made: there is no switch, only a count.
  it("becomes a carousel on the second one", () => {
    render(<StorefrontHero items={[slide("1"), slide("2")]} />)

    expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Próximos" })).toBeInTheDocument()
  })

  /**
   * A carousel in a third that kept the full band's fixed height stood half again as tall as the
   * posters beside it and clipped its headline. Out of the full width it is a card among cards.
   */
  it("takes a card's proportion and headline in a slice smaller than the band", () => {
    const { container } = render(<StorefrontHero items={[slide("1")]} span="THIRD" />)

    const picture = container.querySelector("img")!.className
    expect(picture).toContain("aspect-[4/3]")
    expect(picture).not.toContain("h-44")
    expect(screen.getByText("Banner 1").className).toContain("text-lg")
  })

  it("stays the cover it was across the whole band", () => {
    const { container } = render(<StorefrontHero items={[slide("1")]} span="FULL" />)

    expect(container.querySelector("img")!.className).toContain("h-44")
    expect(screen.getByText("Banner 1").className).toContain("sm:text-4xl")
  })

  it("draws nothing at all when it has nothing to draw", () => {
    const { container } = render(<StorefrontHero items={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  // `src=""` is not an empty picture: the browser re-requests the page for it, and the band keeps
  // its fixed height, so the shop shows a stripe of nothing.
  it("skips a banner with no picture rather than drawing an empty frame", () => {
    const { container } = render(<StorefrontHero items={[slide("1", { imageUrl: "" })]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("keeps drawing the ones that do have a picture", () => {
    render(<StorefrontHero items={[slide("1", { imageUrl: "" }), slide("2")]} />)

    expect(screen.getByText("Banner 2")).toBeInTheDocument()
    // One survivor is a cover again, not a carousel of one.
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument()
  })

  it("names a link whose words are painted into the photograph", () => {
    // The picture is decorative and aria-hidden, so without this the anchor holds nothing at all
    // and a screen reader announces a bare URL.
    render(<StorefrontHero items={[{ id: "1", imageUrl: "/h.jpg", href: "/loja" }]} />)

    expect(screen.getByRole("link")).toHaveAccessibleName()
  })

  it("opens an outbound banner in a new tab, with the pair", () => {
    render(<StorefrontHero items={[slide("1", { href: "https://wa.me/55", external: true })]} />)

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
  })

  it("draws a poster and not a link when it goes nowhere", () => {
    render(<StorefrontHero items={[slide("1")]} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontHero items={[slide("1"), slide("2")]} />)

    await expectNoA11yViolations(container)
  })
})
