// Libs
import { create } from "zustand"

// UI
import type { BandFormValues } from "@harness-monorepo/ui/blocks/design/band-style-fields"
import type { ComponentFormValues } from "@harness-monorepo/ui/blocks/design/component-content-fields"

export interface DesignEdit {
  /** The band whose Estilo is open: the block's, or the one chosen on its own. */
  sectionId: string
  /** The band's style as the owner has it now. */
  band: BandFormValues
  /**
   * The band's style as the tab opened with it. Only what differs from it is painted and saved, so
   * a value saved elsewhere meanwhile is not painted over unless it was changed here.
   */
  bandOpened: BandFormValues
  /** The block's content as the owner has it now, or null while the band is chosen on its own. */
  component: {
    id: string
    value: ComponentFormValues
    /** The id of the kind's single item, minted once: an overlay built on every render would mint a new one each time. */
    itemId: string
  } | null
}

interface DesignEditState {
  edit: DesignEdit | null
  open: (edit: DesignEdit) => void
  /** Only the open block's: a picture landing late for fields that closed must not write into another's. */
  changeComponent: (componentId: string, value: ComponentFormValues) => void
  /** Only the open band's, for the same reason. */
  changeBand: (sectionId: string, band: BandFormValues) => void
  close: () => void
}

/**
 * The panel opened on `next`, keeping what was typed for whichever half is still the same thing: the
 * block's fields while it is the same block, the band's style while it is the same band.
 *
 * Each half by its own identity, and not the pair: a block moved beside the one above changes band
 * and is still the block being written, and a band that loses one of two blocks is still the band
 * whose colour was picked.
 */
function reopened(current: DesignEdit | null, next: DesignEdit): DesignEdit {
  if (!current) return next
  const sameBlock = current.component !== null && current.component.id === next.component?.id
  const sameBand = current.sectionId === next.sectionId

  return {
    ...next,
    ...(sameBlock ? { component: current.component } : {}),
    ...(sameBand ? { band: current.band, bandOpened: current.bandOpened } : {}),
  }
}

/**
 * The block and the band being edited, unsaved, where the preview can read them: the panel and the
 * shop window are siblings, and neither owns the other.
 *
 * Not server data — the saved page stays in TanStack Query. This is the panel as typed, the one
 * thing the preview draws over what is saved, so a picture shows the moment it lands, a title as it
 * is written and a band's colour as it is picked, while Salvar stays the one write: content saved
 * goes live to the shop at once, and a half-typed title is not something to send to customers.
 */
export const useDesignEdit = create<DesignEditState>()((set) => ({
  edit: null,
  // The same block or band opened again keeps what was typed: a narrow window's drawer mounts its
  // own copy of the panel as the wide column's unmounts, and the owner is still editing the same thing.
  open: (edit) => set((state) => ({ edit: reopened(state.edit, edit) })),
  changeComponent: (componentId, value) =>
    set((state) =>
      state.edit?.component?.id === componentId
        ? { edit: { ...state.edit, component: { ...state.edit.component, value } } }
        : state,
    ),
  changeBand: (sectionId, band) =>
    set((state) => (state.edit?.sectionId === sectionId ? { edit: { ...state.edit, band } } : state)),
  close: () => set({ edit: null }),
}))
