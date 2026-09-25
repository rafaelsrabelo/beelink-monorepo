// Types
import type { ComponentKind, PublicSection } from "@harness-monorepo/contracts"

/**
 * What paints edge to edge in a band with no margin: a picture, and the benefits strip, which
 * brings its own tint and padding. Every other kind is words, and keeps the page's side margin.
 */
export function reachesTheEdge(kind: ComponentKind): boolean {
  return kind === "BANNER" || kind === "BENEFITS"
}

export interface BandRhythm {
  /** The page's one spacing, 32px, above the band. */
  spaceBefore: boolean
  /** The same 32px in the band's own colour, above and below its words. */
  padded: boolean
}

/**
 * The page's one spacing rule, written once: 32px between two bands, and nothing between two
 * surfaces — bands that paint edge to edge, a cover or a coloured strip — so a cover and the strip
 * under it read as one surface, not two with a stripe of page between them. The header is a surface
 * too: a cover sits flush under it, and anything else starts 32px below.
 *
 * A flag per band and not margins that collapse: design mode wraps every band in elements of its
 * own, and a wrapper that starts a new layout context stops a collapse without a word.
 *
 * Takes the bands as they will be drawn — the strip above the header and anything empty already
 * left out — because a band that draws nothing must not decide the space around the ones that do.
 */
export function rhythmOf(sections: readonly PublicSection[]): BandRhythm[] {
  // The header, before the first band.
  let previousIsSurface = true

  return sections.map((section) => {
    const pictures = section.width === "FULL" && section.components.every((component) => reachesTheEdge(component.kind))
    const surface = section.background !== null || pictures
    const rhythm = { spaceBefore: !(previousIsSurface && surface), padded: section.background !== null && !pictures }
    previousIsSurface = surface
    return rhythm
  })
}
