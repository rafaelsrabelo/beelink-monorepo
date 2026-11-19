// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliatePageContent, AffiliatePageOverview } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliatePageEditorScreen } from "./affiliate-page-editor-screen"

const mocks = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-page-hooks", () => ({
  useAffiliatePage: () => ({ isPending: false, isError: false, data: overview }),
  useSaveAffiliatePage: () => ({ mutate: mocks.save, reset: vi.fn(), isPending: false, error: null, isSuccess: false }),
}))
vi.mock("@/services/stores/store-hooks", () => ({ useStore: () => ({ isPending: false, isError: false, data: store }) }))
vi.mock("@/services/uploads/upload-hooks", () => ({ useImageUpload: () => ({ upload: vi.fn(), pending: false, error: null, reset: vi.fn() }) }))

const nothing: AffiliatePageContent = {
  badge: null, title: null, subtitle: null, ctaLabel: null, highlights: null, imageUrl: null, stepsTitle: null, steps: null, benefits: null, questionsTitle: null, questions: null,
  closingTitle: null, closingText: null, formTitle: null, formSubtitle: null, askExtraQuestion: true, extraQuestion: null, successMessage: null, bannerTitle: null, bannerText: null, bannerCta: null,
}
const overview: AffiliatePageOverview = {
  page: { open: true, placements: { homeBanner: true, footerLink: true, topStrip: false }, tableId: "revenda", approval: "AUTO", content: nothing, updatedAt: "2026-11-14T12:00:00.000Z" },
  blockedBy: null,
  rateBps: 1500,
  maxRateBps: 1500,
  pendingApplications: 0,
}
const store = {
  slug: "lessari",
  name: "Lessari",
  customDomain: null,
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", affiliateJoin: "seja-afiliado", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
}

beforeEach(() => mocks.save.mockReset())

const editor = () => render(<AffiliatePageEditorScreen slug="lessari" origin="https://beelink.com.br" locale="pt-BR" messages={ui} />)

describe("AffiliatePageEditorScreen (plan 2026-11-14)", () => {
  it("starts from the product's own texts, previews them with the shop's name and rate, and saves them as the product's own", async () => {
    editor()

    expect(within(screen.getByRole("complementary", { name: "Prévia do topo" })).getByText("Indique a Lessari e ganhe 15% em cada venda")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver página" })).toHaveAttribute("href", "https://beelink.com.br/lessari/seja-afiliado")
    await userEvent.click(screen.getAllByRole("button", { name: "Salvar" })[0]!)
    // The settings ride along as they stand: the editor changes texts alone.
    expect(mocks.save).toHaveBeenCalledWith({ open: true, placements: overview.page.placements, tableId: "revenda", approval: "AUTO", content: nothing }, expect.anything())
  })

  it("saves what the shop wrote, and refuses before sending a text too long", async () => {
    editor()
    const top = within(screen.getByRole("region", { name: "Topo da página" }))
    const title = top.getByRole("textbox", { name: "Título" })

    await userEvent.clear(title)
    await userEvent.type(title, "Venda a {{loja}")
    await userEvent.click(screen.getAllByRole("button", { name: "Salvar" })[0]!)
    expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ content: { ...nothing, title: "Venda a {loja}" } }), expect.anything())

    mocks.save.mockReset()
    await userEvent.type(title, "x".repeat(120))
    await userEvent.click(screen.getAllByRole("button", { name: "Salvar" })[0]!)
    expect(mocks.save).not.toHaveBeenCalled()
    expect(title).toHaveAttribute("aria-invalid", "true")
  })
})
