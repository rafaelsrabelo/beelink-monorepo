// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"

// App
import {
  applyComponentOrder,
  applyOrder,
  changeCountOf,
  changesOf,
  labelOf,
  reconcile,
  orderedIdsOf,
  serverPlaceOf,
  takenKindsOf,
  toDraft,
  type SectionDraft,
} from "./design-draft"
import { arrangementOf, previewOf, shelvesOf, type Shelves } from "./design-draft-preview"
import { isEmptyComponent } from "../storefront/empty-component"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

const NO_SHELVES: Shelves = new Map()

function component(id: string, over: Partial<StoreComponent> = {}): StoreComponent {
  return {
    id,
    sectionId: "band",
    kind: "HEADING",
    title: id,
    subtitle: null,
    body: null,
    span: "FULL",
    display: null,
    source: null,
    sourceCategoryId: null,
    limit: null,
    items: [],
    columns: null,
    align: null,
    position: 0,
    isActive: true,
    createdAt: "2026-09-23T00:00:00.000Z",
    updatedAt: "2026-09-23T00:00:00.000Z",
    ...over,
  }
}

function section(id: string, components: StoreComponent[], over: Partial<Section> = {}): Section {
  return {
    id,
    name: null,
    width: "CONTAINED",
    background: null,
    position: 0,
    isActive: true,
    components: components.map((row) => ({ ...row, sectionId: id })),
    createdAt: "2026-09-23T00:00:00.000Z",
    updatedAt: "2026-09-23T00:00:00.000Z",
    ...over,
  }
}

const saved: Section[] = [
  section("a", [component("a1", { kind: "BANNER", items: [{ id: "s", imageUrl: "/s.jpg", target: "NONE" }] })], {
    width: "FULL",
  }),
  section("b", [component("b1"), component("b2", { kind: "PRODUCTS", title: null })]),
  section("c", [component("c1", { kind: "BENEFITS" })]),
]

const draft: SectionDraft[] = saved.map(toDraft)

describe("the draft holds two levels", () => {
  it("orders bands, and orders inside one band without touching the others", () => {
    expect(orderedIdsOf(applyOrder(draft, ["c", "a", "b"]))).toEqual(["c", "a", "b"])

    const inner = applyComponentOrder(draft, "b", ["b2", "b1"])
    expect(inner[1]!.components.map((row) => row.id)).toEqual(["b2", "b1"])
    expect(inner[0]!.components.map((row) => row.id)).toEqual(["a1"])
  })

  it("drops an id the draft does not have rather than inventing a row", () => {
    expect(orderedIdsOf(applyOrder(draft, ["a", "ghost", "b", "c"]))).toEqual(["a", "b", "c"])
  })
})

describe("changesOf — only what moved is written", () => {
  it("reports nothing on an untouched draft", () => {
    const changes = changesOf(draft, saved)

    expect(changes.orderChanged).toBe(false)
    expect(changes.sections).toEqual([])
    expect(changes.componentOrders).toEqual([])
    expect(changes.components).toEqual([])
  })

  it("reports a band's visibility apart from its components", () => {
    const next = draft.map((row) => (row.id === "c" ? { ...row, isActive: false } : row))

    const changes = changesOf(next, saved)

    expect(changes.sections.map((row) => row.id)).toEqual(["c"])
    expect(changes.components).toEqual([])
  })

  it("reports a component's visibility without reporting its band", () => {
    const next = draft.map((row) =>
      row.id === "b"
        ? { ...row, components: row.components.map((c) => (c.id === "b1" ? { ...c, isActive: false } : c)) }
        : row,
    )

    const changes = changesOf(next, saved)

    expect(changes.components.map((row) => row.id)).toEqual(["b1"])
    expect(changes.sections).toEqual([])
  })

  /**
   * The panel's size control writes the draft, and publishing is what reaches the server. A width
   * that changed has to be one of the writes, and it has to leave as `span` — the band reads nothing
   * else.
   */
  it("reports a component whose width changed", () => {
    const next = draft.map((row) =>
      row.id === "a" ? { ...row, components: row.components.map((c) => ({ ...c, span: "HALF" as const })) } : row,
    )

    const changes = changesOf(next, saved)

    expect(changes.components).toEqual([expect.objectContaining({ id: "a1", span: "HALF" })])
  })

  it("reports the inner order only for the band whose order changed", () => {
    const changes = changesOf(applyComponentOrder(draft, "b", ["b2", "b1"]), saved)

    expect(changes.componentOrders).toEqual([{ sectionId: "b", ids: ["b2", "b1"] }])
    expect(changes.orderChanged).toBe(false)
  })
})

