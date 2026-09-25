// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductGallery } from "./storefront-product-gallery"

const photos = (count: number) => Array.from({ length: count }, (_, at) => ({ id: `i${at + 1}`, url: `https://cdn/${at + 1}.png`, alt: at === 0 ? "De frente" : null }))

/** jsdom lays nothing out: the strip gets a width, and a scroll is told to it by hand. */
function stripOf(container: HTMLElement): HTMLElement {
  const strip = container.querySelector<HTMLElement>(".snap-x")!
  Object.defineProperty(strip, "clientWidth", { configurable: true, value: 400 })
  return strip
}

describe("StorefrontProductGallery", () => {
  it("puts every photo in the strip, the first loaded at once and the rest when reached", () => {
    render(<StorefrontProductGallery images={photos(3)} name="Blusa" />)

    const slides = screen.getAllByRole("button", { name: /^Ampliar foto/ })
    expect(slides).toHaveLength(3)
    expect(within(slides[0]!).getByRole("img", { name: "De frente" })).toHaveAttribute("loading", "eager")
    expect(within(slides[1]!).getByRole("img", { name: "Blusa" })).toHaveAttribute("loading", "lazy")
    // One tab stop: the photo on show.
    expect(slides.map((slide) => slide.tabIndex)).toEqual([0, -1, -1])
  })

  it("moves the strip to a thumbnail's photo, and presses the thumbnail of the photo the strip rests on", async () => {
    const user = userEvent.setup()
    const { container } = render(<StorefrontProductGallery images={photos(3)} name="Blusa" />)
    const strip = stripOf(container)

    await user.click(screen.getByRole("button", { name: "Foto 3 de 3" }))
    expect(strip.scrollLeft).toBe(800)

    fireEvent.scroll(strip)
    expect(screen.getByRole("button", { name: "Foto 3 de 3" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "De frente" })).toHaveAttribute("aria-pressed", "false")
  })

  it("draws five thumbnails and '+3' for eight photos, which opens the viewer on the sixth", async () => {
    const user = userEvent.setup()
    render(<StorefrontProductGallery images={photos(8)} name="Blusa" />)

    expect(screen.getAllByRole("button", { pressed: false }).length + screen.getAllByRole("button", { pressed: true }).length).toBe(5)
    await user.click(screen.getByRole("button", { name: "Ver mais 3 fotos" }))

    const viewer = await screen.findByRole("dialog", { name: "Fotos de Blusa" })
    expect(within(viewer).getAllByRole("img")).toHaveLength(8)
  })

  it("opens the photo at full screen on a click, and closes with Esc", async () => {
    const user = userEvent.setup()
    render(<StorefrontProductGallery images={photos(2)} name="Blusa" />)

    await user.click(screen.getByRole("button", { name: "Ampliar foto 1 de 2" }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    await user.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("draws the badge it is given over the photo, and no thumbnails for a single photo", () => {
    render(<StorefrontProductGallery images={photos(1)} name="Blusa" badge={<span>-20%</span>} />)

    expect(screen.getByText("-20%")).toBeInTheDocument()
    expect(screen.queryByRole("button", { pressed: true })).not.toBeInTheDocument()
  })

  it("offers the hint only where a pointer hovers", () => {
    render(<StorefrontProductGallery images={photos(2)} name="Blusa" />)

    expect(screen.getByText("Passe o mouse para ampliar · clique para tela cheia")).toHaveClass("hidden", "[@media(hover:hover)]:block")
  })

  it("says there is no photo yet, and has no accessibility violations", async () => {
    const { container, rerender } = render(<StorefrontProductGallery images={[]} name="Blusa" />)
    expect(screen.getByText("Sem foto")).toBeInTheDocument()
    await expectNoA11yViolations(container)

    rerender(<StorefrontProductGallery images={photos(8)} name="Blusa" badge={<span className="absolute">-20%</span>} />)
    await expectNoA11yViolations(container)
  })
})
