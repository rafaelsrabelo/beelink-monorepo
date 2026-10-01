// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { StoreReviewPage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { ReviewsScreen } from "./reviews-screen"

const PRODUCT = "01a0d395-c1ab-7399-a472-000000000001"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  search: new URLSearchParams(),
  reviews: vi.fn(),
  toggle: vi.fn(),
  markSeen: vi.fn(),
  toggleState: { isPending: false, variables: undefined as { reviewId: string } | undefined, error: null as Error | null },
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => mocks.search }))
vi.mock("@/services/reviews/shop-review-hooks", () => ({
  useShopReviews: mocks.reviews,
  useSetShopReviewVisibility: () => ({ mutate: mocks.toggle, ...mocks.toggleState }),
  useMarkShopReviewsSeen: () => ({ mutate: mocks.markSeen }),
}))

const page: StoreReviewPage = {
  reviews: [
    { id: "r1", rating: 5, comment: "Muito bom.", variantLabel: null, product: { id: PRODUCT, name: "Whey", slug: "whey" }, customer: { id: "c1", name: "Bia Souza" }, hidden: false, createdAt: "2026-09-30T12:00:00.000Z", updatedAt: "2026-09-30T12:00:00.000Z" },
    { id: "r2", rating: 1, comment: null, variantLabel: null, product: { id: "p2", name: "Haze", slug: "haze" }, customer: { id: "c2", name: "Caio" }, hidden: true, createdAt: "2026-09-29T12:00:00.000Z", updatedAt: "2026-09-29T12:00:00.000Z" },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  counts: { ALL: 2, PUBLISHED: 1, HIDDEN: 1 },
}

beforeEach(() => {
  mocks.search = new URLSearchParams()
  mocks.reviews.mockReturnValue({ data: page, isPending: false, isFetching: false, refetch: vi.fn() })
  mocks.toggle.mockReset()
  mocks.markSeen.mockReset()
  Object.assign(mocks.toggleState, { isPending: false, variables: undefined, error: null })
})

describe("ReviewsScreen", () => {
  it("marks the list seen on opening, and lists the reviews with every status' count", () => {
    render(<ReviewsScreen slug="loja" locale="pt-BR" messages={ui} web={web} />)

    expect(mocks.markSeen).toHaveBeenCalledWith({ until: "2026-09-30T12:00:00.000Z" })
    expect(mocks.reviews).toHaveBeenCalledWith("loja", {})
    expect(screen.getByRole("link", { name: "Ocultas (1)" })).toHaveAttribute("href", "/admin/loja/reviews?estado=ocultas")
    expect(screen.getByRole("link", { name: "Ver só as de Whey" })).toHaveAttribute("href", `/admin/loja/reviews?produto=${PRODUCT}`)
  })

  it("asks what the address says, and names the product it is narrowed to", () => {
    mocks.search = new URLSearchParams(`estado=publicadas&nota=5&produto=${PRODUCT}`)
    render(<ReviewsScreen slug="loja" locale="pt-BR" messages={ui} web={web} />)

    expect(mocks.reviews).toHaveBeenCalledWith("loja", { status: "PUBLISHED", rating: 5, productId: PRODUCT })
    // Narrowed, the newest are not all on screen: nothing is marked seen.
    expect(mocks.markSeen).not.toHaveBeenCalled()
    expect(screen.getByText("Produto: Whey")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tirar o filtro de produto" })).toHaveAttribute("href", "/admin/loja/reviews?estado=publicadas&nota=5")
  })

  it("hides a published one and publishes a hidden one, and says why when the shop refused", async () => {
    const { rerender } = render(<ReviewsScreen slug="loja" locale="pt-BR" messages={ui} web={web} />)
    await userEvent.click(screen.getByRole("button", { name: "Ocultar a avaliação de Bia Souza" }))
    expect(mocks.toggle).toHaveBeenCalledWith({ reviewId: "r1", hidden: true })
    await userEvent.click(screen.getByRole("button", { name: "Publicar a avaliação de Caio" }))
    expect(mocks.toggle).toHaveBeenCalledWith({ reviewId: "r2", hidden: false })

    Object.assign(mocks.toggleState, { error: Object.assign(new Error("REVIEW_NOT_FOUND"), { errorCode: "REVIEW_NOT_FOUND" }) })
    rerender(<ReviewsScreen slug="loja" locale="pt-BR" messages={ui} web={web} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Essa avaliação não está mais aqui.")
  })

  it("says a read that failed failed, never an empty shop", () => {
    mocks.reviews.mockReturnValue({ data: undefined, isPending: false, isFetching: false, refetch: vi.fn() })
    render(<ReviewsScreen slug="loja" locale="pt-BR" messages={ui} web={web} />)
    expect(screen.getByRole("alert")).toHaveTextContent("As avaliações não carregaram.")
  })
})
