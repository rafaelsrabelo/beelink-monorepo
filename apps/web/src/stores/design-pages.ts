// Libs
import { create } from "zustand"

/** Which page dialog is open over the editor: a new landing, one landing's settings, or none. */
export type DesignPageDialog = { kind: "new" } | { kind: "settings"; pageId: string } | { kind: "publish" } | null

interface DesignPagesState {
  dialog: DesignPageDialog
  openNew: () => void
  openSettings: (pageId: string) => void
  /** Publicar on the page being edited: its problems first, and a note. */
  openPublish: () => void
  close: () => void
}

/**
 * The page dialogs' open state, shared by the three places that open them — the bar's switcher, the
 * Páginas tab and its rows — and the one place that draws them. UI state, never a page's data:
 * what a page holds is TanStack Query's (`store-pages-hooks.ts`).
 */
export const useDesignPages = create<DesignPagesState>((set) => ({
  dialog: null,
  openNew: () => set({ dialog: { kind: "new" } }),
  openSettings: (pageId) => set({ dialog: { kind: "settings", pageId } }),
  openPublish: () => set({ dialog: { kind: "publish" } }),
  close: () => set({ dialog: null }),
}))
