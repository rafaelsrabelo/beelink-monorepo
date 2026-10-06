// Libs
import { create } from "zustand"

/** Which page dialog is open over the editor: a new landing, one landing's settings, Publicar, the gallery of models, or none. */
export type DesignPageDialog = { kind: "new" } | { kind: "settings"; pageId: string } | { kind: "publish" } | { kind: "templates" } | null

interface DesignPagesState {
  dialog: DesignPageDialog
  openNew: () => void
  openSettings: (pageId: string) => void
  /** Publicar on the page being edited: its problems first, and a note. */
  openPublish: () => void
  /** The gallery of whole-page models, for the page being edited. */
  openTemplates: () => void
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
  openTemplates: () => set({ dialog: { kind: "templates" } }),
  close: () => set({ dialog: null }),
}))
