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
import { blockKeysOf } from "./design-selection"
import { withLiveEdit } from "./live-edit"

/** Memoised, so the urgent render of a keystroke skips the shop and only the deferred one draws it. */
const Pane = memo(DesignPreviewPane)

export interface LivePreviewPaneProps extends Omit<DesignPreviewPaneProps, "sections" | "nodeOf"> {
  rows: readonly SectionDraft[]
  saved: readonly Section[]
  /** The band and the block whose panel is open. An edit left behind by a panel that closed draws nothing. */
  editing: { sectionId: string; componentId: string | null } | null
}

/**
 * The preview, drawing the block and the band being edited as the owner has them now — the picture
 * the moment it lands, the title as it is written, the band's colour as it is picked — before Salvar.
 *
 * Its own component so the screen does not render on every key: this one subscribes to the edit,
 * and the structure column, the bar and their drag boards stay where they are. The deferred value
 * keeps typing quick; the shop catches up a frame behind the field.
 */
export function LivePreviewPane({ rows, saved, editing, shelves, ...pane }: LivePreviewPaneProps) {
  const edit = useDesignEdit((state) => state.edit)
  const open =
    edit && editing?.sectionId === edit.sectionId && editing.componentId === (edit.component?.id ?? null) ? edit : null
  const live = useDeferredValue(open)
  const sections = useMemo(() => previewOf(rows, withLiveEdit(saved, live), shelves), [rows, saved, live, shelves])
  // Kept across keystrokes, or the memoised shop would be drawn again on every one.
  const nodeOf = useMemo(() => blockKeysOf(rows), [rows])

  // Unsaved fields do not outlive the editor: coming back must show what is saved, not what was abandoned.
  useEffect(() => () => useDesignEdit.getState().close(), [])

  return <Pane {...pane} shelves={shelves} sections={sections} nodeOf={nodeOf} />
}
