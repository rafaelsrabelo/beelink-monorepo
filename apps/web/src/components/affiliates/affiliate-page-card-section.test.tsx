// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliatePageContent, AffiliatePageOverview, CommissionTableSummary } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliatePageCardSection } from "./affiliate-page-card-section"

const mocks = vi.hoisted(() => ({ save: vi.fn(), overview: { current: null as unknown } }))
vi.mock("@/services/affiliates/affiliate-page-hooks", () => ({
  useAffiliatePage: () => ({ isPending: false, isError: false, data: mocks.overview.current }),
  useSaveAffiliatePage: () => ({ mutate: mocks.save, reset: vi.fn(), isPending: false, error: null, isSuccess: false }),
}))
vi.mock("@/services/stores/store-hooks", () => ({ useStore: () => ({ isPending: false, isError: false, data: store }) }))

const written: AffiliatePageContent = {
  badge: null, title: "Venda a {loja}", subtitle: null, ctaLabel: null, highlights: null, imageUrl: null, stepsTitle: null, steps: null, benefits: [], questionsTitle: null, questions: null,
  closingTitle: null, closingText: null, formTitle: null, formSubtitle: null, askExtraQuestion: false, extraQuestion: null, successMessage: null, bannerTitle: null, bannerText: null, bannerCta: null,
}
const overview: AffiliatePageOverview = {
  page: { open: false, placements: { footerLink: true, topStrip: false }, tableId: null, approval: "MANUAL", content: written, updatedAt: null },
  blockedBy: "CLOSED",
  rateBps: 1000,
  maxRateBps: 1000,
  pendingApplications: 0,
}
const tables: CommissionTableSummary[] = [{ id: "padrao", name: "Padrão", defaultRateBps: 1000, isDefault: true, productRateCount: 0, categoryRateCount: 0, affiliateCount: 0, affiliate: null }]
const store = {
  slug: "lessari",
  customDomain: { host: "lessari.com.br", status: "ACTIVE" },
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", affiliateJoin: "seja-afiliado", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
}

beforeEach(() => {
  mocks.save.mockReset()
  mocks.overview.current = overview
})

describe("AffiliatePageCardSection (plan 2026-11-14)", () => {
  it("says the page is closed, at the shop's own domain, and saves what is chosen with the texts as they stand", async () => {
    render(<AffiliatePageCardSection slug="lessari" origin="https://beelink.com.br" tables={tables} locale="pt-BR" messages={ui} />)

    expect(screen.getByText("lessari.com.br/seja-afiliado")).toBeInTheDocument()
    expect(screen.getByText(ui.affiliatePage.card.blocked.CLOSED)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Editar conteúdo" })).toHaveAttribute("href", "/admin/lessari/affiliates/join-page")

    await userEvent.click(screen.getByRole("switch", { name: "Receber candidaturas pela loja" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mocks.save).toHaveBeenCalledWith({ open: true, placements: { footerLink: true, topStrip: false }, tableId: null, approval: "MANUAL", content: written }, expect.anything())
  })
})
