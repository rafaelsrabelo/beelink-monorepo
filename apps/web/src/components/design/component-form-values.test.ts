// Libs
import { describe, expect, it } from "vitest"

// Types
import type { StoreComponent } from "@harness-monorepo/contracts"

// App
import { toForm, toPayload } from "./component-form-values"

function component(over: Partial<StoreComponent> = {}): StoreComponent {
  return {
    id: "c",
    sectionId: "band",
    kind: "BANNER",
    title: null,
    subtitle: null,
    body: null,
    span: "FULL",
    display: "GRID",
    source: null,
    sourceCategoryId: null,
    limit: null,
    items: [{ id: "s", imageUrl: "/s.jpg", target: "NONE" }],
    columns: null,
    align: null,
    visibleOn: "ALL",
    position: 0,
    isActive: true,
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
    ...over,
  }
}

describe("component-form-values — how a block sits is not Salvar's", () => {
  /**
   * The format, the columns and the alignment are the Layout tab's, held in the draft until
   * Publicar. Salvar sending them too would write a second copy over the draft's, which is how a
   * colour once sat under a stale copy until a reload.
   */
  it("sends no format, columns or alignment for any kind", () => {
    for (const kind of ["BANNER", "CATEGORIES", "PRODUCTS", "HEADING", "TEXT"] as const) {
      const payload = toPayload(toForm(component({ kind, display: "GRID", columns: 4, align: "RIGHT" })), "link")

      expect(payload, kind).not.toHaveProperty("display")
      expect(payload, kind).not.toHaveProperty("columns")
      expect(payload, kind).not.toHaveProperty("align")
    }
  })

  it("still sends a banner's pictures, and the words of every kind", () => {
    expect(toPayload({ ...toForm(component()), title: " Verão " }, "link")).toEqual({
      title: "Verão",
      subtitle: null,
      body: null,
      items: [expect.objectContaining({ id: "s", imageUrl: "/s.jpg" })],
    })
  })
})

describe("component-form-values — a showcase", () => {
  const PICK = { id: "a", productId: "0199e000-0000-7000-8000-000000000001" }
  const showcase = (over: Parameters<typeof component>[0] = {}) =>
    toForm(component({ kind: "PRODUCTS", title: null, display: "RAIL", source: "ALL", items: [], ...over }))

  it("opens on the source, the category, the pick and the limit it has", () => {
    const form = showcase({ source: "SELECTION", items: [PICK], limit: 12 })

    expect(form).toMatchObject({ source: "SELECTION", picks: [PICK], limit: "12", sourceCategoryId: "" })
    expect(showcase({ limit: null })).toMatchObject({ limit: "", source: "ALL" })
  })

  // What the source does not read stays in the form, for switching back, and never goes on the wire.
  it("sends the source with only what it reads", () => {
    const form = { ...showcase(), sourceCategoryId: "c1", picks: [PICK] }

    expect(toPayload({ ...form, source: "CATEGORY" }, "link")).toMatchObject({
      source: "CATEGORY",
      sourceCategoryId: "c1",
      items: [],
    })
    expect(toPayload({ ...form, source: "SELECTION" }, "link")).toMatchObject({
      source: "SELECTION",
      sourceCategoryId: null,
      items: [PICK],
    })
  })

  it("sends a blank limit as the default, and a typed one as a number", () => {
    expect(toPayload({ ...showcase(), limit: "" }, "link")).toMatchObject({ limit: null })
    expect(toPayload({ ...showcase(), limit: " 8 " }, "link")).toMatchObject({ limit: 8 })
  })
})

describe("component-form-values — a FAQ", () => {
  const faq = component({
    kind: "FAQ",
    display: "ACCORDION",
    items: [
      { id: "a", question: "Qual o prazo?", answer: "Três dias." },
      { id: "b", question: "Posso trocar?", answer: "Sim." },
    ],
  })

  it("opens on its questions and sends them back in the order they are in", () => {
    const value = toForm(faq)
    expect(value.faq).toEqual(faq.items)

    const moved = { ...value, faq: [value.faq[1]!, value.faq[0]!] }
    expect(toPayload(moved, "item")).toMatchObject({ items: [faq.items[1], faq.items[0]] })
  })

  it("drops a question not written yet, and trims what is sent", () => {
    const value = { ...toForm(faq), faq: [{ id: "a", question: " Qual o prazo? ", answer: " Três dias. " }, { id: "n", question: " ", answer: "" }] }

    expect(toPayload(value, "item")).toMatchObject({ items: [{ id: "a", question: "Qual o prazo?", answer: "Três dias." }] })
  })
})

describe("component-form-values — a call to action", () => {
  const cta = component({
    kind: "CALL_TO_ACTION",
    title: "Garanta o seu",
    body: "Enquanto tem estoque.",
    display: "BAND",
    items: [{ id: "btn", label: "Comprar agora", target: "PRODUCT", productId: "p1" }],
  })

  it("opens on its button's words and destination, and sends the same button back", () => {
    const value = toForm(cta)
    expect(value).toMatchObject({ buttonLabel: "Comprar agora", target: "PRODUCT", productId: "p1", body: "Enquanto tem estoque." })

    expect(toPayload(value, "btn")).toMatchObject({
      body: "Enquanto tem estoque.",
      items: [{ id: "btn", label: "Comprar agora", target: "PRODUCT", productId: "p1", categoryId: null, externalUrl: null }],
    })
  })

  it("sends no button when it leads nowhere or says nothing", () => {
    expect(toPayload({ ...toForm(cta), target: "NONE" }, "btn")).toMatchObject({ items: [] })
    expect(toPayload({ ...toForm(cta), buttonLabel: "  " }, "btn")).toMatchObject({ items: [] })
  })
})
