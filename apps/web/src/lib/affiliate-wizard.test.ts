// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CommissionTable, Product, ProductCategory } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { commissionChoiceOf, commissionTreeOf, customize, draftChanged, draftOf, rate, reset } from "./affiliate-commission-draft"
import { documentPayloadOf, emptyDocument, fileRefusalOf, invitePayloadOf, personIssuesOf, reviewOf, wizardStepsOf } from "./affiliate-wizard"

const text = ptBR.affiliates
const padrao: CommissionTable = { id: "t-padrao", name: "Padrão", defaultRateBps: 1000, isDefault: true, rates: [], categoryRates: [{ categoryId: "c-whey", rateBps: 1500 }], affiliate: null, updatedAt: "2026-11-12T10:00:00.000Z" }
const categories = [{ id: "c-whey", name: "Whey Protein" }, { id: "c-crea", name: "Creatina" }] as ProductCategory[]
const products = [
  { id: "p-iso", name: "Whey Isolado 900 g", priceCents: 18_990, category: { id: "c-whey" } },
  { id: "p-crea", name: "Creatina 300 g", priceCents: 8_990, category: { id: "c-crea" } },
  { id: "p-luva", name: "Luva de treino", priceCents: 4_990, category: null },
] as Product[]
const ready = (uploadId: string) => ({ fileName: `${uploadId}.jpg`, bytes: 1000, previewUrl: null, status: "ready" as const, uploadId })
const categoryOf = (id: string) => products.find((product) => product.id === id)?.category?.id ?? null

describe("the invite's steps", () => {
  it("marks the steps before as done, the one open as current", () => {
    expect(wizardStepsOf(1, text.wizard).map((step) => step.state)).toEqual(["done", "current", "pending", "pending"])
  })

  it("asks every field of the person, the CPF's check digits included", () => {
    expect(personIssuesOf({ name: "J", email: "joao@", phone: "(11) 9999", cpf: "529.982.247-26" }, text.affiliateIssues)).toEqual({
      name: text.affiliateIssues.name,
      email: text.affiliateIssues.email,
      phone: text.affiliateIssues.phone,
      cpf: text.affiliateIssues.cpf,
    })
    expect(personIssuesOf({ name: "João", email: "joao@exemplo.com", phone: "(11) 99999-8888", cpf: "529.982.247-25" }, text.affiliateIssues)).toEqual({})
  })
})

describe("the commission it starts from", () => {
  it("stays the shared table while nothing changes, and becomes the affiliate's own on any change", () => {
    const draft = draftOf(padrao)
    expect(commissionChoiceOf(draft, padrao)).toEqual({ tableId: "t-padrao" })

    const changed = rate(customize(draft, { kind: "product", id: "p-iso" }, categoryOf), { kind: "product", id: "p-iso" }, 20)
    expect(draftChanged(changed, padrao)).toBe(true)
    expect(commissionChoiceOf(changed, padrao)).toEqual({ commission: { defaultRateBps: 1000, categoryRates: [{ categoryId: "c-whey", rateBps: 1500 }], productRates: [{ productId: "p-iso", rateBps: 2000 }] } })
    expect(commissionChoiceOf(reset(changed, { kind: "product", id: "p-iso" }), padrao)).toEqual({ tableId: "t-padrao" })
  })

  it("customizes a product from what it inherits: its category's own rate, else the base", () => {
    const draft = draftOf(padrao)
    expect(customize(draft, { kind: "product", id: "p-iso" }, categoryOf).products).toEqual({ "p-iso": 1500 })
    expect(customize(draft, { kind: "product", id: "p-crea" }, categoryOf).products).toEqual({ "p-crea": 1000 })
  })

  it("draws each row with what it pays, where from, and what the affiliate earns; gathers the products with no category", () => {
    const tree = commissionTreeOf({ categories, products, draft: draftOf(padrao), search: "", open: new Set(["c-whey"]), locale: "pt-BR", text: text.wizard.commission })

    expect(tree.map((row) => [row.name, row.own, row.percent, row.open])).toEqual([["Whey Protein", true, 15, true], ["Creatina", false, 10, false], ["Sem categoria", false, 10, false]])
    expect(tree[0]!.products[0]).toMatchObject({ inheritLabel: "Segue a categoria · 15%", percent: 15 })
    expect(tree[0]!.products[0]!.earn.replace(/\s/g, " ")).toBe("R$ 28,48")
    expect(tree[2]).toMatchObject({ customizable: false, countLabel: "1 produto" })
  })

  it("keeps on a search a category whose name hits, or the products that do, and opens them", () => {
    const tree = commissionTreeOf({ categories, products, draft: draftOf(padrao), search: "luva", open: new Set(), locale: "pt-BR", text: text.wizard.commission })
    expect(tree.map((row) => [row.name, row.open, row.products.map((product) => product.name)])).toEqual([["Sem categoria", true, ["Luva de treino"]]])
  })
})

describe("the document", () => {
  it("may wait for later, and once begun asks for every side the type has", () => {
    expect(documentPayloadOf(emptyDocument(), text.wizard.document)).toEqual({ document: null })
    expect(documentPayloadOf({ type: "RG", front: ready("u1"), back: null }, text.wizard.document)).toEqual({ refusal: text.wizard.document.incomplete })
    expect(documentPayloadOf({ type: "PASSPORT", front: ready("u1"), back: null }, text.wizard.document)).toEqual({ document: { type: "PASSPORT", frontUploadId: "u1", backUploadId: null } })
    expect(documentPayloadOf({ type: "CNH", front: ready("u1"), back: { ...ready("u2"), status: "uploading" } }, text.wizard.document)).toEqual({ refusal: text.wizard.document.stillUploading })
  })

  it("refuses in the browser what the API would: not a photo or a PDF, or past 8 MB", () => {
    expect(fileRefusalOf(new File(["x"], "a.zip", { type: "application/zip" }), text.wizard.document)).toBe(text.wizard.document.wrongType)
    expect(fileRefusalOf(new File(["x"], "a.pdf", { type: "application/pdf" }), text.wizard.document)).toBeNull()
  })
})

describe("the invite sent", () => {
  it("trims, lowers the e-mail, sends the CPF's digits, the commission, and the document only when there is one", () => {
    const person = { name: " Maria ", email: " Maria@Exemplo.com ", phone: "(85) 99999-4321", cpf: "529.982.247-25" }
    expect(invitePayloadOf({ person, commission: { tableId: "t1" }, document: null, note: "  " })).toEqual({ name: "Maria", email: "maria@exemplo.com", phone: "(85) 99999-4321", cpf: "52998224725", tableId: "t1", note: null })
  })

  it("says each step back for the review, the document's missing side included", () => {
    const view = reviewOf({ person: { name: "Maria", email: "m@x.com", phone: "(85) 99999-4321", cpf: "529.982.247-25" }, base: "10%", startName: "Padrão", rules: [], document: { type: "RG", front: ready("u1"), back: null }, text: text.wizard })
    expect(view.commissionHint).toBe("Igual à tabela Padrão")
    expect(view.documentLines).toEqual([{ label: "Frente", status: "u1.jpg" }, { label: "Verso", status: "não anexado" }])
  })
})
