"use client"

// React
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react"

// Types
import type { ComponentDisplay, Section } from "@harness-monorepo/contracts"

// UI
import type { ArrangementBand } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import { layoutsOf } from "@harness-monorepo/ui/lib/section-registry"
import { DesignSelectionBar, SELECTION_BAR_SHORTCUTS } from "@harness-monorepo/ui/blocks/design/design-selection-bar"
import { singleShown } from "@harness-monorepo/ui/blocks/design/single-block-card"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { useDuplicateComponent, useDuplicateSection } from "@/services/page/page-hooks"
import { useDesignEdit } from "@/stores/design-edit"
import { displayOf } from "./component-layout"
import type { PendingDelete } from "./design-delete-confirm"
import { labelOf, type SectionDraft } from "./design-draft"
import { withBandCopy, withBlockCopy } from "./design-draft-copy"
import { focusBar, focusNode, regionOf } from "./design-focus"
import { movedBy, neighbourOf, nodesOf, targetOf, type DesignSelection, type SelectionTarget } from "./design-selection"
import { hasUnsaved } from "./live-edit"
import { pageErrorCopy } from "./page-error-copy"
import type { useDesignDraft } from "./use-design-draft"

export interface SelectionControlsInput {
  slug: string
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
  /** Where a refused copy's `errorCode` becomes a sentence. */
  web: WebMessages
}

const STEP = { ArrowUp: -1, ArrowDown: 1 } as const

/**
 * The chosen band's or block's bar in the preview, the editor's keys, and what both say aloud.
 *
 * Every action follows the target's rule (`SelectionTarget`): a block alone in its band moves, hides
 * and goes with its band, as its card in the structure does. Trocar layout is always the block's.
 * Moving, hiding and the layout are draft edits, sent by Publicar; a copy is made hidden on the server
 * and shown in the draft, so it waits for Publicar too; deleting asks first, as the bin does.
 *
 * The keys act only where the focus is on a stop (`data-design-node`): the structure's names, the
 * preview's blocks, the bar and the panel's heading. A key typed in a field reaches none of them.
 */
