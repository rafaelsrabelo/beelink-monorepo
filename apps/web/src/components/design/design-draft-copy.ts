// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"

// App
import type { SectionDraft } from "./design-draft"

/*
  A duplicate arrives from the API hidden, so the shop does not change before Publicar. In the draft
  it is what the owner copied: the original as the draft holds it — its visibility, its blocks' order
  and layout — under the copy's ids, right after it. Publicar then sends the differences like any
  other arrangement.

  Both functions answer the same whether the draft was reseeded with the copy before they run or
  not: a copy already there is taken out and placed again.
*/

/**
 * The draft with a band's copy. The copy's blocks match the original's as the server holds them,
 * one for one in order — the API copies them in that order — which is how each finds its draft twin.
 */
export function withBandCopy(
  rows: readonly SectionDraft[],
  saved: readonly Section[],
  copy: Section,
  originalId: string,
): SectionDraft[] {
  const original = rows.find((row) => row.id === originalId)
  const held = saved.find((section) => section.id === originalId)
  if (!original || !held) return [...rows]

  const copyIdOf = new Map(held.components.map((component, index) => [component.id, copy.components[index]?.id]))
  const twin: SectionDraft = {
    id: copy.id,
    isActive: original.isActive,
    components: original.components.flatMap((component) => {
      const id = copyIdOf.get(component.id)
      return id ? [{ ...component, id }] : []
    }),
  }

  const rest = rows.filter((row) => row.id !== copy.id)
  const at = rest.findIndex((row) => row.id === originalId)
  return [...rest.slice(0, at + 1), twin, ...rest.slice(at + 1)]
}

/** The draft with a block's copy, right after the original in its band, laid out as it is. */
export function withBlockCopy(rows: readonly SectionDraft[], copy: StoreComponent, originalId: string): SectionDraft[] {
  const band = rows.find((row) => row.components.some((component) => component.id === originalId))
  const original = band?.components.find((component) => component.id === originalId)
  if (!band || !original) return [...rows]

  return rows.map((row) => {
    const rest = row.components.filter((component) => component.id !== copy.id)
    if (row.id !== band.id) return rest.length === row.components.length ? row : { ...row, components: rest }

    const at = rest.findIndex((component) => component.id === originalId)
    return { ...row, components: [...rest.slice(0, at + 1), { ...original, id: copy.id }, ...rest.slice(at + 1)] }
  })
}
