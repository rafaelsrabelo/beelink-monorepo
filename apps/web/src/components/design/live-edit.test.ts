// Libs
import { beforeEach, describe, expect, it } from "vitest"

// Types
import type { BannerSlide, Section, StoreComponent } from "@harness-monorepo/contracts"

// App
import { useDesignEdit, type DesignEdit } from "@/stores/design-edit"
import { toBandForm } from "./band-form-values"
import { toForm } from "./component-form-values"
import { toDraft } from "./design-draft"
import { previewOf } from "./design-draft-preview"
import { hasUnsaved, withLiveEdit } from "./live-edit"

function component(id: string, over: Partial<StoreComponent> = {}): StoreComponent {
  return {
    id,
    sectionId: "band",
    kind: "BANNER",
    title: null,
    subtitle: null,
    body: null,
    span: "HALF",
    display: "CAROUSEL",
    source: null,
    sourceCategoryId: null,
    limit: null,
    items: [],
    columns: null,
    align: null,
    visibleOn: "ALL",
    position: 0,
    isActive: true,
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:00:00.000Z",
    ...over,
  }
}

function band(id: string, components: StoreComponent[], over: Partial<Section> = {}): Section {
  return {
    id,
    name: null,
    width: "CONTAINED",
    background: null,
    position: 0,
    isActive: true,
    components,
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:00:00.000Z",
    ...over,
  }
}

const banner = component("banner")
const saved = [band("top", [banner, component("other", { kind: "HEADING", title: "Outro" })])]
const slide = { id: "s1", imageUrl: "https://cdn/nova.jpg", title: "Coleção nova", subtitle: "", target: "NONE" as const, categoryId: "", productId: "", externalUrl: "" }
const topBand = toBandForm(saved[0]!)

/** The panel open on `block`, in the band `top`, with the band's style as it opened unless told otherwise. */
function edit(block: StoreComponent | null, over: Partial<DesignEdit> = {}): DesignEdit {
  return {
    sectionId: "top",
    band: topBand,
    bandOpened: topBand,
    component: block ? { id: block.id, value: toForm(block), itemId: "l1" } : null,
    ...over,
  }
}

describe("withLiveEdit — the preview draws the panel before Salvar", () => {
  // The owner's words: "crio o banner, adiciono a imagem e já fica na preview, em tempo real".
  it("draws a picture that just landed, and the words being typed, over what is saved", () => {
    const live = edit(null, { component: { id: "banner", value: { ...toForm(banner), slides: [slide] }, itemId: "l1" } })

    const [section] = previewOf(saved.map(toDraft), withLiveEdit(saved, live), new Map())

    expect(section?.components[0]?.items).toEqual([
      { id: "s1", imageUrl: "https://cdn/nova.jpg", title: "Coleção nova", subtitle: null, href: null, external: false },
    ])
  })

  it("leaves out a slide still without its picture, as Salvar would", () => {
    const live = edit(null, { component: { id: "banner", value: { ...toForm(banner), slides: [{ ...slide, imageUrl: "" }] }, itemId: "l1" } })

    expect((withLiveEdit(saved, live)[0]?.components[0]?.items as BannerSlide[] | undefined) ?? []).toEqual([])
  })

  it("keeps the draft's layout, which the panel's Salvar does not hold, and every other block as saved", () => {
    const live = edit(null, { component: { id: "banner", value: { ...toForm(banner), title: "Novo" }, itemId: "l1" } })
    const rows = saved.map(toDraft).map((row) => ({
      ...row,
      components: row.components.map((c) => ({ ...c, span: "THIRD" as const, display: "GRID" as const })),
    }))

    const [section] = previewOf(rows, withLiveEdit(saved, live), new Map())

    expect(section?.components[0]).toMatchObject({ title: "Novo", span: "THIRD", display: "GRID" })
    expect(section?.components[1]).toMatchObject({ title: "Outro" })
  })

  // Estilo, before Salvar: the band's colour and width show as they are picked.
  it("lays the band's colour and width over the saved band", () => {
    const live = edit(banner, { band: { ...topBand, width: "FULL", background: "oklch(0.5 0.2 300)" } })

    const [section] = previewOf(saved.map(toDraft), withLiveEdit(saved, live), new Map())

    expect(section).toMatchObject({ width: "FULL", background: "oklch(0.5 0.2 300)" })
  })

  // Another tab saved the band's name while this panel was open on its colour.
  it("lays over only what Estilo changed, so a value saved meanwhile is not painted over", () => {
    const renamed = [band("top", saved[0]!.components, { name: "Destaques" })]
    const live = edit(banner, { band: { ...topBand, background: "oklch(0.3 0.1 20)" } })

    expect(withLiveEdit(renamed, live)[0]).toMatchObject({ name: "Destaques", background: "oklch(0.3 0.1 20)" })
  })

  it("draws what is saved when nothing is being edited", () => {
    expect(withLiveEdit(saved, null)).toBe(saved)
  })
})

