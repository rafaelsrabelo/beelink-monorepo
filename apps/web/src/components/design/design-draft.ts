// Types
import type {
  HeroSlide,
  PublicSection,
  PublicSectionItem,
  Section,
  SectionKind,
  ShowcaseLayout,
} from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * One block as the editor holds it while the page is being arranged.
 *
 * A shape of its own and not the wire `Section`, because these are the only fields the arrangement
 * can change. A draft carrying the whole block would invite a screen to edit a title here, which
 * is the block form's job, and would make "what actually moved" impossible to answer without
 * comparing fifteen fields.
 */
export interface Draft {
  id: string
  kind: SectionKind
  /** Null on a block that draws no heading of its own. */
  title: string | null
  imageUrl: string | null
  layout: ShowcaseLayout
  isActive: boolean
}

export function toDraft(section: Section): Draft {
  return {
    id: section.id,
    kind: section.kind,
    title: section.title,
    imageUrl: section.imageUrl,
    layout: section.layout,
    isActive: section.isActive,
  }
}

/** The ids the landing page draws, in order. */
export function orderedIdsOf(rows: readonly Draft[]): string[] {
  return rows.map((row) => row.id)
}

/**
 * The draft in the order it was dropped in.
 *
 * It replaced a function that read a boolean side off where a sentinel row landed. That sentinel
 * is gone: the product rails are a row with a position like every other block, so ordering them is
 * ordering a list — which is what the whole rename was for.
 */
export function applyOrder(rows: readonly Draft[], ids: readonly string[]): Draft[] {
  return ids.map((id) => rows.find((row) => row.id === id)).filter((row) => !!row)
}

/**
 * What has to be written, comparing the draft against what the server holds.
 *
 * One patch per block whose visibility or size moved, and none for the ones that did not — a write
 * per row would touch `updatedAt` on blocks nobody edited. The order goes as the whole list or not
 * at all, because the API refuses a partial one: the rows it omits keep positions that now collide.
 */
export function changesOf(rows: readonly Draft[], saved: readonly Section[]) {
  const byId = new Map(saved.map((section) => [section.id, section]))
  const ids = rows.map((row) => row.id)

  return {
    ids,
    orderChanged: saved.some((section, at) => section.id !== ids[at]),
    changed: rows.filter((row) => {
      const was = byId.get(row.id)

      return !!was && (was.layout !== row.layout || was.isActive !== row.isActive)
    }),
  }
}

/**
 * What a block is called in the editor.
 *
 * A block the shopkeeper titled is called by that title; one they have not is called by its kind.
 * The alternative — a row reading "Sem título" — tells them which blocks are unfinished and
 * nothing about which is which, and on a page of four of them that is a list of four identical
 * rows.
 */
export function labelOf(kind: SectionKind, title: string | null, messages: UiMessages): string {
  return title?.trim() || messages.design.kinds[kind]
}

/**
 * The draft as the shop window would be served it.
 *
 * Hidden blocks are dropped here, exactly as the API drops them from `PublicStore.sections`, so
 * the preview and the live page agree about what "hidden" means without either being told twice.
 * The saved block supplies the fields the arrangement does not hold — its subtitle, its resolved
 * address and its items — because those are not what dragging changes.
 */
export function previewOf(rows: readonly Draft[], saved: readonly Section[]): PublicSection[] {
  const byId = new Map(saved.map((section) => [section.id, section]))

  return rows
    .filter((row) => row.isActive)
    .map((row) => {
      const was = byId.get(row.id)

      return {
        id: row.id,
        kind: row.kind,
        title: row.title,
        subtitle: was?.subtitle ?? null,
        imageUrl: row.imageUrl,
        layout: row.layout,
        width: was?.width ?? "FULL",
        // Resolved by the API from the slug the target has now. The draft never changes a target,
        // so the saved answer is still the right one.
        href: null,
        external: was?.target === "EXTERNAL",
        /*
          A hero's slides arrive from the panel carrying ids, and the shop window is served them
          carrying addresses. The preview builds the second shape from the first with no address
          at all, and loses nothing by it: every link in the preview is inert by construction —
          the pane renders an href-less anchor and swallows the click. The picture, the words and
          the order are what is being arranged, and all three are here.
        */
        items:
          row.kind === "HERO"
            ? ((was?.items ?? []) as HeroSlide[]).map((slide) => ({
                id: slide.id,
                imageUrl: slide.imageUrl,
                title: slide.title ?? null,
                subtitle: slide.subtitle ?? null,
                href: null,
                external: false,
              }))
            : ((was?.items ?? []) as PublicSectionItem[]),
      } satisfies PublicSection
    })
}

/**
 * Whether the shop window would draw anything at all for this block.
 *
 * The one rule that has to agree with the renderers, so it is written once here and named after
 * what it answers. Each clause mirrors a `return null` on the other side: a hero with no pictures,
 * a heading with no words, a promises band with no promises. A banner and the product rails are
 * never empty — one has a picture the form demands, and the other has whatever the shop sells.
 *
 * It exists because a silent disagreement was reported: the panel listed blocks the preview did
 * not draw, and nothing on the screen said why.
 */
export function isEmptyBlock(kind: SectionKind, title: string | null, items: readonly unknown[]): boolean {
  if (kind === "HERO" || kind === "BENEFITS") return items.length === 0
  if (kind === "TEXT" || kind === "ANNOUNCEMENT") return !title?.trim()

  return false
}

/**
 * The draft brought back in step with the server, without throwing away the arrangement.
 *
 * The draft used to be seeded only while it was clean, so a block created or deleted after the
 * owner had moved anything never reached it. Publish then sent the list it had — and the reorder
 * endpoint answers 409 to a partial one, because the rows it omits keep positions that now
 * collide. That is exactly how it was reported: nine ids for a shop with fourteen blocks, and
 * deleted blocks still listed in the panel.
 *
 * Reconciled rather than replaced, because replacing would discard an unpublished arrangement the
 * owner is in the middle of. What they arranged is an order, and an order survives a row arriving
 * or leaving: the rows they still have keep their places, the ones the server no longer has go,
 * and new ones land at the end — which is where the API puts a new block anyway.
 */
export function reconcile(draft: readonly Draft[], saved: readonly Section[]): Draft[] {
  const byId = new Map(saved.map((section) => [section.id, section]))
  const kept = draft.filter((row) => byId.has(row.id))
  const known = new Set(kept.map((row) => row.id))

  return [...kept, ...saved.filter((section) => !known.has(section.id)).map(toDraft)]
}
