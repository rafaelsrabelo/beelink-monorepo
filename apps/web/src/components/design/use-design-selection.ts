"use client"

// React
import { useState } from "react"

// UI
import { useWideEditor } from "@harness-monorepo/ui/blocks/design/design-editor-frame"
import type { InspectorTab } from "@harness-monorepo/ui/blocks/design/inspector-tabs"

// App
import type { SectionDraft } from "./design-draft"
import { targetOf, type DesignSelection } from "./design-selection"

/**
 * What the editor has chosen, the panel's tab, and the drawers the side columns become where the
 * three do not fit.
 *
 * Its own hook because the screen had reached the line limit, and the seam falls here: this knows
 * what is chosen and where its fields show, and the screen knows what is on the page.
 *
 * The tab is state and not the address: the leave guard pushes a history step at the same address,
 * and a tab in the URL would be one more thing for Voltar to walk back through.
 */
export function useDesignSelection(rows: readonly SectionDraft[]) {
  const [selection, setSelection] = useState<DesignSelection | null>(null)
  const [tab, setTab] = useState<InspectorTab>("content")
  const [editingBand, setEditingBand] = useState<string | null>(null)
  const [structureOpen, setStructureOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const wide = useWideEditor()

  /**
   * A block opens on what it says, a band on its style. Chosen again, it stays on the tab it was on.
   * Every choice shows the panel — in the right column, or in its drawer on a narrow screen; on a
   * wide one no drawer opens: it would pop up, modal, the moment the window narrowed.
   */
  const choose = (next: DesignSelection, { openDrawer = true }: { openDrawer?: boolean } = {}) => {
    if (next.level !== selection?.level || next.id !== selection.id) setTab(next.level === "band" ? "style" : "content")
    setSelection(next)
    if (wide || !openDrawer) return
    setStructureOpen(false)
    setInspectorOpen(true)
  }

  const close = () => {
    setSelection(null)
    setInspectorOpen(false)
  }

  return {
    target: targetOf(selection, rows),
    choose,
    close,
    tab,
    setTab,
    editingBand,
    setEditingBand,
    structureOpen,
    setStructureOpen,
    inspectorOpen,
    setInspectorOpen,
  }
}
