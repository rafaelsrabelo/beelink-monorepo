// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PageTemplateSummary } from "@harness-monorepo/contracts"

// App
import { openingOptionsOf } from "./opening-options"

const summary = (id: string, over: Partial<PageTemplateSummary> = {}) =>
  ({ id, pageKinds: ["HOME"], storeTypes: ["ECOMMERCE"], recommended: false, needs: [], ...over }) as PageTemplateSummary

describe("openingOptionsOf", () => {
  it("keeps the API's order and what it suggests", () => {
    expect(openingOptionsOf([summary("por-categorias", { recommended: true }), summary("ofertas"), summary("catalogo-enxuto")])).toEqual([
      { id: "por-categorias", recommended: true },
      { id: "ofertas", recommended: false },
      { id: "catalogo-enxuto", recommended: false },
    ])
  })

  it("leaves out a model this build cannot draw, and one that asks for what a new store does not have", () => {
    const listed = [summary("modelo-do-futuro"), summary("servicos-b2b"), summary("vitrine-com-capa", { needs: ["PRODUCT"] }), summary("ofertas")]

    expect(openingOptionsOf(listed)).toEqual([{ id: "ofertas", recommended: false }])
  })

  it("is empty for an empty catalogue", () => {
    expect(openingOptionsOf([])).toEqual([])
  })
})
