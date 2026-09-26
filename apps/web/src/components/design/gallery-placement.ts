// Types
import type { Section } from "@harness-monorepo/contracts"

// UI
import type { InsertAt } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { labelOf, type ComponentDraft, type SectionDraft } from "./design-draft"
import type { Shelves } from "./design-draft-preview"

/**
 * Where a "+" puts the section, in the owner's words — "Entra entre Capa e Produtos." — for the
 * gallery to say under its title. Counted in the draft, the order the structure and the preview show.
 *
 * Named as the structure names them. Between bands, a band is its own name, else the block it holds
 * when it holds one, else its place — "entre Banner e Vitrine" says more than "entre Faixa 2 e Faixa
 * 3". Inside a band, the band is its name or its place, as its "+" is: "Entra em Banner, depois de
 * Banner" would be a block inside itself. A showcase with no title is its category, as in the list.
 */
export function placementOf(
  at: InsertAt | null,
  rows: readonly SectionDraft[],
  saved: readonly Section[],
  shelves: Shelves,
  messages: UiMessages,
): string | undefined {
  if (!at) return undefined
  const text = messages.design.gallery.placement
  const blockName = (block: ComponentDraft) => {
    const title = saved.flatMap((section) => section.components).find((was) => was.id === block.id)?.title
    return labelOf(block.kind, title ?? shelves.get(block.id)?.sourceCategory?.name ?? null, messages)
  }
  const placeName = (row: SectionDraft) =>
    bandLabelOf(saved.find((section) => section.id === row.id)?.name, rows.indexOf(row) + 1, messages)
  const bandName = (row: SectionDraft | undefined) => {
    if (!row) return undefined
    const [only, second] = row.components
    if (!saved.find((section) => section.id === row.id)?.name && only && !second) return blockName(only)
    return placeName(row)
  }

  if (at.level === "band") {
    const before = bandName(rows[at.index - 1])
    const after = bandName(rows[at.index])
    if (before && after) return format(text.between, { before, after })
    if (after) return format(text.first, { after })
    if (before) return format(text.last, { before })
    return text.only
  }

  const row = rows.find((candidate) => candidate.id === at.sectionId)
  const band = row ? placeName(row) : ""
  if (at.level === "beside") {
    const before = row?.components.find((block) => block.id === at.afterId)
    return before ? format(text.beside, { before: blockName(before) }) : undefined
  }

  const before = row?.components[at.index - 1]
  return before ? format(text.inBand, { band, before: blockName(before) }) : format(text.inBandFirst, { band })
}
