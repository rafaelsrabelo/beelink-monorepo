// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontPagination } from "./storefront-pagination"

function renderPagination(overrides: Partial<Parameters<typeof StorefrontPagination>[0]> = {}) {
  return render(
    <StorefrontPagination
      page={3}
      pageCount={12}
      href={(page) => `/lessari/produtos?pagina=${page}`}
      {...overrides}
    />,
  )
}

/** What the row actually offers, in order — the "…" included, since it is what was left out. */
function offered(container: HTMLElement): string[] {
  return [...container.querySelectorAll("li")].map((slot) => slot.textContent ?? "")
}

describe("StorefrontPagination", () => {
  /** `?pagina=2` has to be shareable, indexable and to work before any JavaScript arrives. */
  it("moves through the address, and lets the screen spell the query", () => {
    renderPagination()

    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/lessari/produtos?pagina=2",
    )
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      "/lessari/produtos?pagina=4",
    )
    expect(screen.getByRole("link", { name: "Página 12" })).toHaveAttribute(
      "href",
      "/lessari/produtos?pagina=12",
    )
  })

  /** The visible text is one digit, which announces as "3, link" and says three of what. */
  it("names a numbered link with more than its digit, and keeps the digit visible", () => {
    renderPagination()

    const third = screen.getByRole("link", { name: "Página 3" })
    expect(third).toHaveTextContent("3")
    expect(third).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Página 4" })).not.toHaveAttribute("aria-current")
  })

  it("names the nav, which otherwise reads as a row of digits with no purpose", () => {
    renderPagination()

    expect(screen.getByRole("navigation", { name: "Páginas de resultados" })).toBeInTheDocument()
    expect(screen.getByText("Página 3 de 12")).toBeInTheDocument()
  })

  /**
   * A disabled anchor is not a thing HTML has: it keeps its place in the tab order and a reader
   * still offers it. 5a keeps the word on page 1, muted, so it stays — as text hidden from a
   * reader, never as a link. (It used to be absent; the design asks for it in place.)
   */
  it("keeps 'Anterior' in place on the first page as muted text, never a link, never disabled", () => {
    const { container } = renderPagination({ page: 1 })

    expect(screen.queryByRole("link", { name: "Anterior" })).not.toBeInTheDocument()
    expect(screen.getByText(/Anterior/)).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText(/Anterior/)).toHaveClass("text-shop-muted")
    expect(screen.getByRole("link", { name: "Próxima" })).toBeInTheDocument()
    expect(container.querySelectorAll("[aria-disabled], [disabled]")).toHaveLength(0)
  })

  it("marks the current page in the ink of the page", () => {
    renderPagination({ page: 3 })

    expect(screen.getByRole("link", { name: "Página 3" })).toHaveClass("bg-shop-text", "text-shop-on-text")
  })

  it("has no next link on the last page", () => {
    renderPagination({ page: 12 })

    expect(screen.queryByRole("link", { name: "Próxima" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/lessari/produtos?pagina=11",
    )
  })

  it("renders nothing when there is only one page, or none", () => {
    expect(renderPagination({ page: 1, pageCount: 1 }).container).toBeEmptyDOMElement()
    expect(renderPagination({ page: 1, pageCount: 0 }).container).toBeEmptyDOMElement()
  })

  /**
   * Forty pages is where this component usually breaks: three pages prove nothing, because the
   * window never has to choose. First, last, current and its neighbours — eight entries at most.
   */
  it("keeps a big catalogue down to a window instead of a wall", () => {
    const { container } = renderPagination({ page: 20, pageCount: 40 })

    expect(offered(container)).toEqual(["1", "…", "19", "20", "21", "…", "40"])
    expect(screen.queryByRole("link", { name: "Página 2" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Página 39" })).not.toBeInTheDocument()
  })

  it("walks the window with the current page, at both ends", () => {
    // At the ends the window reaches one further inward, as 5a draws page 1: 1 2 3 … N.
    expect(offered(renderPagination({ page: 1, pageCount: 40 }).container)).toEqual([
      "1",
      "2",
      "3",
      "…",
      "40",
    ])
    expect(offered(renderPagination({ page: 40, pageCount: 40 }).container)).toEqual([
      "1",
      "…",
      "38",
      "39",
      "40",
    ])
  })

  /** "…" costs the same width as the digit it hides, so eliding a single page says less for free. */
  it("writes out a jump that would skip exactly one page", () => {
    expect(offered(renderPagination({ page: 4, pageCount: 40 }).container)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "…",
      "40",
    ])
    expect(offered(renderPagination({ page: 37, pageCount: 40 }).container)).toEqual([
      "1",
      "…",
      "36",
      "37",
      "38",
      "39",
      "40",
    ])
  })

  /** A hand-typed `?pagina=0` is a visitor, not an attack: land them on a page that exists. */
  it("clamps a page the address made up", () => {
    const tooLow = within(renderPagination({ page: 0, pageCount: 12 }).container)
    expect(tooLow.getByRole("link", { name: "Página 1" })).toHaveAttribute("aria-current", "page")
    expect(tooLow.queryByRole("link", { name: "Anterior" })).not.toBeInTheDocument()

    const tooHigh = within(renderPagination({ page: 99, pageCount: 12 }).container)
    expect(tooHigh.getByRole("link", { name: "Página 12" })).toHaveAttribute("aria-current", "page")
    expect(tooHigh.queryByRole("link", { name: "Próxima" })).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderPagination({ page: 20, pageCount: 40 })

    await expectNoA11yViolations(container)
  })
})
