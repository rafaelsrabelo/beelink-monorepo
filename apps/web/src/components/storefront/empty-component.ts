// Types
import type { ComponentKind } from "@harness-monorepo/contracts"

/**
 * Whether the shop window would draw anything at all for this component.
 *
 * The one rule that has to agree with the renderer, so it is written once here and named after
 * what it answers. Each clause mirrors a `return null` on the other side: a banner with no
 * pictures, a heading with no words, a promises band with no promises.
 *
 * It exists because a silent disagreement was reported: the panel listed blocks the preview did
 * not draw, and nothing on the screen said why. The shop reads it too, to leave out a band with
 * nothing to draw instead of spending the page's spacing on a gap.
 */
export function isEmptyComponent(
  kind: ComponentKind,
  title: string | null,
  body: string | null,
  items: readonly unknown[],
): boolean {
  // A showcase's items are the cards its source resolved to, which only the public read knows.
  if (kind === "BANNER" || kind === "BENEFITS" || kind === "PRODUCTS") return items.length === 0
  if (kind === "HEADING" || kind === "ANNOUNCEMENT") return !title?.trim()
  if (kind === "TEXT") return !body?.trim()

  return false
}
