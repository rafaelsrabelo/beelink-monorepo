// Types
import type { Section, UpdateSectionPayload } from "@harness-monorepo/contracts"

// UI
import type { BandFormValues } from "@harness-monorepo/ui/blocks/design/band-style-fields"

/** A band between the wire and its Estilo tab. The wire's nulls become the empty strings an input holds. */
export function toBandForm(section: Pick<Section, "name" | "width" | "background">): BandFormValues {
  return { name: section.name ?? "", width: section.width, background: section.background ?? "" }
}

/**
 * And back — only what changed since the tab opened. The preview paints this and Salvar sends it,
 * so the two agree, and a value another tab saved meanwhile is not written back over from a copy
 * this one never touched. Empty is "the page's own", which on the wire is null and not `""`.
 */
export function toBandPayload(value: BandFormValues, opened: BandFormValues): UpdateSectionPayload {
  return {
    ...(value.name !== opened.name ? { name: value.name.trim() || null } : {}),
    ...(value.width !== opened.width ? { width: value.width } : {}),
    ...(value.background !== opened.background ? { background: value.background || null } : {}),
  }
}

/** Whether Estilo has anything for Salvar to write: a block's save touches its band only then. */
export function bandChanged(value: BandFormValues, opened: BandFormValues): boolean {
  return Object.keys(toBandPayload(value, opened)).length > 0
}

/**
 * The band that holds the announcement strip. It is drawn above the header, whatever it says, so
 * its Estilo asks only its colour.
 */
export function isStripBand(section: Pick<Section, "components">): boolean {
  return section.components.length > 0 && section.components.every((component) => component.kind === "ANNOUNCEMENT")
}
