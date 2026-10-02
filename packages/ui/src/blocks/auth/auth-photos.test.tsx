// Libs
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AuthPhotos } from "./auth-photos"

const photos = ["muro", "moto", "ponto"].map((name) => <img key={name} src={`/${name}.jpg`} alt="" />)

function renderPhotos() {
  return render(<AuthPhotos photos={photos} label="Fotos da Beelink" position="Foto {current} de {total}" pace={1000} />)
}

const lit = () => screen.getAllByRole("button").map((dot) => (dot.getAttribute("aria-current") ? "●" : "○")).join("")

/** jsdom lays nothing out: what says the carousel is on the screen is supplied by hand. */
function onScreen(shown: boolean) {
  vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockReturnValue(shown ? document.body : null)
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("AuthPhotos", () => {
  it("is a named carousel of every photo it is handed, with a dot for each and no arrows", () => {
    renderPhotos()

    const carousel = screen.getByRole("region", { name: "Fotos da Beelink" })
    expect([...carousel.querySelectorAll("img")].map((photo) => photo.getAttribute("src"))).toEqual(["/muro.jpg", "/moto.jpg", "/ponto.jpg"])
    // The image fills its slide: the slide is what is positioned.
    expect(carousel.querySelector("img")?.parentElement).toHaveClass("relative", "h-full")
    expect(screen.getAllByRole("button").map((dot) => dot.getAttribute("aria-label"))).toEqual(["Foto 1 de 3", "Foto 2 de 3", "Foto 3 de 3"])
    expect(lit()).toBe("●○○")
  })

  it("goes to the photo whose dot is pressed", async () => {
    renderPhotos()

    await userEvent.click(screen.getByRole("button", { name: "Foto 3 de 3" }))

    expect(lit()).toBe("○○●")
  })

  it("passes by itself, and round to the first after the last", () => {
    vi.useFakeTimers()
    onScreen(true)
    renderPhotos()

    act(() => void vi.advanceTimersByTime(1000))
    expect(lit()).toBe("○●○")
    act(() => void vi.advanceTimersByTime(2000))
    expect(lit()).toBe("●○○")
  })

  it("holds still under a pointer and while a dot has the focus, and goes on after", () => {
    vi.useFakeTimers()
    onScreen(true)
    renderPhotos()
    const carousel = screen.getByRole("region", { name: "Fotos da Beelink" })

    act(() => void carousel.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })))
    act(() => void vi.advanceTimersByTime(3000))
    expect(lit()).toBe("●○○")

    act(() => void carousel.dispatchEvent(new MouseEvent("pointerout", { bubbles: true })))
    act(() => screen.getByRole("button", { name: "Foto 1 de 3" }).focus())
    act(() => void vi.advanceTimersByTime(3000))
    expect(lit()).toBe("●○○")

    act(() => screen.getByRole("button", { name: "Foto 1 de 3" }).blur())
    act(() => void vi.advanceTimersByTime(1000))
    expect(lit()).toBe("○●○")
  })

  /** The shell hides the photos below `lg`: a carousel nobody sees stays where it is. */
  it("does not pass while it is hidden", () => {
    vi.useFakeTimers()
    onScreen(false)
    renderPhotos()

    act(() => void vi.advanceTimersByTime(3000))

    expect(lit()).toBe("●○○")
  })

  it("never passes by itself for someone who asked for less movement", () => {
    vi.useFakeTimers()
    onScreen(true)
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ matches: query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList)
    renderPhotos()

    act(() => void vi.advanceTimersByTime(3000))

    expect(lit()).toBe("●○○")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderPhotos()

    await expectNoA11yViolations(container)
  })
})
