// Libs
import { create } from "zustand"

interface DraftRevisionState {
  /** The page each shop's editor has open. A write names that page's revision, and no other's. */
  editing: Record<string, string>
  /** What this tab knows of each page's revision, by page id. */
  revisions: Record<string, number>
  /** This tab's writes on their way to each page. */
  sending: Record<string, number>
  /** Another tab wrote to the page since this one read it: the editor has to reload. */
  stale: boolean
  /** The editor opened a page of a shop, and closed it. */
  open: (slug: string, pageId: string) => void
  close: (slug: string, pageId: string) => void
  /**
   * A draft read answered. The first one of a page is what this tab starts from. A later one further
   * on than this tab's own writes account for is another tab's work, which this tab has not drawn:
   * the editor has to reload rather than carry on writing over it. One that answers while this tab's
   * own write is out is ignored — it may already count that write, which has not been told yet.
   */
  saw: (pageId: string, revision: number) => void
  /** A write left for a page, and came back: landed at `sent`, the page is at `sent + 1`. */
  sent: (pageId: string) => void
  landed: (pageId: string, sent: number | undefined, advanced: boolean) => void
  markStale: () => void
}

/**
 * The page draft's revision, as this tab knows it — client state the write queue reads and moves on,
 * never a page's data, which is TanStack Query's. See `services/page/draft-write.ts`.
 */
export const useDraftRevision = create<DraftRevisionState>((set) => ({
  editing: {},
  revisions: {},
  sending: {},
  stale: false,
  open: (slug, pageId) => set((state) => ({ editing: { ...state.editing, [slug]: pageId } })),
  close: (slug, pageId) =>
    set((state) => {
      if (state.editing[slug] !== pageId) return state
      const editing = { ...state.editing }
      delete editing[slug]
      return { editing }
    }),
  saw: (pageId, revision) =>
    set((state) => {
      const known = state.revisions[pageId]
      if (known === undefined) return { revisions: { ...state.revisions, [pageId]: revision } }
      if (revision <= known || (state.sending[pageId] ?? 0) > 0) return state
      return { stale: true }
    }),
  sent: (pageId) => set((state) => ({ sending: { ...state.sending, [pageId]: (state.sending[pageId] ?? 0) + 1 } })),
  landed: (pageId, sent, advanced) =>
    set((state) => ({
      sending: { ...state.sending, [pageId]: Math.max((state.sending[pageId] ?? 1) - 1, 0) },
      ...(advanced && sent !== undefined ? { revisions: { ...state.revisions, [pageId]: sent + 1 } } : {}),
    })),
  markStale: () => set({ stale: true }),
}))
