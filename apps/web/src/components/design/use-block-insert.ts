"use client"

// React
import { useState } from "react"

// Types
import type { ComponentKind, ComponentSpan } from "@harness-monorepo/contracts"
import type { InsertAt, JoinAbove, SpanChange } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import type { Across } from "@harness-monorepo/ui/blocks/design/block-gallery"
import { footSpanOf } from "@harness-monorepo/ui/lib/band-rows"

// App
import { useCreateComponent, useCreateSection, useMoveComponent } from "@/services/page/page-hooks"
import { serverPlaceOf } from "./design-draft"
import type { useDesignDraft } from "./use-design-draft"

/** A row of banners shares its band's twelve columns evenly. */
const SPAN_OF: Record<Across, ComponentSpan> = { 1: "FULL", 2: "HALF", 3: "THIRD" }

type Bands = readonly { id: string; components: readonly { id: string }[] }[]

/**
 * What a "+" starts: the gallery opens knowing where the block goes, and choosing a kind writes it
 * there. A saved write and not a draft edit — a reload must not lose what the owner watched appear.
 *
 * The neighbours that give up room for a block beside them change slice the way a SpanField changes
 * one: in the draft, until Publish. A dirty draft keeps its own slice for the blocks it holds, so a
 * slice changed on the server under it would be written back over at Publish.
 */
export function useBlockInsert(
  slug: string,
  draft: Pick<ReturnType<typeof useDesignDraft>, "rows" | "saved" | "patchComponent">,
  onCreated: (component: { id: string; kind: ComponentKind }) => void,
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
  const giveRoom = (changes: readonly SpanChange[]) => changes.forEach(({ id, span }) => draft.patchComponent(id, { span }))

  // `across` is more than one only where a band is created — the gallery offers a row nowhere else.
  const insert = (kind: ComponentKind, across: Across = 1) => {
    if (insertAt?.level === "band") {
      const position = serverPlaceOf(rows.map((row) => row.id), saved.map((row) => row.id), insertAt.index)
      addSection.mutate(
        { payload: { component: { kind, span: SPAN_OF[across] }, position }, alongside: across - 1 },
        { onSuccess: (section) => (section.components[0] ? onCreated(section.components[0]) : undefined) },
      )
    } else if (insertAt?.level === "block") {
      const { sectionId, index } = insertAt
      const spans = rows.find((row) => row.id === sectionId)?.components.map((component) => component.span) ?? []
      // At the band's foot a block takes the room its last row has left, so it lands beside and not under.
      const span = index >= spans.length ? footSpanOf(spans) : "FULL"
      addToBand.mutate({ sectionId, payload: { kind, position: placeIn(sectionId, index), span } }, { onSuccess: onCreated })
    } else if (insertAt?.level === "beside") {
      const { sectionId, index, span, rebalance } = insertAt
      addToBand.mutate(
        { sectionId, payload: { kind, position: placeIn(sectionId, index), span } },
        {
          onSuccess: (component) => {
            giveRoom(rebalance)
            onCreated(component)
          },
        },
      )
    }
  }

  // A band's only block, up beside the band above's last: moved, not made again, so its pictures go too.
  const joinAbove = ({ componentId, sectionId, index, span, rebalance }: JoinAbove) =>
    move.mutate(
      { componentId, payload: { sectionId, position: placeIn(sectionId, index), span } },
      { onSuccess: () => giveRoom(rebalance) },
    )

  const inserting = addSection.isPending || addToBand.isPending || move.isPending

  return {
    insertAt,
    setInsertAt,
    insert,
    inserting,
    /** What the structure column takes: every "+", and the move up beside the band above. */
    panel: { onInsert: setInsertAt, onJoinAbove: joinAbove, inserting },
    /** What the preview takes: the room a row has left, as a place to add beside. */
    preview: { onInsert: setInsertAt, inserting },
  }
}
