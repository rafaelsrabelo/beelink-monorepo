"use client"

// React
import { memo, useDeferredValue, useEffect, useMemo } from "react"

// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import { useDesignEdit } from "@/stores/design-edit"
import type { SectionDraft } from "./design-draft"
import { previewOf } from "./design-draft-preview"
import { DesignPreviewPane, type DesignPreviewPaneProps } from "./design-preview-pane"
import { withLiveEdit } from "./live-edit"

/** Memoised, so the urgent render of a keystroke skips the shop and only the deferred one draws it. */
const Pane = memo(DesignPreviewPane)

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
  const sections = useMemo(() => previewOf(rows, withLiveEdit(saved, live), shelves), [rows, saved, live, shelves])

  // Unsaved fields do not outlive the editor: coming back must show what is saved, not what was abandoned.
  useEffect(() => () => useDesignEdit.getState().close(), [])

  return <Pane {...pane} shelves={shelves} sections={sections} />
}
