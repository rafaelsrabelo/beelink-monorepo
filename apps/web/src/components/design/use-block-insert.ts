"use client"

// React
import { useState } from "react"

// Types
import type { ComponentKind, ComponentSpan } from "@harness-monorepo/contracts"
import type { InsertAt, JoinAbove, SpanChange } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import type { Across } from "@harness-monorepo/ui/blocks/design/block-gallery"
import { footSpanOf } from "@harness-monorepo/ui/lib/band-rows"

// App
import type { WebMessages } from "@/locales"
import { useCreateComponent, useCreateSection, useMoveComponent } from "@/services/page/page-hooks"
import { serverPlaceOf } from "./design-draft"
import { pageErrorCopy } from "./page-error-copy"
import type { useDesignDraft } from "./use-design-draft"

/** A row of banners shares its band's twelve columns evenly. */
const SPAN_OF: Record<Across, ComponentSpan> = { 1: "FULL", 2: "HALF", 3: "THIRD" }

type Bands = readonly { id: string; components: readonly { id: string }[] }[]

/**
 * What a "+" starts: the gallery opens knowing where the block goes, and choosing a kind writes it
 * there. A saved write and not a draft edit — a reload must not lose what the owner watched appear.
 *
 * The neighbours that give up room for a block beside them change slice the way the Layout tab
 * changes one: in the draft, until Publish. A dirty draft keeps its own slice for the blocks it holds, so a
 * slice changed on the server under it would be written back over at Publish.
 */
export function useBlockInsert(
  slug: string,
  draft: Pick<ReturnType<typeof useDesignDraft>, "rows" | "saved" | "patchComponent">,
  onCreated: (component: { id: string; kind: ComponentKind }) => void,
  web: WebMessages,
) {
  const { rows, saved } = draft
  const addSection = useCreateSection(slug)
  const addToBand = useCreateComponent(slug)
  const move = useMoveComponent(slug)
  const [insertAt, setInsertAt] = useState<InsertAt | null>(null)

  // Sent where the "+" is, counted in the server's order: see `serverPlaceOf`.
  const idsIn = (sectionId: string, bands: Bands) =>
    bands.find((band) => band.id === sectionId)?.components.map((component) => component.id) ?? []
  const placeIn = (sectionId: string, index: number) => serverPlaceOf(idsIn(sectionId, rows), idsIn(sectionId, saved), index)
  // Right after a block, counted in the draft: the preview's slot knows the block, not its index there.
  const placeAfter = (sectionId: string, afterId: string) => placeIn(sectionId, idsIn(sectionId, rows).indexOf(afterId) + 1)
  const giveRoom = (changes: readonly SpanChange[]) => changes.forEach(({ id, span }) => draft.patchComponent(id, { span }))
  // One failure said at a time, the last one; a new attempt clears it.
  const failed = move.error ?? addToBand.error ?? addSection.error
  const clear = () => [addSection, addToBand, move].forEach((mutation) => mutation.reset())

  // `across` is more than one only where a band is created — the gallery offers a row nowhere else.
  const insert = (kind: ComponentKind, across: Across = 1) => {
    clear()
    if (insertAt?.level === "band") {
      const position = serverPlaceOf(rows.map((row) => row.id), saved.map((row) => row.id), insertAt.index)
      addSection.mutate(
        { payload: { component: { kind, span: SPAN_OF[across] }, position }, alongside: across - 1 },
        { onSuccess: (section) => (section.components[0] ? onCreated(section.components[0]) : undefined) },
      )
    } else if (insertAt?.level === "block") {
      const { sectionId, index } = insertAt
      const components = rows.find((row) => row.id === sectionId)?.components ?? []
      // At the band's foot a block takes the room its last drawn row has left, so it lands beside and
      // not under — counted over what the grid draws, not the hidden blocks and the strip.
      const drawn = components.filter((component) => component.isActive && component.kind !== "ANNOUNCEMENT")
      const span = index >= components.length ? footSpanOf(drawn.map((component) => component.span)) : "FULL"
      addToBand.mutate({ sectionId, payload: { kind, position: placeIn(sectionId, index), span } }, { onSuccess: onCreated })
    } else if (insertAt?.level === "beside") {
      const { sectionId, afterId, span, rebalance } = insertAt
      addToBand.mutate(
        { sectionId, payload: { kind, position: placeAfter(sectionId, afterId), span } },
        {
          onSuccess: (component) => {
            giveRoom(rebalance)
            onCreated(component)
          },
        },
      )
    }
  }

  // A band's only block, up beside the band above's last: moved, not made again, so its pictures go
  // too. Its fields open after, which is where the focus goes: the button pressed left with its band.
  const joinAbove = ({ componentId, sectionId, afterId, span, rebalance }: JoinAbove) => {
    clear()
    move.mutate(
      { componentId, payload: { sectionId, position: placeAfter(sectionId, afterId), span } },
      {
        onSuccess: (sections) => {
          giveRoom(rebalance)
          const moved = sections.flatMap((section) => section.components).find((component) => component.id === componentId)
          if (moved) onCreated(moved)
        },
      },
    )
  }

  const inserting = addSection.isPending || addToBand.isPending || move.isPending

  return {
    insertAt,
    setInsertAt,
    insert,
    inserting,
    /** What the structure column takes: every "+", the move up beside the band above, and what failed. */
    panel: { onInsert: setInsertAt, onJoinAbove: joinAbove, inserting, error: failed ? (pageErrorCopy(failed, web) ?? null) : null },
    /**
     * What the gallery leaves out here besides what the page cannot hold: the strip above the header
     * is made as a band of its own, and beside a block it would take a slice of a row it never draws in.
     */
    unavailableWith: (kinds: readonly ComponentKind[]): ComponentKind[] =>
      insertAt?.level === "band" ? [...kinds] : [...kinds, "ANNOUNCEMENT"],
    /** What the preview takes: the room a row has left, as a place to add beside. */
    preview: { onInsert: setInsertAt, inserting },
  }
}
