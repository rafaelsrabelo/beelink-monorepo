// Libs
import { describe, expect, it } from "vitest"

// App
import { choiceIn, withChoice, withoutChoice } from "./template-choice-address"

describe("the gallery of models in the editor's address", () => {
  it("asks for nothing in an address that does not name it", () => {
    expect(choiceIn(new URLSearchParams("page=lp-1"))).toBeNull()
    // A model alone is not the gallery asked for.
    expect(choiceIn(new URLSearchParams("template=ofertas"))).toBeNull()
  })

  it("opens the gallery with nothing chosen, or with the model and the product chosen before", () => {
    expect(choiceIn(new URLSearchParams("templates=1"))).toEqual({ templateId: null, productId: null })
    expect(choiceIn(new URLSearchParams("page=lp-1&templates=1&template=lancamento&product=p1"))).toEqual({
      templateId: "lancamento",
      productId: "p1",
    })
    expect(choiceIn(new URLSearchParams("templates=1&template=&product="))).toEqual({ templateId: null, productId: null })
  })

  it("adds the choice to an editor address and keeps what the address already said", () => {
    expect(withChoice("/admin/loja/design")).toBe("/admin/loja/design?templates=1")
    expect(withChoice("/admin/loja/design?page=lp-1", { templateId: "lancamento", productId: "p 1" })).toBe(
      "/admin/loja/design?page=lp-1&templates=1&template=lancamento&product=p+1",
    )
    expect(withChoice("http://localhost:3600/admin/loja/design?page=lp-1#topo", { templateId: "ofertas", productId: null })).toBe(
      "/admin/loja/design?page=lp-1&templates=1&template=ofertas#topo",
    )
  })

  it("replaces a choice already in the address rather than repeating it", () => {
    const first = withChoice("/admin/loja/design", { templateId: "lancamento", productId: "p1" })

    expect(withChoice(first, { templateId: "ofertas", productId: null })).toBe("/admin/loja/design?templates=1&template=ofertas")
  })

  it("takes the choice out again, and nothing else", () => {
    expect(withoutChoice("/admin/loja/design?page=lp-1&templates=1&template=lancamento&product=p1")).toBe("/admin/loja/design?page=lp-1")
    expect(withoutChoice("/admin/loja/design?templates=1")).toBe("/admin/loja/design")
    expect(withoutChoice("/admin/loja/design?page=lp-1")).toBe("/admin/loja/design?page=lp-1")
  })

  it("reads back what it wrote", () => {
    const href = withChoice("/admin/loja/design?page=lp-1", { templateId: "colecao", productId: "0199e000" })

    expect(choiceIn(new URL(href, "http://localhost").searchParams)).toEqual({ templateId: "colecao", productId: "0199e000" })
  })
})
