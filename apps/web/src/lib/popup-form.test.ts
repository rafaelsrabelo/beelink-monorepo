// Libs
import { describe, expect, it } from "vitest"

// Types
import type { FirstPurchaseHeadline, StorePopupOverview } from "@harness-monorepo/contracts"
import type { PopupFormValues } from "@harness-monorepo/ui/lib/popup-form"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { popupAnnouncingOf, popupChoicesOf, popupDefaultsOf, popupErrorOf, popupFormOf, popupPayloadOf, previewBenefitOf, previewWordsOf } from "./popup-form"

const issues = ptBR.discounts.popup.issues
const five: FirstPurchaseHeadline = { source: "COUPON", kind: "PERCENT", percentBps: 500, amountCents: null, minSubtotalCents: 0, endsAt: null, wholeCart: true }
const fifteen: FirstPurchaseHeadline = { source: "PROMOTION", kind: "PERCENT", percentBps: 1500, amountCents: null, minSubtotalCents: 0, endsAt: null, wholeCart: true }
const settings: StorePopupOverview["settings"] = { enabled: false, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: "ON_ARRIVAL", delaySeconds: 5, benefitSource: "AUTO", benefitId: null, revision: 1, updatedAt: null }
const overview: StorePopupOverview = {
  settings,
  benefit: fifteen,
  headline: fifteen,
  options: [
    { source: "PROMOTION", id: "p1", label: "Primeira compra", benefit: fifteen },
    { source: "COUPON", id: "c1", label: "PRIMEIRA5", benefit: five },
  ],
}
const form: PopupFormValues = popupFormOf(settings)

describe("popupFormOf", () => {
  it("reads the defaults as a blank form, switched off, following the shop", () => {
    expect(form).toEqual({ enabled: false, imageUrl: "", title: "", text: "", buttonLabel: "", trigger: "ON_ARRIVAL", delay: "5", benefit: "AUTO" })
  })

  it("reads a named benefit as the select's value", () => {
    expect(popupFormOf({ ...settings, benefitSource: "COUPON", benefitId: "c1" }).benefit).toBe("COUPON:c1")
    expect(popupFormOf({ ...settings, benefitSource: "PROMOTION", benefitId: "p1" }).benefit).toBe("PROMOTION:p1")
  })
})

describe("popupPayloadOf", () => {
  const payloadOf = (patch: Partial<PopupFormValues>) => popupPayloadOf({ ...form, ...patch }, issues)

  it("sends the whole form, with nothing typed as null — the default", () => {
    expect(payloadOf({ enabled: true })).toEqual({ payload: { enabled: true, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: "ON_ARRIVAL", delaySeconds: 5, benefitSource: "AUTO", benefitId: null } })
  })

  it("trims what was typed and names the benefit chosen", () => {
    expect(payloadOf({ title: "  Ganhe {beneficio}  ", imageUrl: " https://res.cloudinary.com/demo/p.jpg ", delay: " 12 ", benefit: "COUPON:c1" })).toEqual({
      payload: { enabled: false, imageUrl: "https://res.cloudinary.com/demo/p.jpg", title: "Ganhe {beneficio}", text: null, buttonLabel: null, trigger: "ON_ARRIVAL", delaySeconds: 12, benefitSource: "COUPON", benefitId: "c1" },
    })
  })

  it("refuses a discount typed by hand, in any sentence, and says what to write instead", () => {
    expect(payloadOf({ title: "Ganhe 10% agora", text: "São R$ 15 de desconto", buttonLabel: "Quero 5%" })).toEqual({ issues: { title: issues.typedDiscount, text: issues.typedDiscount, buttonLabel: issues.typedDiscount } })
    expect(issues.typedDiscount).toContain("{beneficio}")
  })

  it("refuses a sentence past its room, counted in characters as the API counts", () => {
    expect(payloadOf({ title: "a".repeat(81) })).toEqual({ issues: { title: issues.title } })
    expect(payloadOf({ text: "a".repeat(201) })).toEqual({ issues: { text: issues.text } })
    expect(payloadOf({ buttonLabel: "a".repeat(31) })).toEqual({ issues: { buttonLabel: issues.buttonLabel } })
    // An emoji is one character, as in the column.
    expect(payloadOf({ buttonLabel: "🎁".repeat(30) })).toHaveProperty("payload")
    expect(payloadOf({ title: "a".repeat(80), text: "a".repeat(200), buttonLabel: "a".repeat(30) })).toHaveProperty("payload")
  })

  it("refuses a delay that is not a whole number from 0 to 60", () => {
    for (const delay of ["", "abc", "-1", "61", "2,5", "2.5", "100"]) expect(payloadOf({ delay })).toEqual({ issues: { delay: issues.delay } })
    expect(payloadOf({ delay: "0" })).toMatchObject({ payload: { delaySeconds: 0 } })
    expect(payloadOf({ delay: "60" })).toMatchObject({ payload: { delaySeconds: 60 } })
  })

  it("does not ask for a delay nobody reads: on leaving, one that does not hold goes as the default", () => {
    expect(payloadOf({ trigger: "ON_LEAVE", delay: "" })).toMatchObject({ payload: { trigger: "ON_LEAVE", delaySeconds: 5 } })
    expect(payloadOf({ trigger: "ON_LEAVE", delay: "20" })).toMatchObject({ payload: { delaySeconds: 20 } })
  })
})

