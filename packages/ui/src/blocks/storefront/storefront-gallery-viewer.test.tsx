// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Lib
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleStoreColors } from "../store/store.fixtures"
import { ShopPaletteProvider } from "./shop-palette-context"
import { StorefrontGalleryViewer } from "./storefront-gallery-viewer"

const images = [1, 2, 3].map((n) => ({ id: `i${n}`, url: `https://cdn/${n}.png`, alt: null }))

describe("StorefrontGalleryViewer", () => {
  it("steps with → and counts where it is aloud", async () => {
    const user = userEvent.setup()
    render(<StorefrontGalleryViewer images={images} name="Blusa" open start={0} onOpenChange={() => {}} />)

    const viewer = await screen.findByRole("dialog", { name: "Fotos de Blusa" })
    const strip = viewer.querySelector<HTMLElement>("[data-slot='viewer-strip']")!
    Object.defineProperty(strip, "clientWidth", { configurable: true, value: 500 })
    await user.keyboard("{ArrowRight}")
    expect(strip.scrollLeft).toBe(500)

    fireEvent.scroll(strip)
    expect(within(viewer).getByText("Foto 2 de 3")).toHaveAttribute("aria-live", "polite")
    expect(within(viewer).getByRole("button", { name: "Foto anterior" })).toBeEnabled()
  })

  it("closes with Esc", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<StorefrontGalleryViewer images={images} name="Blusa" open start={1} onOpenChange={onOpenChange} />)

    await screen.findByRole("dialog")
    await user.keyboard("{Escape}")

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("carries the shop's palette into the portal", async () => {
    render(
      <ShopPaletteProvider colors={sampleStoreColors}>
        <StorefrontGalleryViewer images={images} name="Blusa" open start={0} onOpenChange={() => {}} />
      </ShopPaletteProvider>,
    )

    const viewer = await screen.findByRole("dialog")
    expect(viewer.style.getPropertyValue("--shop-primary")).toBe(String(shopPaletteVariables(sampleStoreColors)["--shop-primary" as keyof ReturnType<typeof shopPaletteVariables>]))
  })

  it("has no accessibility violations", async () => {
    render(<StorefrontGalleryViewer images={images} name="Blusa" open start={0} onOpenChange={() => {}} />)

    await expectNoA11yViolations(await screen.findByRole("dialog"))
  })
})
