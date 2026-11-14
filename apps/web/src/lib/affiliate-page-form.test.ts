// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AffiliatePageContent, AffiliatePageSettings, ShopAffiliateApplication } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { applicationViewOf } from "./affiliate-applications-view"
import { cardValuesOf, contentIssuesOf, contentOf, contentValuesOf, pageAddressOf, pagePayloadOf, pageStatusOf, previewOf, restoredValuesOf } from "./affiliate-page-form"

const defaults = ui.affiliateJoin.defaults
const words = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", affiliateJoin: "seja-afiliado", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }

const nothing: AffiliatePageContent = {
  badge: null, title: null, subtitle: null, ctaLabel: null, highlights: null, imageUrl: null, stepsTitle: null, steps: null, benefits: null, questionsTitle: null, questions: null,
  closingTitle: null, closingText: null, formTitle: null, formSubtitle: null, askExtraQuestion: true, extraQuestion: null, successMessage: null, bannerTitle: null, bannerText: null, bannerCta: null,
}

describe("the page's texts in the editor (plan 2026-11-14)", () => {
  it("shows the product's own where the shop wrote none, and saves them back as the product's own", () => {
    const values = contentValuesOf(nothing, defaults)
    expect(values.title).toBe(defaults.title)
    expect(values.steps).toEqual(defaults.steps)
    expect(values.questions[0]).toEqual({ title: defaults.questions[0]!.question, text: defaults.questions[0]!.answer })
    expect(contentOf(values, defaults)).toEqual(nothing)
  })

  it("keeps what the shop wrote, trimmed, a blank text as the product's own, and a list it changed whole", () => {
    const values = contentValuesOf(nothing, defaults)
    const typed = { ...values, title: "  Venda a {loja}  ", subtitle: "   ", benefits: values.benefits.slice(1), questions: [], highlights: ["Pix", "", ""] }
    expect(contentOf(typed, defaults)).toEqual({
      ...nothing,
      title: "Venda a {loja}",
      benefits: defaults.benefits.slice(1),
      questions: [],
      highlights: ["Pix"],
    })
  })

  it("reads back a page the shop wrote", () => {
    const written: AffiliatePageContent = { ...nothing, title: "Venda a {loja}", steps: [{ title: "Inscreva-se", text: "Um minuto." }], questions: [{ question: "Quando?", answer: "Três vezes." }], askExtraQuestion: false }
    const values = contentValuesOf(written, defaults)
    expect(values).toMatchObject({ title: "Venda a {loja}", steps: [{ title: "Inscreva-se", text: "Um minuto." }], questions: [{ title: "Quando?", text: "Três vezes." }], askExtraQuestion: false })
    expect(contentOf(values, defaults)).toEqual(written)
  })

  it("says, field by field, what is too long or an item left half written", () => {
    const values = contentValuesOf(nothing, defaults)
    const issues = contentIssuesOf({ ...values, title: "x".repeat(121), steps: [{ title: "Passo", text: " " }], highlights: ["x".repeat(61)] }, ui.affiliatePage.editor)
    expect(issues).toEqual({ title: "Até 120 caracteres.", "steps.0.text": "Preencha este campo.", "highlights.0": "Até 60 caracteres." })
  })

  it("brings one part back to the product's own, and leaves the rest as typed", () => {
    const values = { ...contentValuesOf(nothing, defaults), title: "Meu título", bannerTitle: "Meu banner", imageUrl: "https://res.cloudinary.com/x.png" }
    const restored = restoredValuesOf(values, "top", defaults)
    expect(restored).toMatchObject({ title: defaults.title, imageUrl: null, bannerTitle: "Meu banner" })
  })

  it("previews the top with the marks filled in, a blank text as the product's own", () => {
    const values = { ...contentValuesOf(nothing, defaults), badge: "  " }
    expect(previewOf(values, defaults, { store: "Lessari", rate: "10%" })).toMatchObject({ badge: defaults.badge, title: "Indique a Lessari e ganhe 10% em cada venda" })
  })
})

describe("the page's settings", () => {
  const page: AffiliatePageSettings = { open: true, placements: { homeBanner: true, footerLink: false, topStrip: false }, tableId: null, approval: "MANUAL", content: nothing, updatedAt: null }

  it("reads the API's null table as the default one, and sends the default one back as null", () => {
    const card = cardValuesOf(page, "padrao")
    expect(card).toEqual({ open: true, homeBanner: true, footerLink: false, topStrip: false, tableId: "padrao", approval: "MANUAL" })
    expect(pagePayloadOf(card, nothing, "padrao").tableId).toBeNull()
    expect(pagePayloadOf({ ...card, tableId: "revenda" }, nothing, "padrao")).toEqual({ open: true, placements: { homeBanner: true, footerLink: false, topStrip: false }, tableId: "revenda", approval: "MANUAL", content: nothing })
  })

  it("says whether visitors see it, and why not", () => {
    expect(pageStatusOf({ blockedBy: null }, ui.affiliatePage.card)).toEqual({ live: true, message: ui.affiliatePage.card.live })
    expect(pageStatusOf({ blockedBy: "LINKS_OFF" }, ui.affiliatePage.card)).toEqual({ live: false, message: ui.affiliatePage.card.blocked.LINKS_OFF })
  })

  it("puts the address at the shop's own domain once active, else under the platform and the slug", () => {
    expect(pageAddressOf({ slug: "lessari", routeWords: words, customDomain: null }, "https://beelink.com.br")).toEqual({ address: "beelink.com.br/lessari/seja-afiliado", href: "https://beelink.com.br/lessari/seja-afiliado" })
    expect(pageAddressOf({ slug: "lessari", routeWords: words, customDomain: { host: "lessari.com.br", status: "PENDING" } }, "https://beelink.com.br").address).toBe("beelink.com.br/lessari/seja-afiliado")
    expect(pageAddressOf({ slug: "lessari", routeWords: words, customDomain: { host: "lessari.com.br", status: "ACTIVE" } }, "https://beelink.com.br")).toEqual({ address: "lessari.com.br/seja-afiliado", href: "https://lessari.com.br/seja-afiliado" })
  })
})

describe("an application in words", () => {
  const application: ShopAffiliateApplication = { id: "a", name: "Ana Souza", email: "ana@exemplo.com", phone: "5511955554444", extraQuestion: null, extraAnswer: "@ana", status: "PENDING", createdAt: "2026-11-14T17:32:00.000Z", decidedAt: null, affiliate: null }
  const received = () => "14/11, 14:32"

  it("says the phone as a person writes it, and the product's question when the page asked its own", () => {
    expect(applicationViewOf(application, ui.affiliateApplications, received)).toEqual({ id: "a", name: "Ana Souza", email: "ana@exemplo.com", phone: "(11) 95555-4444", extra: { question: "Onde vai divulgar", answer: "@ana" }, received: "14/11, 14:32", status: "PENDING", outcome: null })
  })

  it("says where an approval's affiliate stands, or that the invite was cancelled", () => {
    expect(applicationViewOf({ ...application, status: "APPROVED", affiliate: { id: "x", status: "ACTIVE" } }, ui.affiliateApplications, received).outcome).toBe("Afiliado ativo")
    expect(applicationViewOf({ ...application, status: "APPROVED", affiliate: null }, ui.affiliateApplications, received).outcome).toBe("Convite cancelado")
    expect(applicationViewOf({ ...application, status: "REFUSED" }, ui.affiliateApplications, received).outcome).toBe("Recusada")
  })
})
