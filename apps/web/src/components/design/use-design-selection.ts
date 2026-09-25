"use client"

// React
import { useState } from "react"

// UI
import { useWideEditor } from "@harness-monorepo/ui/blocks/design/design-editor-frame"

/**
 * What the editor has chosen, and the drawers the side columns become where the three do not fit.
 *
 * Its own hook because the screen had reached the line limit, and the seam falls here: this knows
 * what is chosen and where its fields show, and the screen knows what is on the page.
 */
export function useDesignSelection() {
  const [editingComponent, setEditingComponent] = useState<string | null>(null)
  const [editingBand, setEditingBand] = useState<string | null>(null)
  const [structureOpen, setStructureOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const wide = useWideEditor()

  // Every choice of a block shows its fields — in the right column, or in its drawer on a narrow
  // screen. On a wide one no drawer opens: it would pop up, modal, the moment the window narrowed.
  const choose = (id: string) => {
    setEditingComponent(id)
    if (wide) return
    setStructureOpen(false)
    setInspectorOpen(true)
  }

  const close = () => {
    setEditingComponent(null)
    setInspectorOpen(false)
  }

  return {
    editingComponent,
    editingBand,
    setEditingBand,
    choose,
    close,
    structureOpen,
    setStructureOpen,
    inspectorOpen,
    setInspectorOpen,
  }
}
