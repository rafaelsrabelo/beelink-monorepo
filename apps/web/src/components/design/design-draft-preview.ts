// Types
import type {
  BannerSlide,
  PublicComponent,
  PublicComponentItem,
  PublicSection,
  Section,
} from "@harness-monorepo/contracts"

// UI
import type { ArrangementBand } from "@harness-monorepo/ui/blocks/design/band-arrangement"

// App
import { isEmptyComponent } from "./design-draft"
import type { SectionDraft } from "./design-draft"

/**
 * The draft as the shop window would be served it.
 *
 * Hidden bands and hidden components are dropped here, exactly as the API drops them from
 * `PublicStore.sections`, so the preview and the live page agree about what "hidden" means without
 * either being told twice. The saved row supplies what the arrangement does not hold — a
 * subtitle, a paragraph, the items — because those are not what dragging changes.
 */
export function previewOf(rows: readonly SectionDraft[], saved: readonly Section[]): PublicSection[] {
  const savedSections = new Map(saved.map((section) => [section.id, section]))
  const savedComponents = new Map(
    saved.flatMap((section) => section.components.map((component) => [component.id, component])),
  )

  return rows
    .filter((row) => row.isActive)
    .map((row) => ({
      id: row.id,
      // The band's own attributes come from the server and never from the draft: the band's sheet
      // saves them straight there, and a copy held here would hide the save until a reload.
      width: savedSections.get(row.id)?.width ?? "CONTAINED",
      background: savedSections.get(row.id)?.background ?? null,
      components: row.components
        .filter((component) => component.isActive)
        .map((component) => {
          const was = savedComponents.get(component.id)

          return {
            id: component.id,
            kind: component.kind,
            title: was?.title ?? null,
            subtitle: was?.subtitle ?? null,
            body: was?.body ?? null,
            layout: component.layout,
            columns: was?.columns ?? null,
            align: was?.align ?? null,
            /*
              A banner's slides arrive from the panel carrying ids, and the shop window is served
              them carrying addresses. The preview builds the second shape from the first with no
              address at all, and loses nothing by it: every link in the preview is inert by
              construction — the pane renders an href-less anchor and swallows the click. The
              picture, the words and the order are what is being arranged, and all three are here.
            */
            items:
              component.kind === "BANNER"
                ? ((was?.items ?? []) as BannerSlide[]).map((slide) => ({
                    id: slide.id,
                    imageUrl: slide.imageUrl,
                    title: slide.title ?? null,
                    subtitle: slide.subtitle ?? null,
                    href: null,
                    external: false,
                  }))
                : ((was?.items ?? []) as PublicComponentItem[]),
          } satisfies PublicComponent
        }),
    }))
}

/**
 * The draft as the panel lists it: each band with its rows, and each row saying whether the shop
 * window would draw anything for it.
 *
 * The saved component supplies the picture and the items the arrangement does not hold. The
 * emptiness is computed here and not in the block, for the reason `isEmptyComponent` states: the
 * one rule that has to agree with the renderer is written once, in the app that owns both.
 */
export function arrangementOf(rows: readonly SectionDraft[], saved: readonly Section[]): ArrangementBand[] {
  const savedSections = new Map(saved.map((section) => [section.id, section]))
  const savedComponents = new Map(
    saved.flatMap((section) => section.components.map((component) => [component.id, component])),
  )
  // The shop's last product list cannot go; a duplicate can. The count is this app's to know, and
  // the row draws its bin from the answer rather than from the kind.
  const productLists = saved.flatMap((section) => section.components).filter((c) => c.kind === "PRODUCTS").length

  return rows.map((row) => ({
    id: row.id,
    background: savedSections.get(row.id)?.background ?? null,
    isActive: row.isActive,
    components: row.components.map((component) => {
      const was = savedComponents.get(component.id)
      const first = was?.kind === "BANNER" ? (was.items[0] as BannerSlide | undefined) : undefined
      const title = was?.title ?? null

      return {
        id: component.id,
        kind: component.kind,
        title,
        imageUrl: first?.imageUrl ?? null,
        layout: component.layout,
        isActive: component.isActive,
        deletable: component.kind !== "PRODUCTS" || productLists > 1,
        empty: isEmptyComponent(component.kind, title, was?.body ?? null, was?.items ?? []),
      }
    }),
  }))
}
