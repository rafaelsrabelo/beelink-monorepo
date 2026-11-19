// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AffiliatePageContent, PublicAffiliatePage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { applicationPayloadOf, joinBannerOf, joinBlocksFor, joinExampleOf, joinFormViewOf, joinMarksOf, joinPageViewOf, joinStripOf, recruitingOf } from "./affiliate-join"

const join = ui.affiliateJoin
const nothing: AffiliatePageContent = {
  badge: null, title: null, subtitle: null, ctaLabel: null, highlights: null, imageUrl: null, stepsTitle: null, steps: null, benefits: null, questionsTitle: null, questions: null,
  closingTitle: null, closingText: null, formTitle: null, formSubtitle: null, askExtraQuestion: true, extraQuestion: null, successMessage: null, bannerTitle: null, bannerText: null, bannerCta: null,
}
const page: PublicAffiliatePage = { content: nothing, rateBps: 1000, maxRateBps: 1000, terms: { text: null, version: 0 } }
const marks = joinMarksOf({ name: "Lessari" }, page, join, "pt-BR")

describe("the \"Seja afiliado\" page on the shop window (plan 2026-11-14)", () => {
  it("draws the product's own texts where the shop wrote none, its marks filled in", () => {
    const view = joinPageViewOf(page, join.defaults, marks)
    expect(view.title).toBe("Indique a Lessari e ganhe 10% em cada venda")
    expect(view.benefits[0]?.title).toBe("10% de comissão")
    expect(view.steps).toHaveLength(3)
  })

  // Mutante's: 10% on the table, and products of its own choosing at 30%.
  it("says \"até\" the highest rate where a product on sale earns more than the table's general one", () => {
    const upTo = joinMarksOf({ name: "Mutante" }, { rateBps: 1000, maxRateBps: 3000 }, join, "pt-BR")
    expect(upTo.rate).toBe("até 30%")
    expect(joinBannerOf({ bannerTitle: null, bannerText: null, bannerCta: null }, join.defaults, upTo).title).toBe(
      "Indique a Mutante e ganhe até 30% em cada venda",
    )
    expect(joinPageViewOf(page, join.defaults, upTo).benefits[0]?.title).toBe("até 30% de comissão")
  })

  it("draws what the shop wrote, and leaves out a list it emptied", () => {
    const view = joinPageViewOf({ ...page, content: { ...nothing, title: "Venda a {loja}", benefits: [], questions: [] } }, join.defaults, marks)
    expect(view.title).toBe("Venda a Lessari")
    expect(view.benefits).toEqual([])
    expect(view.questions).toEqual([])
  })

  it("asks the extra question only where the page asks it", () => {
    expect(joinFormViewOf(page, join, marks).extraQuestion).toBe("Onde você vai divulgar?")
    expect(joinFormViewOf({ ...page, content: { ...nothing, askExtraQuestion: false } }, join, marks).extraQuestion).toBeNull()
    expect(joinFormViewOf(page, join, marks).note).toBe("Seus dados ficam com a Lessari para analisar a candidatura. Não aparecem na loja.")
  })

  it("says what a sale earns at the announced rate, and nothing at none", () => {
    // Intl spells the real with a no-break space after its sign.
    expect(joinExampleOf(1000, join, "pt-BR")?.replace(/\u00a0/g, " ")).toBe("Uma venda de R$ 200,00 em produtos pelo seu link rende R$ 20,00 para você.")
    expect(joinExampleOf(0, join, "pt-BR")).toBeNull()
  })

  it("leads to the page from the home, the footer and the strip — never off the air, from a site or under an affiliate's name", () => {
    const affiliatePage = { placements: { footerLink: true, topStrip: true }, rateBps: 1000, maxRateBps: 1000, bannerTitle: null, bannerText: null, bannerCta: "Quero vender" }
    const store = { type: "ECOMMERCE" as const, affiliatePage }
    expect(recruitingOf(store)).toBe(affiliatePage)
    expect(recruitingOf({ ...store, affiliate: "joao" })).toBeNull()
    expect(recruitingOf({ ...store, unavailable: true })).toBeNull()
    expect(recruitingOf({ ...store, type: "INSTITUTIONAL" })).toBeNull()
    expect(recruitingOf({ ...store, affiliatePage: null })).toBeNull()

    const banner = joinBannerOf(affiliatePage, join.defaults, marks)
    expect(banner).toEqual({ title: "Indique a Lessari e ganhe 10% em cada venda", text: join.defaults.bannerText, cta: "Quero vender" })
    expect(joinStripOf(banner, "/lessari/seja-afiliado")).toEqual({ left: banner.title, right: "Quero vender", background: null, href: "/lessari/seja-afiliado", external: false })
  })

  // Plan 2026-11-19: the banner is a block, and under an affiliate's name it invites nobody.
  it("keeps a \"Programa de afiliados\" block's banner where the shop window recruits, and empties it where it does not", () => {
    const placement = { placements: { footerLink: true, topStrip: false }, rateBps: 1000, maxRateBps: 1000, bannerTitle: null, bannerText: null, bannerCta: null }
    const block = { id: "a", kind: "AFFILIATE_JOIN" as const, title: null, subtitle: null, body: null, span: "FULL" as const, display: null, source: null, sourceCategory: null, items: [placement], columns: null, align: null }
    const heading = { ...block, id: "h", kind: "HEADING" as const, title: "Oi", items: [] }
    const sections = [{ id: "s", name: null, width: "CONTAINED" as const, background: null, components: [block, heading] }]

    expect(joinBlocksFor(sections, placement)).toBe(sections)
    expect(joinBlocksFor(sections, null)?.[0]?.components).toEqual([{ ...block, items: [] }, heading])
    expect(joinBlocksFor(undefined, null)).toBeUndefined()
  })
})

describe("the application", () => {
  const typed = { name: " Ana Souza ", email: " ana@exemplo.com ", phone: "(11) 95555-4444", extraAnswer: " @ana ", accepted: true, website: "" }

  it("sends what was typed, trimmed, the answer only where the question was asked", () => {
    expect(applicationPayloadOf(typed, true, join.form.issues)).toEqual({ payload: { name: "Ana Souza", email: "ana@exemplo.com", phone: "(11) 95555-4444", extraAnswer: "@ana", accepted: true } })
    expect(applicationPayloadOf(typed, false, join.form.issues)).toMatchObject({ payload: { extraAnswer: null } })
  })

  it("carries the hidden field when a robot filled it, for the API to keep nothing", () => {
    expect(applicationPayloadOf({ ...typed, website: "spam" }, true, join.form.issues)).toMatchObject({ payload: { website: "spam" } })
  })

  it("says, field by field, what does not hold", () => {
    expect(applicationPayloadOf({ name: "A", email: "ana", phone: "1199", extraAnswer: "", accepted: false, website: "" }, true, join.form.issues)).toEqual({
      issues: { name: join.form.issues.name, email: join.form.issues.email, phone: join.form.issues.phone, accepted: join.form.issues.accepted },
    })
  })
})