describe("changeCountOf — the bar's \"N alterações\"", () => {
  it("counts nothing on an untouched draft", () => {
    expect(changeCountOf(changesOf(draft, saved))).toBe(0)
  })

  it("counts the order of the bands once, however many moved, and each other change by its row", () => {
    const moved = applyOrder(draft, ["c", "b", "a"]).map((row) => (row.id === "c" ? { ...row, isActive: false } : row))
    const next = applyComponentOrder(moved, "b", ["b2", "b1"]).map((row) =>
      row.id === "a" ? { ...row, components: row.components.map((c) => ({ ...c, span: "HALF" as const })) } : row,
    )

    // The order, band c hidden, band b's inner order and block a1's width: four writes.
    expect(changeCountOf(changesOf(next, saved))).toBe(4)
  })
})

describe("previewOf — what the shop window would be served", () => {
  // The owner has to see a width before publishing it, so the preview's span is the draft's.
  it("draws the width the draft holds, not the one saved", () => {
    const next = draft.map((row) =>
      row.id === "a" ? { ...row, components: row.components.map((c) => ({ ...c, span: "THIRD" as const })) } : row,
    )

    const [band] = previewOf(next, saved, NO_SHELVES)

    expect(band!.components[0]).toMatchObject({ id: "a1", span: "THIRD" })
  })

  it("drops hidden bands and hidden components, keeping the rest in order", () => {
    const next = draft.map((row) =>
      row.id === "b"
        ? { ...row, components: row.components.map((c) => (c.id === "b1" ? { ...c, isActive: false } : c)) }
        : row.id === "c"
          ? { ...row, isActive: false }
          : row,
    )

    const preview = previewOf(next, saved, NO_SHELVES)

    expect(preview.map((row) => row.id)).toEqual(["a", "b"])
    expect(preview[1]!.components.map((row) => row.id)).toEqual(["b2"])
  })

  it("serves a banner's slides with no address, because nothing in the preview navigates", () => {
    const preview = previewOf(draft, saved, NO_SHELVES)

    expect(preview[0]!.components[0]!.items).toEqual([
      { id: "s", imageUrl: "/s.jpg", title: null, subtitle: null, href: null, external: false },
    ])
  })

  it("carries the band's width and colour, which are what the band is", () => {
    const preview = previewOf(draft, saved, NO_SHELVES)

    expect(preview[0]).toMatchObject({ width: "FULL", background: null })
  })

  /**
   * Pinned from a live session: a band saved navy in its sheet kept drawing white in the preview,
   * because the draft held a copy of the colour and is re-seeded only when a row arrives or
   * leaves. What a sheet saves is read from the server on every render, never from the draft.
   */
  it("reads a band's colour and a component's words from the server, never from the draft", () => {
    const later = saved.map((row) =>
      row.id === "c"
        ? section("c", [component("c1", { kind: "BENEFITS", title: "Por que comprar aqui" })], {
            background: "navy",
          })
        : row,
    )

    const preview = previewOf(draft, later, NO_SHELVES)

    expect(preview[2]).toMatchObject({ background: "navy" })
    expect(preview[2]!.components[0]).toMatchObject({ title: "Por que comprar aqui" })
    expect(arrangementOf(draft, later, NO_SHELVES)[2]).toMatchObject({ background: "navy" })
  })
})