describe("useDesignEdit", () => {
  beforeEach(() => useDesignEdit.getState().close())

  // The band's style is the band's: another block of it opens with the style as it was being picked.
  it("keeps what was typed when the same block's panel opens again, and starts afresh for another", () => {
    const { open, changeComponent, changeBand } = useDesignEdit.getState()

    open(edit(banner))
    changeComponent("banner", { ...toForm(banner), title: "Digitado" })
    changeBand("top", { ...topBand, name: "Capa" })
    open(edit(banner))
    expect(useDesignEdit.getState().edit).toMatchObject({ band: { name: "Capa" }, component: { value: { title: "Digitado" } } })

    open(edit(component("other", { kind: "HEADING" })))
    expect(useDesignEdit.getState().edit).toMatchObject({ band: { name: "Capa" }, component: { id: "other", value: { title: "" } } })
  })

  // "Pôr ao lado de…" moves a block that is being written into the band above: still the same block.
  it("keeps a block's typed fields when it moves to another band, and starts its new band afresh", () => {
    useDesignEdit.getState().open(edit(banner))
    useDesignEdit.getState().changeComponent("banner", { ...toForm(banner), title: "Digitado" })
    useDesignEdit.getState().changeBand("top", { ...topBand, name: "Capa" })

    useDesignEdit.getState().open({ ...edit(banner), sectionId: "above" })

    expect(useDesignEdit.getState().edit).toMatchObject({ sectionId: "above", band: { name: "" }, component: { value: { title: "Digitado" } } })
  })

  // A band of two, chosen by its header, loses one: still the band whose colour was picked.
  it("keeps a band's typed style when the block it carries changes", () => {
    useDesignEdit.getState().open(edit(null))
    useDesignEdit.getState().changeBand("top", { ...topBand, background: "oklch(0.5 0.2 300)" })

    useDesignEdit.getState().open(edit(banner))

    expect(useDesignEdit.getState().edit).toMatchObject({ band: { background: "oklch(0.5 0.2 300)" }, component: { id: "banner" } })
  })

  // The band chosen on its own and its block chosen after are two panels, not one.
  it("tells the band alone from a block in it", () => {
    useDesignEdit.getState().open(edit(null))
    useDesignEdit.getState().open(edit(banner))

    expect(useDesignEdit.getState().edit?.component?.id).toBe("banner")
  })

  // A picture landing late for a panel that closed must not write into the one opened since.
  it("takes a change only for the block and the band whose panel is open", () => {
    useDesignEdit.getState().open(edit(component("other", { kind: "HEADING" })))

    useDesignEdit.getState().changeComponent("banner", { ...toForm(banner), title: "Tarde demais" })
    useDesignEdit.getState().changeBand("elsewhere", { ...topBand, name: "Tarde demais" })

    expect(useDesignEdit.getState().edit).toMatchObject({ band: { name: "" }, component: { id: "other", value: { title: "" } } })
  })

  it("forgets the edit when the panel closes", () => {
    useDesignEdit.getState().open(edit(banner))
    useDesignEdit.getState().close()

    expect(useDesignEdit.getState().edit).toBeNull()
  })
})

// ↑↓ choosing another would throw away what the panel holds, so the keys ask this first.
describe("hasUnsaved", () => {
  it("is false for a panel as it opened, and for none", () => {
    expect(hasUnsaved(edit(banner), saved)).toBe(false)
    expect(hasUnsaved(edit(null), saved)).toBe(false)
    expect(hasUnsaved(null, saved)).toBe(false)
  })

  it("is true once a word is typed or a picture lands, before Salvar", () => {
    expect(hasUnsaved(edit(null, { component: { id: "banner", value: { ...toForm(banner), title: "Novo" }, itemId: "l1" } }), saved)).toBe(true)
    expect(hasUnsaved(edit(null, { component: { id: "banner", value: { ...toForm(banner), slides: [slide] }, itemId: "l1" } }), saved)).toBe(true)
  })

  it("is true once the band's style changed", () => {
    expect(hasUnsaved(edit(null, { band: { ...topBand, name: "Capa" } }), saved)).toBe(true)
  })
})