export function useSelectionControls(input: SelectionControlsInput) {
  const { rows, saved, bands, target, draft, choose, messages } = input
  const text = messages.design.bar
  const [status, setStatus] = useState("")
  const copyBand = useDuplicateSection(input.slug)
  const copyBlock = useDuplicateComponent(input.slug)
  const duplicating = copyBand.isPending || copyBlock.isPending
  // A stop ↑↓ chose that nothing on screen draws — a hidden block, the strip — to walk on from.
  const walked = useRef<{ from: string; to: string } | null>(null)
  // The same sentence twice is not read twice, so a repeat carries a trailing space.
  const say = (sentence: string) => setStatus((current) => (current === sentence ? `${sentence} ` : sentence))

  const nodes = nodesOf(rows)

  const factsOf = (of: SelectionTarget) => {
    const band = bands.find((row) => row.id === (of.level === "band" ? of.id : of.sectionId))
    const blockId = of.level === "block" ? of.id : of.blockId
    const block = blockId ? band?.components.find((component) => component.id === blockId) : undefined
    const held = blockId ? rows.flatMap((row) => row.components).find((component) => component.id === blockId) : undefined
    if (!band || (blockId && !block)) return null

    const options = held ? layoutsOf(held.kind) : undefined
    return {
      name: block ? labelOf(block.kind, block.title, messages) : input.bandName(band.id),
      hidden: of.level === "band" ? !(block ? singleShown(band, block) : band.isActive) : !block?.isActive,
      // The strip is one per shop; the API refuses its copy, so none is offered.
      copiable: (block ? [block] : band.components).every((component) => component.kind !== "ANNOUNCEMENT"),
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
    // Hidden, it leaves the preview and its bar with it: the focus goes to its row in the structure,
    // or, where the structure is a closed drawer, to the nearest stop the preview still draws.
    if (!facts.hidden) {
      const near = [neighbourOf(nodes, of.id, 1)?.key, neighbourOf(nodes, of.id, -1)?.key].filter((key) => key !== undefined)
      focusNode(null, [of.id, ...near])
    }
  }

  const remove = (of: SelectionTarget) => {
    const facts = factsOf(of)
    if (!facts?.deletable) return
    // A band is asked about by its own name, as its bin in the structure asks, whatever block it carries.
    input.onDelete(
      of.level === "band"
        ? { level: "band", id: of.id, name: input.bandName(of.id) }
        : { level: "component", id: of.id, name: facts.name },
    )
  }

  /** The copy lands right after, shown as the original is, and becomes the selection. */
  const duplicate = (of: SelectionTarget) => {
    const facts = factsOf(of)
    if (!facts?.copiable || duplicating) return
    // The focus follows to the copy, in the part of the editor the owner pressed in.
    const region = document.activeElement ? regionOf(document.activeElement) : null
    const done = (key: string) => {
      say(format(text.duplicated, { name: facts.name }))
      focusNode(region, key)
    }
    const refused = (error: unknown) => say(pageErrorCopy(error, input.web) ?? "")

    if (of.level === "block") {
      copyBlock.mutate(of.id, {
        onSuccess: (copy) => {
          draft.edit((current) => withBlockCopy(current, copy, of.id))
          choose({ level: "block", id: copy.id }, { openDrawer: false, takeFocus: false })
          done(copy.id)
        },
        onError: refused,
      })
      return
    }

    copyBand.mutate(of.id, {
      onSuccess: (copy) => {
        draft.edit((current) => withBandCopy(current, saved, copy, of.id))
        const twin = of.blockId ? copy.components[0] : undefined
        choose(twin ? { level: "block", id: twin.id } : { level: "band", id: copy.id }, { openDrawer: false, takeFocus: false })
        done(copy.id)
      },
      onError: refused,
    })
  }

  const setLayout = (blockId: string, display: ComponentDisplay) => {
    draft.patchComponent(blockId, { display })
    input.onLayoutTab()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.shiftKey) return
    const from = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-design-node]") : null
    const node = from ? nodes.find((stop) => stop.key === from.dataset.designNode) : undefined
    const of = node ? targetOf(node.selection, rows) : null
    if (!from || !node || !of) return

    // Ctrl/⌘+D would bookmark the page: taken here, and only here, where the focus is on a stop.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault()
      return duplicate(of)
    }
    if (event.ctrlKey || event.metaKey) return

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      const step = STEP[event.key]
      if (event.altKey) {
        move(of, step)
        return focusNode(regionOf(from), node.key)
      }

      const walk = walked.current
      walked.current = null
      const origin = walk?.from === node.key ? walk.to : node.key
      const next = neighbourOf(nodes, origin, step)
      const nextTarget = next ? targetOf(next.selection, rows) : null
      if (!next || !nextTarget) return
      const open = target ? factsOf(target) : null
      if (open && hasUnsaved(useDesignEdit.getState().edit, saved)) return say(format(text.unsaved, { name: open.name }))

      choose(next.selection, { openDrawer: false, takeFocus: false })
      say(format(text.chosen, { name: factsOf(nextTarget)?.name ?? "" }))
      return focusNode(regionOf(from), next.key, () => (walked.current = { from: node.key, to: next.key }))
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
        onMoveUp={() => {
          move(target, -1)
          focusBar(target.id, SELECTION_BAR_SHORTCUTS.up)
        }}
        onMoveDown={() => {
          move(target, 1)
          focusBar(target.id, SELECTION_BAR_SHORTCUTS.down)
        }}
        {...(layout
          ? { layouts: layout.options, layout: layout.value, onLayout: (display: ComponentDisplay) => setLayout(layout.blockId, display) }
          : {})}
        {...(facts.copiable ? { onDuplicate: () => duplicate(target), duplicating } : {})}
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
