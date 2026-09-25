// Libs
import { create } from "zustand"

// UI
import type { ComponentFormValues } from "@harness-monorepo/ui/blocks/design/component-form"

export interface DesignEdit {
  componentId: string
  /** The block's fields as the owner has them now — what the preview draws before Salvar. */
  value: ComponentFormValues
  /** The strip's link id, minted once: an overlay built on every render would mint a new one each time. */
  linkId: string
}

interface DesignEditState {
  edit: DesignEdit | null
  open: (componentId: string, value: ComponentFormValues, linkId: string) => void
  change: (value: ComponentFormValues) => void
  close: () => void
}

/**
 * The block being edited, unsaved, where the preview can read it: the fields and the shop window are
 * siblings, and neither owns the other.
 *
 * Not server data — the saved block stays in TanStack Query. This is the form as typed, the one
 * thing the preview draws over what is saved, so a picture shows the moment it lands and a title as
 * it is written, while Salvar stays the one write: content saved goes live to the shop at once, and
 * a half-typed title is not something to send to customers.
 */
export const useDesignEdit = create<DesignEditState>()((set) => ({
  edit: null,
  // The same block opened again keeps what was typed: a narrow window's drawer mounts its own copy
  // of the fields as the wide column's unmounts, and the owner is still editing the same thing.
  open: (componentId, value, linkId) =>
    set((state) => (state.edit?.componentId === componentId ? state : { edit: { componentId, value, linkId } })),
  change: (value) => set((state) => (state.edit ? { edit: { ...state.edit, value } } : state)),
  close: () => set({ edit: null }),
}))
