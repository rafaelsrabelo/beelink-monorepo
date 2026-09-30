// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ReviewFilters } from "./review-filters"
import { ReviewList, type ReviewListRow } from "./review-list"
import { ReviewListSkeleton } from "./review-list-skeleton"
import { ReviewsFailed } from "./reviews-failed"

const rows: ReviewListRow[] = [
  { id: "r1", rating: 5, comment: "Muito bom.", productName: "Whey", productHref: "?produto=p1", customerName: "Bia Souza", date: "30 set", hidden: false },
  { id: "r2", rating: 1, comment: null, productName: "Haze", productHref: "?produto=p2", customerName: "Caio", date: "29 set", hidden: true },
]

describe("ReviewFilters", () => {
  it("offers every status with its count, the ratings, and the product chosen with the way back", () => {
    render(
      <ReviewFilters
        statuses={[
          { key: "ALL", label: "Todas", count: 3, href: "?", active: false },
          { key: "HIDDEN", label: "Ocultas", count: 1, href: "?estado=ocultas", active: true },
        ]}
        ratings={[
          { rating: null, href: "?", active: true },
          { rating: 5, href: "?nota=5", active: false },
        ]}
        product={{ name: "Whey", clearHref: "?estado=ocultas" }}
      />,
    )

    expect(screen.getByRole("link", { name: "Ocultas (1)" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("link", { name: "5 estrelas" })).toHaveAttribute("href", "?nota=5")
    expect(screen.getByText("Produto: Whey")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tirar o filtro de produto" })).toHaveAttribute("href", "?estado=ocultas")
  })
})

describe("ReviewList", () => {
  it("reads each review — its rating, words, who, when and the product — and hides or publishes it", async () => {
    const onToggle = vi.fn()
    render(<ReviewList rows={rows} empty="none" busyId="r2" onToggle={onToggle} />)

    expect(screen.getByText("Nota 5 de 5")).toBeInTheDocument()
    expect(screen.getByText("Sem comentário.")).toBeInTheDocument()
    expect(screen.getByText("Oculta")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Whey" })).toHaveAttribute("href", "?produto=p1")

    await userEvent.click(screen.getByRole("button", { name: "Ocultar a avaliação de Bia Souza" }))
    expect(onToggle).toHaveBeenCalledWith(rows[0])
    expect(screen.getByRole("button", { name: "Publicar a avaliação de Caio" })).toBeDisabled()
  })

  it("says why it is empty: none yet, or none under the filters", () => {
    const { rerender } = render(<ReviewList rows={[]} empty="none" onToggle={() => {}} />)
    expect(screen.getByText("Nenhuma avaliação ainda.")).toBeInTheDocument()

    rerender(<ReviewList rows={[]} empty="filtered" onToggle={() => {}} />)
    expect(screen.getByText("Nenhuma avaliação com esses filtros.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ReviewList rows={rows} empty="none" onToggle={() => {}} />)
    await expectNoA11yViolations(container)
  })
})

describe("ReviewsFailed and ReviewListSkeleton", () => {
  it("says the read failed and asks again; the skeleton is hidden from readers", async () => {
    const onRetry = vi.fn()
    render(<ReviewsFailed onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("As avaliações não carregaram.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledOnce()

    const { container } = render(<ReviewListSkeleton />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    await expectNoA11yViolations(container)
  })
})
