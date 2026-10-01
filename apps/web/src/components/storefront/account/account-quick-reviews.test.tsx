// Libs
import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerPendingReview } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { storefrontRoutes } from "@/lib/storefront-routes"
import { AccountQuickReviews } from "./account-quick-reviews"

const pending = vi.hoisted(() => ({ current: null as CustomerPendingReview[] | null }))
vi.mock("@/lib/customer-reviews", () => ({ pendingReviewsAt: async () => pending.current }))
vi.mock("@/lib/locale", async () => {
  const { ptBR } = await import("@/locales/pt-BR")
  return { getMessages: async () => ({ web: ptBR }) }
})

const routes = storefrontRoutes({
  slug: "loja",
  routeWords: {
    products: "produtos",
    categories: "categorias",
    search: "busca",
    cart: "carrinho",
    signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha",
    account: "conta",
    accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", profile: "perfil", messages: "conversas" },
  },
})

const pendingOf = (count: number): CustomerPendingReview[] =>
  Array.from({ length: count }, (_, index) => ({ productId: `p${index + 1}`, slug: `produto-${index + 1}`, name: `Produto ${index + 1}`, imageUrl: null, variantLabel: index === 0 ? "Sabor: Uva" : null, orderNumber: 10, deliveredAt: "2026-09-20T12:00:00.000Z" }))

async function mount(query: Record<string, string> = {}) {
  const drawn = await AccountQuickReviews({ slug: "loja", routes, query, locale: "pt-BR", messages: ui })
  return render(<>{drawn}</>)
}

afterEach(() => {
  pending.current = null
})

describe("Avalie suas compras, on the account's front", () => {
  it("offers the first four with stars that post in one tap and come back here, and the way to the rest", async () => {
    pending.current = pendingOf(6)
    const { container } = await mount()

    expect(screen.getByRole("heading", { name: "Avalie suas compras" })).toBeInTheDocument()
    expect(container.querySelectorAll("article")).toHaveLength(4)
    expect(screen.getByRole("link", { name: "Ver todos (6)" })).toHaveAttribute("href", "/loja/conta/avaliacoes")
    const first = container.querySelector("article#avaliar-p1")!
    expect(first).toHaveTextContent("Sabor: Uva")
    const form = within(first as HTMLElement).getByRole("group", { name: "Dar nota a Produto 1" }).closest("form")!
    expect(form).toHaveAttribute("action", "/loja/api/customer/avaliacoes")
    expect(form.querySelector('input[name="acao"]')).toHaveValue("criar")
    expect(form.querySelector('input[name="produto"]')).toHaveValue("p1")
    expect(form.querySelector('input[name="retorno"]')).toHaveValue("/loja/conta")
  })

  it("says a rating went through where the page lands, with the way to write words on the tab", async () => {
    pending.current = pendingOf(1)
    const { container } = await mount({ produto: "p9", aviso: "avaliacao-enviada" })

    const landing = container.querySelector("#avaliar-p9")!
    expect(within(landing as HTMLElement).getByRole("status")).toHaveTextContent("Avaliação enviada. Obrigado!")
    expect(within(landing as HTMLElement).getByRole("link", { name: "Escrever um comentário" })).toHaveAttribute("href", "/loja/conta/avaliacoes?produto=p9#avaliar-p9")
    expect(screen.queryByRole("link", { name: /Ver todos/ })).toBeNull()
  })

  it("says a refusal in the card of the product it came back for", async () => {
    pending.current = pendingOf(6)
    const { container } = await mount({ produto: "p6", "erro-avaliacoes": "CUSTOMER_REVIEW_NOT_ELIGIBLE" })

    const card = container.querySelector("article#avaliar-p6")!
    expect(container.querySelector("article")).toBe(card)
    expect(within(card as HTMLElement).getByRole("alert")).toBeInTheDocument()
  })

  it("leads a second tap, refused once the first went through, to the review on the tab", async () => {
    pending.current = pendingOf(2)
    const { container } = await mount({ produto: "p9", "erro-avaliacoes": "CUSTOMER_REVIEW_EXISTS" })

    const landing = container.querySelector("#avaliar-p9")!
    expect(within(landing as HTMLElement).getByRole("alert")).toHaveTextContent("Você já avaliou este produto.")
    expect(within(landing as HTMLElement).getByRole("link", { name: "Abrir em Avaliar compras" })).toHaveAttribute("href", "/loja/conta/avaliacoes?produto=p9#avaliar-p9")
    expect(container.querySelectorAll("#avaliar-p9")).toHaveLength(1)
  })

  it("never says sent over a card still to rate, nor gives two places one id", async () => {
    pending.current = pendingOf(2)
    const { container } = await mount({ produto: "p1", aviso: "avaliacao-enviada" })

    expect(screen.queryByRole("status")).toBeNull()
    expect(container.querySelectorAll("#avaliar-p1")).toHaveLength(1)
  })

  it("draws nothing with nothing to rate, or when the read failed", async () => {
    pending.current = []
    expect((await mount()).container).toBeEmptyDOMElement()
    pending.current = null
    expect((await mount()).container).toBeEmptyDOMElement()
  })
})
