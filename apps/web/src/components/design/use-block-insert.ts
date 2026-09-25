"use client"

// React
import { useState } from "react"

// Types
import type { ComponentKind, Section } from "@harness-monorepo/contracts"
import type { InsertAt } from "@harness-monorepo/ui/blocks/design/band-arrangement"

// App
import { useCreateComponent, useCreateSection } from "@/services/page/page-hooks"
import { serverPlaceOf, type SectionDraft } from "./design-draft"

/**
 * What a "+" starts: the gallery opens knowing where the block goes, and choosing a kind writes it
 * there. A saved write and not a draft edit — a reload must not lose what the owner watched appear.
 */
export function useBlockInsert(
  slug: string,
  rows: readonly SectionDraft[],
  saved: readonly Section[],
  onCreated: (component: { id: string; kind: ComponentKind }) => void,
) {
  const addSection = useCreateSection(slug)
  const addToBand = useCreateComponent(slug)
  const [insertAt, setInsertAt] = useState<InsertAt | null>(null)

  // Sent where the "+" is, counted in the server's order: see `serverPlaceOf`.
  const insert = (kind: ComponentKind) => {
    if (insertAt?.level === "band") {
      const position = serverPlaceOf(rows.map((row) => row.id), saved.map((row) => row.id), insertAt.index)
      addSection.mutate(
        { component: { kind }, position },
        { onSuccess: (section) => (section.components[0] ? onCreated(section.components[0]) : undefined) },
      )
    } else if (insertAt?.level === "block") {
      const { sectionId, index } = insertAt
      const ids = (bands: readonly { id: string; components: readonly { id: string }[] }[]) =>
        bands.find((band) => band.id === sectionId)?.components.map((component) => component.id) ?? []
      const position = serverPlaceOf(ids(rows), ids(saved), index)
      addToBand.mutate({ sectionId, payload: { kind, position } }, { onSuccess: onCreated })
    }
  }

  return { insertAt, setInsertAt, insert, inserting: addSection.isPending || addToBand.isPending }
}
