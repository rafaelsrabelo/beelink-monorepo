// Libs
import { create } from "zustand"

// Types
import type { GalleryTemplateId } from "@harness-monorepo/ui/blocks/design/template-gallery"

/** Which page dialog is open over the editor: a new landing, one landing's settings, Publicar, the gallery of models, or none. */
export type DesignPageDialog = { kind: "new" } | { kind: "settings"; pageId: string } | { kind: "publish" } | { kind: "templates" } | null

/** The model last written over a page's draft in this editor, for the line that says so. */
export interface AppliedTemplate {
  pageId: string
  templateId: GalleryTemplateId
}

interface DesignPagesState {
  dialog: DesignPageDialog
  applied: AppliedTemplate | null
  openNew: () => void
  openSettings: (pageId: string) => void
  /** Publicar on the page being edited: its problems first, and a note. */
  openPublish: () => void
  /** The gallery of whole-page models, for the page being edited. */
  openTemplates: () => void
  close: () => void
  /** A model landed in a page's draft: the editor says so until it is published, or told to stop. */
  noteApplied: (applied: AppliedTemplate) => void
  dismissApplied: () => void
}

/**
 * The page dialogs' open state, shared by the three places that open them — the bar's switcher, the
 * Páginas tab and its rows — and the one place that draws them; and which model was just applied,
 * which the gallery sets and the editor's notice reads. UI state, never a page's data: what a page
 * holds is TanStack Query's (`store-pages-hooks.ts`).
 */
export const useDesignPages = create<DesignPagesState>((set) => ({
  dialog: null,
  applied: null,
  openNew: () => set({ dialog: { kind: "new" } }),
  openSettings: (pageId) => set({ dialog: { kind: "settings", pageId } }),
  openPublish: () => set({ dialog: { kind: "publish" } }),
  openTemplates: () => set({ dialog: { kind: "templates" } }),
  close: () => set({ dialog: null }),
  noteApplied: (applied) => set({ applied }),
  dismissApplied: () => set({ applied: null }),
}))
