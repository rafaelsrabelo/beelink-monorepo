// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontLoadMore } from "./storefront-load-more"

afterEach(() => {
  vi.unstubAllGlobals()
})

/** jsdom has no IntersectionObserver: this one hands the test the callback to fire by hand. */
function stubObserver() {
  const seen: { fire: (visible: boolean) => void; disconnected: boolean }[] = []
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      private entry: { disconnected: boolean; fire: (visible: boolean) => void }
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        this.entry = { disconnected: false, fire: (visible) => callback([{ isIntersecting: visible }]) }
        seen.push(this.entry)
      }
      observe() {}
      disconnect() {
        this.entry.disconnected = true
      }
    },
  )
  return seen
}

describe("StorefrontLoadMore", () => {
  it("is a link to the next page, which a script turns into more of this one", async () => {
    const onLoad = vi.fn()
    const { container } = render(<StorefrontLoadMore href="/loja/produtos?pagina=2" onLoad={onLoad} />)

    const link = screen.getByRole("link", { name: "Ver mais produtos" })
    expect(link).toHaveAttribute("href", "/loja/produtos?pagina=2")
    await userEvent.click(link)
    expect(onLoad).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })

  it("asks for the next page as the end of the shelf comes near, and not while one is on its way", () => {
    const observers = stubObserver()
    const onLoad = vi.fn()
    const { rerender } = render(<StorefrontLoadMore href="/loja/produtos?pagina=2" onLoad={onLoad} />)

    observers[0]!.fire(false)
    expect(onLoad).not.toHaveBeenCalled()
    observers[0]!.fire(true)
    expect(onLoad).toHaveBeenCalledOnce()

    rerender(<StorefrontLoadMore href="/loja/produtos?pagina=2" onLoad={onLoad} pending />)
    expect(observers[0]!.disconnected).toBe(true)
    expect(observers).toHaveLength(1)
  })

  it("holds the place with cards while the page comes, and says so to a screen reader", async () => {
    const { container } = render(<StorefrontLoadMore href="/x" onLoad={vi.fn()} pending productsPerRow={2} />)

    expect(screen.getByRole("status")).toHaveTextContent("Carregando produtos")
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("offers to try again when the page would not come", async () => {
    const onLoad = vi.fn()
    render(<StorefrontLoadMore href="/x" onLoad={onLoad} failed />)

    expect(screen.getByRole("alert")).toHaveTextContent("Não deu para carregar mais produtos agora.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onLoad).toHaveBeenCalledOnce()
  })
})
