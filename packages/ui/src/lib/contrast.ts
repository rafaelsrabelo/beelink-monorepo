/**
 * Which of black and white can be read on a colour.
 *
 * The shop owner picks the surfaces — the page, the top, the foot, the brand — and every word
 * printed on one of them is derived from it. That is the whole of what a "dark theme" would have
 * been: a dark background IS the dark theme, and a second mechanism beside this one would only be
 * a second place for the two to disagree. The first report would be "I chose dark and the footer
 * came out white".
 *
 * It replaces a real defect rather than adding a feature. `--shop-background` used to do two jobs
 * — paint the page, and colour every word written on a coloured surface — which works only while
 * the page is pale and the top is not. Choose black for both and the shop is black on black.
 *
 * The maths is the WCAG's relative luminance, which is arithmetic rather than taste, so the answer
 * is the same in a test as on the page.
 */

/** sRGB companding, from WCAG 2.2 §relative luminance. */
function channel(value: number): number {
  const c = value / 255

  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/**
 * `#rgb`, `#rrggbb` and `#rrggbbaa`, which is every shape the shop's colour columns accept — they
 * are `VarChar(9)`. Anything else reads as mid-grey, which lands on white text and is the safer of
 * the two guesses on a page a stranger asked for.
 */
export function relativeLuminance(hex: string): number {
  const raw = hex.trim().replace("#", "")
  const full = raw.length === 3 ? raw.split("").map((d) => d + d).join("") : raw.slice(0, 6)

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 0.5

  const [r, g, b] = [0, 2, 4].map((at) => channel(Number.parseInt(full.slice(at, at + 2), 16)))

  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/**
 * The contrast ratio between two colours, 1 to 21. Exported because the tests assert on it: "white
 * on this" is an opinion, "4.5:1" is the line WCAG AA draws for body text.
 */
export function contrastRatio(a: string, b: string): number {
  const one = relativeLuminance(a)
  const two = relativeLuminance(b)
  const [light, dark] = one > two ? [one, two] : [two, one]

  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

/**
 * Black and white as this package spells them.
 *
 * `oklch` and not `#000`/`#fff`, and that is not style: `web/no-hex-colors` scans this package at
 * an absolute zero baseline, and it is right to — a hex here is a colour the product chose, where
 * every colour on a shop window belongs to the shop. These two are the exception the gate cannot
 * see, so they are written the way the stories in this package already write them.
 */
const INK = "oklch(0 0 0)"
const PAPER = "oklch(1 0 0)"

/**
 * The foreground for a surface: whichever of black and white reads better on it.
 *
 * The two ratios are computed from luminance directly rather than by asking `contrastRatio` about
 * `INK` and `PAPER`, because those two are `oklch` strings and this file's parser reads hex. Asking
 * it would have made both sides mid-grey and returned the same answer for a black page and a white
 * one — which is exactly what the test named "keeps a black page and a black header apart" caught.
 *
 * The threshold is the crossover of the two ratios rather than a fixed luminance, so a surface is
 * only ever given the worse of the two when both are bad — and then the page is still as legible
 * as it can be, which a single global foreground could not promise at all.
 */
export function readableOn(surface: string): string {
  const luminance = relativeLuminance(surface)
  const onPaper = 1.05 / (luminance + 0.05)
  const onInk = (luminance + 0.05) / 0.05

  return onPaper >= onInk ? PAPER : INK
}
