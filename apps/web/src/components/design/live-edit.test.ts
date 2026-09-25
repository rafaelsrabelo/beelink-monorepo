// Libs
import { beforeEach, describe, expect, it } from "vitest"

// Types
import type { BannerSlide, Section, StoreComponent } from "@harness-monorepo/contracts"

// App
import { useDesignEdit } from "@/stores/design-edit"
import { toForm } from "./component-form-values"
import { toDraft } from "./design-draft"
import { previewOf } from "./design-draft-preview"
import { withLiveEdit } from "./live-edit"

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

describe("withLiveEdit — the preview draws the fields before Salvar", () => {
  // The owner's words: "crio o banner, adiciono a imagem e já fica na preview, em tempo real".
  it("draws a picture that just landed, and the words being typed, over what is saved", () => {
    const value = { ...toForm(banner, null), slides: [slide] }

    const [section] = previewOf(saved.map(toDraft), withLiveEdit(saved, { componentId: "banner", value, linkId: "l1", openedBackground: "" }), new Map())

    expect(section?.components[0]?.items).toEqual([
      { id: "s1", imageUrl: "https://cdn/nova.jpg", title: "Coleção nova", subtitle: null, href: null, external: false },
    ])
  })

  it("leaves out a slide still without its picture, as Salvar would", () => {
    const value = { ...toForm(banner, null), slides: [{ ...slide, imageUrl: "" }] }

    const live = withLiveEdit(saved, { componentId: "banner", value, linkId: "l1", openedBackground: "" })

    expect((live[0]?.components[0]?.items as BannerSlide[] | undefined) ?? []).toEqual([])
  })

  it("keeps the draft's width, which the fields do not hold, and every other block as saved", () => {
    const value = { ...toForm(banner, null), title: "Novo" }
    const rows = saved.map(toDraft).map((row) => ({ ...row, components: row.components.map((c) => ({ ...c, span: "THIRD" as const })) }))

    const [section] = previewOf(rows, withLiveEdit(saved, { componentId: "banner", value, linkId: "l1", openedBackground: "" }), new Map())

    expect(section?.components[0]).toMatchObject({ title: "Novo", span: "THIRD" })
    expect(section?.components[1]).toMatchObject({ title: "Outro" })
  })

  it("paints the strip's colour on its band, where the strip reads it", () => {
    const strip = component("strip", { kind: "ANNOUNCEMENT", title: "Frete grátis" })
    const bands = [band("strip-band", [strip])]
    const value = { ...toForm(strip, null), background: "oklch(0.5 0.2 300)" }

    expect(withLiveEdit(bands, { componentId: "strip", value, linkId: "l1", openedBackground: "" })[0]?.background).toBe(
      "oklch(0.5 0.2 300)",
    )
  })

  // The band's sheet saved a colour while the strip's fields were open: the fields did not change it.
  it("leaves a band colour saved meanwhile alone when the fields did not change it", () => {
    const strip = component("strip", { kind: "ANNOUNCEMENT", title: "Frete grátis" })
    const bands = [band("strip-band", [strip], { background: "oklch(0.3 0.1 20)" })]
    const value = toForm(strip, "oklch(0.5 0.2 300)")

    const live = withLiveEdit(bands, { componentId: "strip", value, linkId: "l1", openedBackground: "oklch(0.5 0.2 300)" })

    expect(live[0]?.background).toBe("oklch(0.3 0.1 20)")
  })

  it("draws what is saved when nothing is being edited", () => {
    expect(withLiveEdit(saved, null)).toBe(saved)
  })
})

describe("useDesignEdit", () => {
  beforeEach(() => useDesignEdit.getState().close())

  it("keeps what was typed when the same block's fields open again, and starts afresh for another", () => {
    const value = toForm(banner, null)
    const { open, change } = useDesignEdit.getState()

    open("banner", value, "l1")
    change("banner", { ...value, title: "Digitado" })
    open("banner", value, "l1")
    expect(useDesignEdit.getState().edit?.value.title).toBe("Digitado")

    open("other", value, "l2")
    expect(useDesignEdit.getState().edit).toMatchObject({ componentId: "other", value: { title: "" } })
  })

  // A picture landing late for fields that closed must not write into the block opened since.
  it("takes a change only for the block whose fields are open", () => {
    const value = toForm(banner, null)
    useDesignEdit.getState().open("other", value, "l2")

    useDesignEdit.getState().change("banner", { ...value, title: "Tarde demais" })

    expect(useDesignEdit.getState().edit).toMatchObject({ componentId: "other", value: { title: "" } })
  })

  it("forgets the edit when the fields close", () => {
    useDesignEdit.getState().open("banner", toForm(banner, null), "l1")
    useDesignEdit.getState().close()

    expect(useDesignEdit.getState().edit).toBeNull()
  })
})
