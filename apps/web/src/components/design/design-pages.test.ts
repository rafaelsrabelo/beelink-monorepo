// Libs
import { describe, expect, it } from "vitest"

// Types
import type { StorePage } from "@harness-monorepo/contracts"

// App
import { editorHrefOf, pageRowsOf, shopHrefOf } from "./design-pages"

function page(over: Partial<StorePage>): StorePage {
  return {
    id: "p1",
    kind: "LANDING",
    slug: "ofertas",
    title: "Ofertas",
    usesChrome: true,
    inMenu: false,
    status: "DRAFT",
    seo: { title: null, description: null, imageUrl: null },
    publishedAt: null,
    createdAt: "2026-09-26T00:00:00.000Z",
    updatedAt: "2026-09-26T00:00:00.000Z",
    ...over,
  }
}

describe("design mode's page addresses", () => {
  it("opens the home at the editor's own address and a landing by its id", () => {
    expect(editorHrefOf("lessari", page({ kind: "HOME", slug: null }))).toBe("/admin/lessari/design")
    expect(editorHrefOf("lessari", page({ id: "p 1" }))).toBe("/admin/lessari/design?page=p%201")
  })

  it("links a page in the shop only once a visitor is served it", () => {
    expect(shopHrefOf("lessari", page({ kind: "HOME", slug: null, status: "PUBLISHED" }))).toBe("/lessari")
    expect(shopHrefOf("lessari", page({ status: "PUBLISHED" }))).toBe("/lessari/lp/ofertas")
    expect(shopHrefOf("lessari", page({ status: "DRAFT" }))).toBeNull()
    expect(shopHrefOf("lessari", page({ status: "ARCHIVED" }))).toBeNull()
  })

  it("titles the home in the owner's words, and says where every page lives", () => {
    const rows = pageRowsOf("lessari", [page({ kind: "HOME", slug: null, title: "Página inicial", status: "PUBLISHED" }), page({})], "Home page")

    expect(rows.map((row) => [row.title, row.address])).toEqual([
      ["Home page", "/"],
      ["Ofertas", "/lp/ofertas"],
    ])
  })
})
