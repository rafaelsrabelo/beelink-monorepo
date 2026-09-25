"use client"

// React
import { useState, type KeyboardEvent, type ReactNode } from "react"

// Types
import type { ComponentDisplay, Section } from "@harness-monorepo/contracts"

// UI
import type { ArrangementBand } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import { DISPLAYS_OF_KIND } from "@harness-monorepo/ui/blocks/design/component-layout-fields"
import { DesignSelectionBar } from "@harness-monorepo/ui/blocks/design/design-selection-bar"
import { singleShown } from "@harness-monorepo/ui/blocks/design/single-block-card"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useDesignEdit } from "@/stores/design-edit"
import { displayOf } from "./component-layout"
import type { PendingDelete } from "./design-delete-confirm"
import { labelOf, type SectionDraft } from "./design-draft"
import { focusNode, regionOf } from "./design-focus"
import { movedBy, neighbourOf, nodesOf, targetOf, type DesignSelection, type SelectionTarget } from "./design-selection"
import { hasUnsaved } from "./live-edit"
import type { useDesignDraft } from "./use-design-draft"

export interface SelectionControlsInput {
  rows: readonly SectionDraft[]
  saved: readonly Section[]
  /** The structure's bands, which already know each name, visibility and whether it may go. */
  bands: readonly ArrangementBand[]
  target: SelectionTarget | null
  draft: Pick<ReturnType<typeof useDesignDraft>, "edit" | "patchSection" | "patchComponent">
  choose: (next: DesignSelection, options?: { openDrawer?: boolean; takeFocus?: boolean }) => void
  /** Trocar layout shows the tab the change is in. */
  onLayoutTab: () => void
  onDelete: (pending: PendingDelete) => void
  bandName: (id: string) => string
  messages: UiMessages
}

const STEP = { ArrowUp: -1, ArrowDown: 1 } as const

/**
 * The chosen band's or block's bar in the preview, the editor's keys, and what both say aloud.
 *
 * Every action follows the target's rule (`SelectionTarget`): a block alone in its band moves, hides
 * and goes with its band, as its card in the structure does. Trocar layout is always the block's.
 * Moving, hiding and the layout are draft edits, sent by Publicar; deleting asks first, as the bin does.
 *
 * The keys act only where the focus is on a stop (`data-design-node`): the structure's names, the
 * preview's blocks, the bar and the panel's heading. A key typed in a field reaches none of them.
 */
export function useSelectionControls(input: SelectionControlsInput) {
  const { rows, saved, bands, target, draft, choose, messages } = input
  const text = messages.design.bar
  const [status, setStatus] = useState("")
  // The same sentence twice is not read twice, so a repeat carries a trailing space.
  const say = (sentence: string) => setStatus((current) => (current === sentence ? `${sentence} ` : sentence))

  const factsOf = (of: SelectionTarget) => {
    const band = bands.find((row) => row.id === (of.level === "band" ? of.id : of.sectionId))
    const blockId = of.level === "block" ? of.id : of.blockId
    const block = blockId ? band?.components.find((component) => component.id === blockId) : undefined
    const held = blockId ? rows.flatMap((row) => row.components).find((component) => component.id === blockId) : undefined
    if (!band || (blockId && !block)) return null

    const options = held ? DISPLAYS_OF_KIND[held.kind] : undefined
    return {
      name: block ? labelOf(block.kind, block.title, messages) : input.bandName(band.id),
      hidden: of.level === "band" ? !(block ? singleShown(band, block) : band.isActive) : !block?.isActive,
      deletable: of.level === "band" ? band.components.every((component) => component.deletable !== false) : block?.deletable !== false,
      layout: held && options ? { blockId: held.id, options, value: displayOf(held.kind, held.display) } : null,
      band,
      block,
    }
  }

  const move = (of: SelectionTarget, step: 1 | -1) => {
    const moved = movedBy(rows, of, step)
    const facts = factsOf(of)
    if (!moved || !facts) return
    draft.edit((current) => movedBy(current, of, step)?.rows ?? current)
    say(format(text.movedTo, { name: facts.name, position: String(moved.position) }))
  }

  const toggleHidden = (of: SelectionTarget) => {
    const facts = factsOf(of)
    if (!facts) return
    if (of.level === "block") draft.patchComponent(of.id, { isActive: facts.hidden })
    else if (!facts.hidden) draft.patchSection(of.id, { isActive: false })
    else {
      // Shown again whole: the band, and the lone block in it if that was what was hidden.
      if (!facts.band.isActive) draft.patchSection(of.id, { isActive: true })
      if (facts.block && !facts.block.isActive) draft.patchComponent(facts.block.id, { isActive: true })
    }
    say(format(facts.hidden ? text.shown : text.hidden, { name: facts.name }))
    // Hidden, it leaves the preview and its bar with it: the focus goes to its row in the structure.
    if (!facts.hidden) focusNode(null, of.id)
  }

  const remove = (of: SelectionTarget) => {
    const facts = factsOf(of)
    if (!facts?.deletable) return
    input.onDelete({ level: of.level === "band" ? "band" : "component", id: of.id, name: facts.name })
  }

  const setLayout = (blockId: string, display: ComponentDisplay) => {
    draft.patchComponent(blockId, { display })
    input.onLayoutTab()
  }

  const nodes = nodesOf(rows)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.shiftKey) return
    const from = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-design-node]") : null
    const node = from ? nodes.find((stop) => stop.key === from.dataset.designNode) : undefined
    const of = node ? targetOf(node.selection, rows) : null
    if (!from || !node || !of) return

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      const step = STEP[event.key]
      if (event.altKey) {
        move(of, step)
        return focusNode(regionOf(from), node.key)
      }

      const next = neighbourOf(nodes, node.key, step)
      const nextTarget = next ? targetOf(next.selection, rows) : null
      if (!next || !nextTarget) return
      const open = target ? factsOf(target) : null
      if (open && hasUnsaved(useDesignEdit.getState().edit, saved)) return say(format(text.unsaved, { name: open.name }))

      choose(next.selection, { openDrawer: false, takeFocus: false })
      say(format(text.chosen, { name: factsOf(nextTarget)?.name ?? "" }))
      return focusNode(regionOf(from), next.key)
    }

    if ((event.key === "Delete" || event.key === "Backspace") && !event.altKey) {
      event.preventDefault()
      remove(of)
    }
  }

  let bar: ReactNode = null
  const facts = target ? factsOf(target) : null
  if (target && facts) {
    const layout = facts.layout
    bar = (
      <DesignSelectionBar
        label={facts.name}
        canMoveUp={movedBy(rows, target, -1) !== null}
        canMoveDown={movedBy(rows, target, 1) !== null}
        onMoveUp={() => move(target, -1)}
        onMoveDown={() => move(target, 1)}
        {...(layout
          ? { layouts: layout.options, layout: layout.value, onLayout: (display: ComponentDisplay) => setLayout(layout.blockId, display) }
          : {})}
        hidden={facts.hidden}
        onToggleHidden={() => toggleHidden(target)}
        {...(facts.deletable ? { onDelete: () => remove(target) } : {})}
        nodeId={target.id}
        messages={messages}
      />
    )
  }

  return { bar, onKeyDown, status }
}
