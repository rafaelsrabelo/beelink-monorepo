// Libs
import { create } from "zustand"

/** The draft the editor has in hand, per shop: it edits one page at a time. */
export interface DraftCursor {
  pageId: string
  revision: number
}

interface DraftRevisionState {
  cursors: Record<string, DraftCursor>
  /** Another tab wrote to the page since this one read it: the editor has to reload. */
  stale: boolean
  /**
   * A draft read answered. Adopted when it is another page, or further on than this tab — another
   * tab wrote, and its changes came with the read; never when it is behind, which a read that
   * started before this tab's own write can be.
   */
  saw: (slug: string, cursor: DraftCursor) => void
  /** A write this tab sent at `sent` landed: the page is at `sent + 1`, the API's invariant. */
  landed: (slug: string, pageId: string, sent: number) => void
  markStale: () => void
}

/**
 * The page draft's revision, as this tab knows it — client state the write queue reads and moves on,
 * never a page's data, which is TanStack Query's. See `services/page/draft-write.ts`.
 */
export const useDraftRevision = create<DraftRevisionState>((set) => ({
  cursors: {},
  stale: false,
  saw: (slug, cursor) =>
    set((state) => {
      const current = state.cursors[slug]
      if (current && current.pageId === cursor.pageId && current.revision >= cursor.revision) return state
      return { cursors: { ...state.cursors, [slug]: cursor } }
    }),
  landed: (slug, pageId, sent) =>
    set((state) => {
      const current = state.cursors[slug]
      if (!current || current.pageId !== pageId || current.revision > sent) return state
      return { cursors: { ...state.cursors, [slug]: { pageId, revision: sent + 1 } } }
    }),
  markStale: () => set({ stale: true }),
}))