describe("shelvesOf — each showcase's cards, from the shop as served", () => {
  const card = {
    id: "p",
    slug: "blusa",
    name: "Blusa",
    priceCents: 100,
    compareAtPriceCents: null,
    imageUrl: null,
    categorySlug: null,
    priceRange: { minCents: 100, maxCents: 100 },
  }

  it("draws a showcase with the cards and the category the public read resolved", () => {
    const shelves = shelvesOf([
      {
        id: "b",
        name: null,
        width: "CONTAINED",
        background: null,
        components: [
          {
            id: "b2",
            kind: "PRODUCTS",
            title: null,
            subtitle: null,
            body: null,
            span: "FULL",
            display: "RAIL",
            source: "CATEGORY",
            sourceCategory: { slug: "blusas", name: "Blusas", description: null },
            items: [card],
            columns: null,
            align: null,
          },
        ],
      },
    ])

    expect(previewOf(draft, saved, shelves)[1]!.components[1]).toMatchObject({
      items: [card],
      sourceCategory: { slug: "blusas", name: "Blusas", description: null },
    })
    // Listed by its category, the way the page heads it, rather than as one more "Vitrine de produtos".
    expect(arrangementOf(draft, saved, shelves)[1]!.components[1]).toMatchObject({ empty: false, title: "Blusas" })
  })

  /** Only a resolved shelf can say a showcase is empty: its saved items are a pick, not cards. */
  it("calls a showcase empty when the public read resolved it to nothing, and not when it was not served", () => {
    const empty: Shelves = new Map([["b2", { items: [], sourceCategory: null }]])

    expect(arrangementOf(draft, saved, empty)[1]!.components[1]).toMatchObject({ empty: true })
    expect(arrangementOf(draft, saved, NO_SHELVES)[1]!.components[1]).toMatchObject({ empty: false })
  })

  it("reads no shelf from a cached shop with no sections", () => {
    expect(shelvesOf(undefined).size).toBe(0)
  })
})

describe("arrangementOf — a categories block with none to show", () => {
  // Four categories and no product in any: the shop window draws nothing, and the panel says so.
  it("calls a categories block empty when the shop window shows no category", () => {
    const rows = [section("x", [component("x1", { kind: "CATEGORIES" })])]

    expect(arrangementOf(rows.map(toDraft), rows, NO_SHELVES, 0)[0]!.components[0]).toMatchObject({ empty: true })
    expect(arrangementOf(rows.map(toDraft), rows, NO_SHELVES, 3)[0]!.components[0]).toMatchObject({ empty: false })
  })
})

describe("arrangementOf — what the panel lists", () => {
  // The card says the band's width beside the block's, and it has to be the band's as saved.
  it("carries each band's width, for the card to say beside the block's", () => {
    const bands = arrangementOf(draft, saved, NO_SHELVES)

    expect(bands.map((band) => band.width)).toEqual(["FULL", "CONTAINED", "CONTAINED"])
  })

  it("shows a banner's first picture and says which components are empty", () => {
    const bands = arrangementOf(draft, saved, NO_SHELVES)

    expect(bands[0]!.components[0]).toMatchObject({ imageUrl: "/s.jpg", empty: false })
    expect(bands[2]!.components[0]).toMatchObject({ kind: "BENEFITS", empty: true })
  })

  /**
   * The shop's last product list cannot go; a duplicate can. Decided here, from the count, and
   * not in the row from the kind — that rule left a shop with two shelves and no bin on either.
   */
  it("lets every row go but the shop's last product list", () => {
    const bands = arrangementOf(draft, saved, NO_SHELVES)
    expect(bands[1]!.components.map((row) => row.deletable)).toEqual([true, false])

    const twice = [...saved, section("d", [component("d1", { kind: "PRODUCTS" })])]
    expect(arrangementOf(twice.map(toDraft), twice, NO_SHELVES)[1]!.components[1]).toMatchObject({ deletable: true })
  })
})

describe("isEmptyComponent — what draws nothing", () => {
  it("mirrors each renderer's own `return null`", () => {
    expect(isEmptyComponent({ kind: "BANNER", title: null, subtitle: null, body: null, items: [] })).toBe(true)
    expect(isEmptyComponent({ kind: "BENEFITS", title: null, subtitle: null, body: null, items: [] })).toBe(true)
    expect(isEmptyComponent({ kind: "HEADING", title: "  ", subtitle: null, body: null, items: [] })).toBe(true)
    // `StorefrontHeading` draws a line under a title that is not there.
    expect(isEmptyComponent({ kind: "HEADING", title: null, subtitle: "Do pedido à entrega", body: null, items: [] })).toBe(false)
    expect(isEmptyComponent({ kind: "TEXT", title: null, subtitle: null, body: "", items: [] })).toBe(true)
    expect(isEmptyComponent({ kind: "TEXT", title: null, subtitle: null, body: "Olá", items: [] })).toBe(false)
    expect(isEmptyComponent({ kind: "PRODUCTS", title: null, subtitle: null, body: null, items: [] })).toBe(true)
    expect(isEmptyComponent({ kind: "PRODUCTS", title: null, subtitle: null, body: null, items: [{ id: "p" }] })).toBe(false)
  })
})

