// Types
import type { ComponentKind, PublicSection } from "@harness-monorepo/contracts"

// UI
import { SECTION_TYPES } from "@harness-monorepo/ui/lib/section-registry"

/** What a component's emptiness is read from: the fields the renderer checks before it draws. */
export interface ComponentContent {
  kind: ComponentKind
  title: string | null
  subtitle: string | null
  body: string | null
  items: readonly unknown[]
}

/**
 * Whether the shop window would draw anything at all for this component.
 *
 * The one rule that has to agree with the renderer, so it is written once here and named after
 * what it answers. Each clause mirrors a `return null` on the other side: a banner with no
 * pictures, a heading with neither words nor a line under them, a promises band with no promises, a
 * FAQ with no questions.
 *
 * It exists because a silent disagreement was reported: the panel listed blocks the preview did
 * not draw, and nothing on the screen said why. The shop reads it too, to leave out a band with
 * nothing to draw instead of spending the page's spacing on a gap.
 */
export function isEmptyComponent({ kind, title, subtitle, body, items }: ComponentContent): boolean {
  // A kind this build does not know — a cached page, or a newer API's — has nothing that draws it.
  if (!isKnownKind(kind)) return true
  // A showcase's and a featured product's items are the cards the public read resolved.
  // A countdown's one item is its end: with none it has nothing to count.
  if (kind === "BANNER" || kind === "BENEFITS" || kind === "PRODUCTS" || kind === "FEATURED_PRODUCT" || kind === "FAQ" || kind === "COUNTDOWN") {
    return items.length === 0
  }
  // `StorefrontHeading` draws a line under a title that is not there; the strip is its title alone.
  if (kind === "HEADING") return !title?.trim() && !subtitle?.trim()
  if (kind === "ANNOUNCEMENT") return !title?.trim()
  if (kind === "TEXT") return !body?.trim()
  // A button alone is not a call: `StorefrontCallToAction` draws nothing without words.
  if (kind === "CALL_TO_ACTION") return !title?.trim() && !body?.trim()
  // With no picture it draws its words alone; with neither, nothing.
  if (kind === "IMAGE_TEXT") return items.length === 0 && !title?.trim() && !body?.trim()

  return false
}

/** Whether this build draws the kind: the wire may carry one a newer API added. */
export function isKnownKind(kind: string): kind is ComponentKind {
  return Object.hasOwn(SECTION_TYPES, kind)
}

/**
 * The bands as the page draws them, and every place that names a band reads this and not its own
 * idea. Never among them: the strip above the header, and a kind this build cannot draw — not even
 * in design mode, whose placeholder would name a kind the panel has no fields for. Outside design
 * mode a component with nothing to draw is left out, and a band left with nothing goes with it. A
 * site's menu that still listed such a band would link to an anchor no longer on the page.
 */
export function drawnSectionsOf(sections: readonly PublicSection[], editing: boolean): PublicSection[] {
  return sections
    .map((section) => ({
      ...section,
      components: section.components.filter(
        (component) =>
          isKnownKind(component.kind) && component.kind !== "ANNOUNCEMENT" && (editing || !isEmptyComponent(component)),
      ),
    }))
    .filter((section) => section.components.length > 0)
}
