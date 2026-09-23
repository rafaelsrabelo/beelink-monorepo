// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"

// App
import {
  applyComponentOrder,
  applyOrder,
  changesOf,
  isEmptyComponent,
  labelOf,
  reconcile,
  orderedIdsOf,
  toDraft,
  type SectionDraft,
} from "./design-draft"
import { arrangementOf, previewOf } from "./design-draft-preview"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

function component(id: string, over: Partial<StoreComponent> = {}): StoreComponent {
  return {
    id,
    sectionId: "band",
    kind: "HEADING",
    title: id,
    subtitle: null,
    body: null,
    layout: "FULL",
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

  it("reports the inner order only for the band whose order changed", () => {
    const changes = changesOf(applyComponentOrder(draft, "b", ["b2", "b1"]), saved)

    expect(changes.componentOrders).toEqual([{ sectionId: "b", ids: ["b2", "b1"] }])
    expect(changes.orderChanged).toBe(false)
  })
})

describe("previewOf — what the shop window would be served", () => {
  it("drops hidden bands and hidden components, keeping the rest in order", () => {
    const next = draft.map((row) =>
      row.id === "b"
        ? { ...row, components: row.components.map((c) => (c.id === "b1" ? { ...c, isActive: false } : c)) }
        : row.id === "c"
          ? { ...row, isActive: false }
          : row,
    )

    const preview = previewOf(next, saved)

    expect(preview.map((row) => row.id)).toEqual(["a", "b"])
    expect(preview[1]!.components.map((row) => row.id)).toEqual(["b2"])
  })

  it("serves a banner's slides with no address, because nothing in the preview navigates", () => {
    const preview = previewOf(draft, saved)

    expect(preview[0]!.components[0]!.items).toEqual([
      { id: "s", imageUrl: "/s.jpg", title: null, subtitle: null, href: null, external: false },
    ])
  })

  it("carries the band's width and colour, which are what the band is", () => {
    const preview = previewOf(draft, saved)

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

    const preview = previewOf(draft, later)

    expect(preview[2]).toMatchObject({ background: "navy" })
    expect(preview[2]!.components[0]).toMatchObject({ title: "Por que comprar aqui" })
    expect(arrangementOf(draft, later)[2]).toMatchObject({ background: "navy" })
  })
})

describe("arrangementOf — what the panel lists", () => {
  it("shows a banner's first picture and says which components are empty", () => {
    const bands = arrangementOf(draft, saved)

    expect(bands[0]!.components[0]).toMatchObject({ imageUrl: "/s.jpg", empty: false })
    expect(bands[2]!.components[0]).toMatchObject({ kind: "BENEFITS", empty: true })
  })

  /**
   * The shop's last product list cannot go; a duplicate can. Decided here, from the count, and
   * not in the row from the kind — that rule left a shop with two shelves and no bin on either.
   */
  it("lets every row go but the shop's last product list", () => {
    const bands = arrangementOf(draft, saved)
    expect(bands[1]!.components.map((row) => row.deletable)).toEqual([true, false])

    const twice = [...saved, section("d", [component("d1", { kind: "PRODUCTS" })])]
    expect(arrangementOf(twice.map(toDraft), twice)[1]!.components[1]).toMatchObject({ deletable: true })
  })
})

describe("isEmptyComponent — what draws nothing", () => {
  it("mirrors each renderer's own `return null`", () => {
    expect(isEmptyComponent("BANNER", null, null, [])).toBe(true)
    expect(isEmptyComponent("BENEFITS", null, null, [])).toBe(true)
    expect(isEmptyComponent("HEADING", "  ", null, [])).toBe(true)
    expect(isEmptyComponent("TEXT", null, "", [])).toBe(true)
    expect(isEmptyComponent("TEXT", null, "Olá", [])).toBe(false)
    expect(isEmptyComponent("PRODUCTS", null, null, [])).toBe(false)
  })
})

describe("labelOf", () => {
  it("calls an untitled component by its kind", () => {
    expect(labelOf("HEADING", null, ptBR)).toBe("Título")
    expect(labelOf("HEADING", "Novidades", ptBR)).toBe("Novidades")
  })
})

describe("reconcile — the server changes, the arrangement survives", () => {
  it("keeps the arranged order and appends what the server grew", () => {
    const arranged = applyOrder(draft, ["c", "b", "a"])
    const grown = [...saved, section("d", [component("d1")])]

    expect(orderedIdsOf(reconcile(arranged, grown))).toEqual(["c", "b", "a", "d"])
  })

  it("drops a band the server no longer has", () => {
    expect(orderedIdsOf(reconcile(draft, saved.slice(1)))).toEqual(["b", "c"])
  })

  it("does the same one level down: a new component lands last in its band, a deleted one goes", () => {
    const arranged = applyComponentOrder(draft, "b", ["b2", "b1"])
    const changed = saved.map((row) =>
      row.id === "b" ? section("b", [component("b2", { kind: "PRODUCTS" }), component("b3")]) : row,
    )

    const next = reconcile(arranged, changed)

    expect(next[1]!.components.map((row) => row.id)).toEqual(["b2", "b3"])
  })
})