describe("popupChoicesOf", () => {
  it("offers following the shop, then each promotion and coupon in force with its real benefit", () => {
    expect(popupChoicesOf(overview, "AUTO", "pt-BR", ptBR)).toEqual([
      { value: "AUTO", label: "Seguir o destaque de primeira compra da loja" },
      { value: "PROMOTION:p1", label: "Promoção Primeira compra: 15% de desconto" },
      { value: "COUPON:c1", label: "Cupom PRIMEIRA5: 5% de desconto" },
    ])
  })

  it("keeps a saved choice that is out of force in the list, said as what it is", () => {
    const choices = popupChoicesOf(overview, "COUPON:gone", "pt-BR", ptBR)

    expect(choices.at(-1)).toEqual({ value: "COUPON:gone", label: "O benefício escolhido não está valendo" })
    expect(choices).toHaveLength(4)
  })
})

describe("previewBenefitOf", () => {
  it("is the shop's headline when following the shop, whatever is saved", () => {
    expect(previewBenefitOf({ ...overview, headline: five }, "AUTO")).toBe(five)
    expect(previewBenefitOf({ ...overview, headline: null }, "AUTO")).toBeNull()
  })

  it("is the one named while it is in force, and nothing once it is not — never another in its place", () => {
    expect(previewBenefitOf(overview, "COUPON:c1")).toBe(five)
    expect(previewBenefitOf(overview, "PROMOTION:p1")).toBe(fifteen)
    expect(previewBenefitOf(overview, "COUPON:gone")).toBeNull()
  })
})

describe("what the preview draws", () => {
  it("is what a visitor reads: the typed sentence with the real benefit in it", () => {
    expect(previewWordsOf({ ...form, title: "Ei! {beneficio} te espera" }, five, "pt-BR", ptBR)).toMatchObject({ title: "Ei! 5% de desconto te espera", text: "Crie sua conta e o desconto é seu.", buttonLabel: "Ganhar cupom" })
  })

  it("is the plain invitation with no benefit, whatever names one", () => {
    expect(previewWordsOf({ ...form, title: "Ganhe {beneficio}" }, null, "pt-BR", ptBR)).toEqual({ title: "Crie sua conta na loja", text: "Acompanhe seus pedidos, salve favoritos e compre mais rápido.", detail: null, buttonLabel: "Criar minha conta" })
  })

  it("gives the form its placeholders: the defaults for the benefit as of now", () => {
    expect(popupDefaultsOf(fifteen, "pt-BR", ptBR)).toEqual({ title: "Ganhe 15% de desconto na primeira compra", text: "Crie sua conta e o desconto é seu.", buttonLabel: "Ganhar desconto" })
    expect(popupDefaultsOf(null, "pt-BR", ptBR).buttonLabel).toBe("Criar minha conta")
  })
})

describe("popupAnnouncingOf", () => {
  it("says the benefit, from the API's numbers", () => {
    expect(popupAnnouncingOf(form, five, "pt-BR", ptBR)).toEqual({ tone: "benefit", sentence: "O pop-up está anunciando 5% de desconto." })
  })

  it("says, with all its letters, that no discount is promised at a shop with none", () => {
    const announcing = popupAnnouncingOf(form, null, "pt-BR", ptBR)

    expect(announcing).toMatchObject({ tone: "nothing", note: null })
    expect(announcing.sentence).toBe("Sua loja não tem benefício de primeira compra valendo. O pop-up convida a criar a conta e não promete desconto nenhum.")
  })

  it("says the one chosen is out of force, rather than that the shop has none", () => {
    expect(popupAnnouncingOf({ ...form, benefit: "COUPON:gone" }, null, "pt-BR", ptBR).sentence).toMatch(/^O benefício escolhido não está valendo agora\./)
  })

  it("asks for a second look when a sentence written by hand is shown with no benefit behind it", () => {
    expect(popupAnnouncingOf({ ...form, text: "Cadastre-se e ganhe um mimo." }, null, "pt-BR", ptBR).note).toBe("Os textos que você escreveu aparecem como estão: confira se nenhum deles promete um desconto.")
    // One that names the benefit is replaced, so there is nothing to look at again.
    expect(popupAnnouncingOf({ ...form, text: "Ganhe {beneficio}." }, null, "pt-BR", ptBR).note).toBeNull()
  })
})

describe("popupErrorOf", () => {
  it("says each of the API's refusals, and the general sentence for a code it does not know", () => {
    const text = ptBR.discounts.popup.errors

    expect(popupErrorOf("POPUP_TEXT_PROMISES_NUMBER", text)).toBe(text.POPUP_TEXT_PROMISES_NUMBER)
    expect(popupErrorOf("POPUP_BENEFIT_INVALID", text)).toBe(text.POPUP_BENEFIT_INVALID)
    expect(popupErrorOf("STORE_FORBIDDEN", text)).toBe(text.UNKNOWN)
  })
})
