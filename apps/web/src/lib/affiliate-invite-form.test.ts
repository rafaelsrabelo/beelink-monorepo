// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AffiliateInvitation } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/index"

// App
import { acceptanceFormOf, acceptancePayloadOf, inviteErrorOf, invitationViewOf, slugHintOf } from "./affiliate-invite-form"
import { affiliateDateFormatter } from "./affiliate-people"

const text = ptBR.affiliateInvite
const invitation: AffiliateInvitation = {
  store: { name: "Lessari", slug: "lessari", logoUrl: null },
  affiliate: { name: "João Silva", email: "joao@exemplo.com" },
  table: { name: "Influencers", defaultRateBps: 1500, products: [{ productId: "p1", name: "Whey", rateBps: 2500 }] },
  terms: { text: "Pago por Pix.", version: 3 },
  expiresAt: "2026-11-18T13:00:00.000Z",
  hasAccount: false,
  suggestedSlug: "joao-silva",
}

describe("the invite, in words (IMPULSEIA-104)", () => {
  it("says the rates as percentages and the last day as Brasília's", () => {
    expect(invitationViewOf(invitation, "pt-BR", affiliateDateFormatter("pt-BR"))).toEqual({
      storeName: "Lessari",
      storeLogoUrl: null,
      email: "joao@exemplo.com",
      generalRate: "15%",
      products: [{ name: "Whey", rate: "25%" }],
      termsText: "Pago por Pix.",
      expires: "18/11/2026",
    })
  })

  it("starts from the /name suggested and the name the shop invited", () => {
    expect(acceptanceFormOf(invitation)).toEqual({ slug: "joao-silva", pixKey: "", name: "João Silva", password: "", agreed: false })
    expect(acceptanceFormOf({ ...invitation, suggestedSlug: null }).slug).toBe("")
  })
})

describe("accepting", () => {
  const filled = { slug: " joao ", pixKey: "  ", name: " João ", password: "12345678", agreed: true }

  it("sends the terms version read, a blank Pix key as none, and the account's name and password only when made here", () => {
    expect(acceptancePayloadOf(filled, { signUp: false, termsVersion: 3 }, text.issues)).toEqual({ payload: { slug: "joao", pixKey: null, termsVersion: 3 } })
    expect(acceptancePayloadOf(filled, { signUp: true, termsVersion: 3 }, text.issues)).toEqual({ payload: { slug: "joao", pixKey: null, termsVersion: 3, name: "João", password: "12345678" } })
  })

  it("says what is missing, field by field, and asks no password of someone signed in", () => {
    const empty = { slug: "", pixKey: "x".repeat(141), name: "J", password: "123", agreed: false }
    expect(acceptancePayloadOf(empty, { signUp: true, termsVersion: 1 }, text.issues)).toEqual({ issues: { name: text.issues.name, password: text.issues.password, slug: text.issues.slug, pixKey: text.issues.pixKey, agreed: text.issues.terms } })
    expect(acceptancePayloadOf(empty, { signUp: false, termsVersion: 1 }, text.issues)).toEqual({ issues: { slug: text.issues.slug, pixKey: text.issues.pixKey, agreed: text.issues.terms } })
  })
})

describe("the /name's hint", () => {
  const base = { typed: "João", settled: "João", checking: false, host: "beelink.com.br", storeSlug: "lessari" }

  it("waits for the typing to settle and the answer to come", () => {
    expect(slugHintOf({ ...base, typed: "", check: undefined }, text)).toEqual({ kind: "idle" })
    expect(slugHintOf({ ...base, typed: "Joãoz", check: undefined }, text)).toEqual({ kind: "checking" })
    expect(slugHintOf({ ...base, check: undefined, checking: true }, text)).toEqual({ kind: "checking" })
  })

  it("shows the link the name makes, as the API keeps it, or why it does not serve", () => {
    expect(slugHintOf({ ...base, check: { slug: "joao", available: true, reason: null } }, text)).toEqual({ kind: "available", link: "beelink.com.br/lessari/joao" })
    expect(slugHintOf({ ...base, check: { slug: "produtos", available: false, reason: "RESERVED" } }, text)).toEqual({ kind: "unavailable", message: text.slugReasons.RESERVED })
  })

  it("reads a code it does not know as the general failure", () => {
    expect(inviteErrorOf("AFFILIATE_INVITE_EXPIRED", text.errors)).toBe(text.errors.AFFILIATE_INVITE_EXPIRED)
    expect(inviteErrorOf("SOMETHING_NEW", text.errors)).toBe(text.errors.UNKNOWN)
  })
})
