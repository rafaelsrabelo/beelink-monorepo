// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductReview } from "./storefront-product-review"
import { StorefrontProductReviews } from "./storefront-product-reviews"
import { StorefrontProductReviewsSkeleton } from "./storefront-product-reviews-skeleton"
import { StorefrontReviewSummary, type StorefrontReviewSummaryRow } from "./storefront-review-summary"

const rows: StorefrontReviewSummaryRow[] = [
  { stars: 5, percent: 78, href: "?nota=5#avaliacoes", active: false },
  { stars: 4, percent: 14, href: "?nota=4#avaliacoes", active: true },
  { stars: 3, percent: 5, href: "?nota=3#avaliacoes", active: false },
  { stars: 2, percent: 1, href: "?nota=2#avaliacoes", active: false },
  { stars: 1, percent: 2, href: "?nota=1#avaliacoes", active: false },
]

describe("StorefrontReviewSummary", () => {
  it("says the average and how many, and reads each bar as one sentence that narrows the list", () => {
    render(<StorefrontReviewSummary average={4.7} count={128} rows={rows} locale="pt-BR" />)

    expect(screen.getByText("Nota 4,7 de 5, 128 avaliações")).toBeInTheDocument()
    expect(screen.getByText("128 avaliações")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "5 estrelas: 78% das avaliações" })).toHaveAttribute("href", "?nota=5#avaliacoes")
    expect(screen.getByRole("link", { name: "4 estrelas: 14% das avaliações" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("link", { name: "1 estrela: 2% das avaliações" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontReviewSummary average={1} count={1} rows={rows} locale="pt-BR" />)
    await expectNoA11yViolations(container)
  })
})

describe("StorefrontProductReview", () => {
  it("names the author, reads the stars, and says when, which and that it was bought", () => {
    render(<StorefrontProductReview authorName="Bia S." rating={4} comment="Muito bom." variantLabel="Sabor: Uva" date="30 set 2026" />)

    expect(screen.getByText("Bia S.")).toBeInTheDocument()
    expect(screen.getByText("Nota 4 de 5")).toBeInTheDocument()
    expect(screen.getByText(/Avaliado em 30 set 2026 · Sabor: Uva ·/)).toBeInTheDocument()
    expect(screen.getByText("Compra verificada")).toBeInTheDocument()
    expect(screen.getByText("Muito bom.")).toBeInTheDocument()
  })
})

describe("StorefrontProductReviews", () => {
  it("is the page's #avaliacoes, headed, with the way back to every rating and a word for none", () => {
    const { container } = render(<StorefrontProductReviews summary={<p>resumo</p>} reviews={[]} allHref="?#avaliacoes" />)

    expect(container.querySelector("section")).toHaveAttribute("id", "avaliacoes")
    expect(screen.getByRole("region", { name: "Avaliações de clientes" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Todas as notas" })).toHaveAttribute("href", "?#avaliacoes")
    expect(screen.getByText("Nenhuma avaliação com essa nota.")).toBeInTheDocument()
  })

  it("has no accessibility violations, nor its skeleton", async () => {
    const { container } = render(
      <StorefrontProductReviews
        summary={<StorefrontReviewSummary average={4.5} count={2} rows={rows} locale="pt-BR" />}
        reviews={[<StorefrontProductReview key="r" authorName="Caio" rating={5} comment={null} variantLabel={null} date="1 out 2026" />]}
      />,
    )
    await expectNoA11yViolations(container)

    const skeleton = render(<StorefrontProductReviewsSkeleton />)
    expect(skeleton.container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })
})
