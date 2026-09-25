// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontGalleryRail } from "./storefront-gallery-rail"

const images = Array.from({ length: 7 }, (_, at) => ({ id: `i${at}`, url: `https://cdn/${at}.png`, alt: null }))

describe("StorefrontGalleryRail", () => {
  it("presses the photo on show, ringed in the shop's ink", () => {
    render(<StorefrontGalleryRail images={images.slice(0, 3)} shown={1} onShow={() => {}} onMore={() => {}} />)

    const shown = screen.getByRole("button", { name: "Foto 2 de 3" })
    expect(shown).toHaveAttribute("aria-pressed", "true")
    expect(shown).toHaveClass("border-2", "border-shop-primary-ink")
    expect(screen.getByRole("button", { name: "Foto 1 de 3" })).toHaveClass("border", "border-shop-frame")
  })

  it("tells which thumbnail was pressed, and opens the rest from '+N'", async () => {
    const user = userEvent.setup()
    const onShow = vi.fn()
    const onMore = vi.fn()
    render(<StorefrontGalleryRail images={images} shown={0} onShow={onShow} onMore={onMore} />)

    await user.click(screen.getByRole("button", { name: "Foto 3 de 7" }))
    expect(onShow).toHaveBeenCalledWith(2)

    const more = screen.getByRole("button", { name: "Ver mais 2 fotos" })
    expect(more).toHaveTextContent("+2")
    await user.click(more)
    expect(onMore).toHaveBeenCalledWith(5)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontGalleryRail images={images} shown={0} onShow={() => {}} onMore={() => {}} />)

    await expectNoA11yViolations(container)
  })
})