describe("labelOf", () => {
  it("calls an untitled component by its kind", () => {
    expect(labelOf("HEADING", null, ptBR)).toBe("Título")
    expect(labelOf("HEADING", "Novidades", ptBR)).toBe("Novidades")
  })
})

describe("reconcile — the server changes, the arrangement survives", () => {
  // A new band lands right after the one it follows on the server, in the order the owner arranged.
  it("keeps the arranged order and places what the server grew after its neighbour there", () => {
    const arranged = applyOrder(draft, ["c", "b", "a"])
    const grown = [...saved, section("d", [component("d1")])]

    expect(orderedIdsOf(reconcile(arranged, grown))).toEqual(["c", "d", "b", "a"])
  })

  // The "+" between a and b asked the API for the second place; the draft shows it there too.
  it("places a band added in the middle where it was added", () => {
    const between = [saved[0]!, section("x", [component("x1")]), ...saved.slice(1)]

    expect(orderedIdsOf(reconcile(draft, between))).toEqual(["a", "x", "b", "c"])
    expect(orderedIdsOf(reconcile(draft, [section("x", [component("x1")]), ...saved]))).toEqual(["x", "a", "b", "c"])
  })

  it("drops a band the server no longer has", () => {
    expect(orderedIdsOf(reconcile(draft, saved.slice(1)))).toEqual(["b", "c"])
  })

  it("does the same one level down: a new component lands after its neighbour, a deleted one goes", () => {
    const arranged = applyComponentOrder(draft, "b", ["b2", "b1"])
    const changed = saved.map((row) =>
      row.id === "b" ? section("b", [component("b2", { kind: "PRODUCTS" }), component("b3")]) : row,
    )

    const next = reconcile(arranged, changed)

    expect(next[1]!.components.map((row) => row.id)).toEqual(["b2", "b3"])
  })

  // The block half of the "+": the draft moved b2 above b1, and a block added first on the server
  // lands first in the draft too — not appended after the owner's order.
  it("places a block added inside a rearranged band where its + was", () => {
    const arranged = applyComponentOrder(draft, "b", ["b2", "b1"])
    const at = serverPlaceOf(["b2", "b1"], ["b1", "b2"], 0)
    const grown = saved.map((row) =>
      row.id === "b" ? section("b", [component("x"), component("b1"), component("b2", { kind: "PRODUCTS" })]) : row,
    )

    expect(at).toBe(0)
    expect(reconcile(arranged, grown)[1]!.components.map((row) => row.id)).toEqual(["x", "b2", "b1"])
  })
})

describe("takenKindsOf — what the gallery stops offering", () => {
  // A second showcase is the point of the epic; a second strip has nowhere to go.
  it("keeps offering a showcase however many the page has, and stops at one strip", () => {
    const rows = [
      section("a", [component("a1", { kind: "PRODUCTS" }), component("a2", { kind: "ANNOUNCEMENT" })]),
    ].map(toDraft)

    expect(takenKindsOf(rows)).toEqual(["ANNOUNCEMENT"])
  })
})

describe("serverPlaceOf — where the API puts what a + adds", () => {
  it("asks for the place right after the draft row above the +, counted on the server", () => {
    // Draft rearranged c, a, b; the server still holds a, b, c.
    expect(serverPlaceOf(["c", "a", "b"], ["a", "b", "c"], 1)).toBe(3)
    expect(serverPlaceOf(["c", "a", "b"], ["a", "b", "c"], 2)).toBe(1)
    expect(serverPlaceOf(["a", "b", "c"], ["a", "b", "c"], 3)).toBe(3)
  })

  it("asks for the first place for a + above everything", () => {
    expect(serverPlaceOf(["c", "a"], ["a", "c"], 0)).toBe(0)
  })

  // The API's answer and reconcile agree: the newcomer lands after the same neighbour in the draft.
  it("lands the newcomer where the + was, once the draft is reconciled", () => {
    const arranged = applyOrder(draft, ["c", "a", "b"])
    const at = serverPlaceOf(orderedIdsOf(arranged), saved.map((row) => row.id), 2)
    const grown = [...saved.slice(0, at), section("x", [component("x1")]), ...saved.slice(at)]

    expect(orderedIdsOf(reconcile(arranged, grown))).toEqual(["c", "a", "x", "b"])
  })
})
