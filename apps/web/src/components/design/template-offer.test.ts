// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PageTemplateSummary } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { PageRequestError } from "@/services/page/page-call"
import { canAsk, offeredTemplates, previewStateOf, type OfferedTemplate } from "./template-offer"

const summary = (id: string, over: Partial<PageTemplateSummary> = {}) =>
  ({ id, pageKinds: ["LANDING"], storeTypes: ["ECOMMERCE"], recommended: false, needs: [], ...over }) as PageTemplateSummary

const HOME: OfferedTemplate = { id: "ofertas", recommended: false, needsProduct: false, askable: true }
const PRODUCT: OfferedTemplate = { id: "lancamento", recommended: false, needsProduct: true, askable: true }
const CATEGORY: OfferedTemplate = { id: "colecao", recommended: false, needsProduct: false, askable: false }

const IDLE = { isPending: true, isError: false, error: null }
const refused = (code: string) => ({ isPending: false, isError: true, error: new PageRequestError(code) })

describe("offeredTemplates", () => {
  it("keeps the API's order and says what each asks for", () => {
    const offered = offeredTemplates([summary("colecao", { recommended: true, needs: ["PRODUCT"] }), summary("em-branco")], ptBR)

    expect(offered).toEqual([
      { id: "colecao", recommended: true, needsProduct: true, askable: true },
      { id: "em-branco", recommended: false, needsProduct: false, askable: true },
    ])
  })

  it("leaves out a model this build has no name for", () => {
    expect(offeredTemplates([summary("modelo-do-futuro"), summary("ofertas")], ptBR).map((template) => template.id)).toEqual(["ofertas"])
    // A name of `Object.prototype` is not a model either.
    expect(offeredTemplates([summary("toString")], ptBR)).toEqual([])
  })

  it("marks a model built around a category as one it cannot ask for", () => {
    expect(offeredTemplates([summary("colecao", { needs: ["CATEGORY"] }), summary("lancamento", { needs: ["PRODUCT", "CATEGORY"] })], ptBR)).toEqual([
      { id: "colecao", recommended: false, needsProduct: false, askable: false },
      { id: "lancamento", recommended: false, needsProduct: true, askable: false },
    ])
  })
})

describe("canAsk", () => {
  it("asks for a model that needs nothing, and for a product's only once there is a product", () => {
    expect(canAsk(HOME, null)).toBe(true)
    expect(canAsk(PRODUCT, null)).toBe(false)
    expect(canAsk(PRODUCT, "p1")).toBe(true)
    expect(canAsk(CATEGORY, "p1")).toBe(false)
  })
})

describe("previewStateOf", () => {
  it("waits for a product before anything is asked", () => {
    expect(previewStateOf(PRODUCT, null, IDLE)).toBe("needsProduct")
    expect(previewStateOf(CATEGORY, "p1", IDLE)).toBe("unavailable")
  })

  it("follows the request once it can be made", () => {
    expect(previewStateOf(HOME, null, IDLE)).toBe("loading")
    expect(previewStateOf(PRODUCT, "p1", { isPending: false, isError: false, error: null })).toBe("ready")
    expect(previewStateOf(PRODUCT, "p1", refused("PAGE_PRODUCT_INVALID"))).toBe("failed")
    expect(previewStateOf(HOME, null, { isPending: false, isError: true, error: new Error("offline") })).toBe("failed")
  })

  it("reads the API asking for a product as that, not as a failure", () => {
    expect(previewStateOf(PRODUCT, "p1", refused("PAGE_PRODUCT_REQUIRED"))).toBe("needsProduct")
  })
})
