/**
 * Where a heading or a paragraph sits, and what each kind draws when nobody chose.
 *
 * Its own module, a `.tsx` with no directive on top, and both facts are load-bearing. The `.tsx`
 * is for the package's export map, which points `./blocks/*` at `.tsx` and leaves a `.ts` beside
 * a block unreachable from an app. The absence of `"use client"` is for the storefront: it is a
 * Server Component, and a function imported from a client module arrives there as a client
 * reference that throws the moment it is called — which took two shops' landing pages down to a
 * 500 the first time this helper was reached through the alignment field.
 */

// Block
import type { ComponentKind } from "./design-types"

/** The contract's `TextAlign`, restated. */
export const TEXT_ALIGNS = ["LEFT", "CENTER", "RIGHT"] as const
export type TextAlign = (typeof TEXT_ALIGNS)[number]

/**
 * A heading centred, a paragraph at the left: the habit each kind keeps until the shopkeeper says
 * otherwise. Written once, because two things have to agree on it — the form, which shows it as
 * the current choice, and the storefront, which draws it for a null.
 */
export function defaultAlignOf(kind: ComponentKind): TextAlign {
  return kind === "HEADING" ? "CENTER" : "LEFT"
}
