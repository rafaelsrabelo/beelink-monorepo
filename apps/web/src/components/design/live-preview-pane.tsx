"use client"

// React
import { useDeferredValue } from "react"

// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import { useDesignEdit } from "@/stores/design-edit"
import type { SectionDraft } from "./design-draft"
import { previewOf } from "./design-draft-preview"
import { DesignPreviewPane, type DesignPreviewPaneProps } from "./design-preview-pane"
import { withLiveEdit } from "./live-edit"

export interface LivePreviewPaneProps extends Omit<DesignPreviewPaneProps, "sections"> {
  rows: readonly SectionDraft[]
  saved: readonly Section[]
  /** The block whose fields are open. An edit left behind by fields that closed draws nothing. */
  editingId: string | null
}

/**
 * The preview, drawing the block being edited as the owner has it now — the picture the moment it
 * lands, the title as it is written — before Salvar.
 *
 * Its own component so the screen does not render on every key: this one subscribes to the edit,
 * and the structure column, the bar and their drag boards stay where they are. The deferred value
 * keeps typing quick; the shop catches up a frame behind the field.
 */
export function LivePreviewPane({ rows, saved, editingId, shelves, ...pane }: LivePreviewPaneProps) {
  const edit = useDesignEdit((state) => state.edit)
  const live = useDeferredValue(edit && edit.componentId === editingId ? edit : null)

  return <DesignPreviewPane {...pane} shelves={shelves} sections={previewOf(rows, withLiveEdit(saved, live), shelves)} />
}
