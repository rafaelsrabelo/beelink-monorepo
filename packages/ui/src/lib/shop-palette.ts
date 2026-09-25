// React
import type { CSSProperties } from "react"

// Lib
import { readableOn, toneOn } from "@harness-monorepo/ui/lib/contrast"

/** The four colours a shop dresses its window in. They are data, chosen by the shopkeeper. */
export interface ShopColors {
  background: string
  primary: string
  header: string
  /** The foot, which used to borrow the header's. There is no `text`: it is derived per surface. */
  footer: string
}

/** The paper answer `readableOn` gives: the surface is dark, and what is written on it is light. */
const PAPER = "oklch(1 0 0)"

/** A neutral mixed from the page's ink into the page, so it is a shade of the shop and not a grey. */
function neutral(percent: number): string {
  return `color-mix(in oklab, var(--shop-on-background) ${percent}%, var(--shop-background))`
}

/**
 * Every `--shop-*` custom property, from the four colours the shopkeeper chose — pure, so the
 * window's root, a portaled overlay and a test all compute the same palette.
 *
 * Four surfaces and a readable foreground derived for each, per surface and not one global ink:
 * `--shop-background` used to paint the page AND colour every word on a coloured surface, which
 * holds only while the page is pale and the top is not. Computed where the variables are written,
 * so it is in the HTML on the first paint: the shop window is prerendered, and a colour decided
 * after hydration is a flash of unreadable text on every visit.
 *
 * The rest of the palette is named here so no block invents its own mix. How the 5a/5b designs'
 * colours map onto it, by the role each colour plays there (the hex values are in the plan for
 * BEELINK-75, since a colour may not be written in this package):
 *
 * | Design                                     | Token                                          |
 * |--------------------------------------------|------------------------------------------------|
 * | the purple of buttons, checks, chosen pill | `--shop-primary`                               |
 * | the indigo of links and chip text          | `--shop-primary-ink`                           |
 * | the header's navy                          | `--shop-header` / `--shop-on-header`           |
 * | the lilac underline, cart badge, search button | `--shop-primary-on-header`                 |
 * | the paler lilac of "Ofertas do dia"        | `--shop-primary-on-header-soft`                |
 * | the near-black of the current page, "Comprar agora" | `--shop-text` / `--shop-on-text`      |
 * | body text                                  | `--shop-on-background`                         |
 * | muted text                                 | `--shop-muted`                                 |
 * | dividers and table rules                   | `--shop-line`                                  |
 * | control borders                            | `--shop-line-strong`                           |
 * | frames                                     | `--shop-frame`                                 |
 * | fills, the select's surface                | `--shop-fill`                                  |
 * | image placeholders                         | `--shop-placeholder`                           |
 * | the listing's grey canvas                  | `--shop-canvas`                                |
 * | a chosen card's wash, its empty swatch     | `--shop-primary-tint`, `--shop-primary-tint-strong` |
 * | white panels                               | `--shop-background`                            |
 * | sale red, positive green, star amber, verified brown | `--shop-sale`, `--shop-positive`, `--shop-rating`, `--shop-verified` |
 *
 * The semantic four are not the shop's and live in `globals.css`, the one place a colour may be
 * written down. Each has a surface form, a foreground for it (`--shop-on-sale`) and an ink form
 * (`--shop-sale-ink`) that reads as text on this shop's page: the base on a pale page, a lighter
 * variant on a dark one, chosen here because CSS cannot measure contrast.
 */
export function shopPaletteVariables(colors: ShopColors): CSSProperties {
  const ink = readableOn(colors.background)
  const darkPage = ink === PAPER
  /*
    The brand on the header, as an accent: the active category's underline, the cart's badge and
    the search button. `--shop-primary` alone vanishes the moment a shop paints its header in its
    own colour, which the example shop does; this is the brand mixed toward the header's ink only
    as far as 4.5:1 requires, and the brand itself for every shop whose two colours differ.
  */
  const primaryOnHeader = toneOn(colors.primary, colors.header)
  const semantic = (name: string) => `var(--shop-${name}${darkPage ? "-on-dark" : ""})`

  return {
    "--shop-background": colors.background,
    "--shop-on-background": ink,
    "--shop-primary": colors.primary,
    "--shop-on-primary": readableOn(colors.primary),
    /*
      The brand as a *word* on the page, rather than as a surface behind one. `readableOn` cannot
      serve it: answering "black or white" would throw the brand away. This is the brand mixed
      toward the page's ink only as far as 4.5:1 requires — a pale yellow on white and a navy on
      black are the two a shopkeeper cannot read at all, and every other brand comes back untouched.
    */
    "--shop-primary-ink": toneOn(colors.primary, colors.background),
    "--shop-header": colors.header,
    "--shop-on-header": readableOn(colors.header),
    "--shop-primary-on-header": primaryOnHeader,
    "--shop-on-primary-on-header": readableOn(primaryOnHeader),
    "--shop-primary-on-header-soft": "color-mix(in oklab, var(--shop-primary-on-header) 55%, var(--shop-on-header))",
    "--shop-footer": colors.footer,
    "--shop-on-footer": readableOn(colors.footer),
    /*
      `--shop-text` survives as a name because it is also a *surface* — the announcement strip, the
      current page's box and the poster's gradient are drawn in it — and it is exactly the page's
      ink, so the two are one value rather than two that can disagree.
    */
    "--shop-text": ink,
    "--shop-on-text": colors.background,
    "--shop-muted": neutral(65),
    "--shop-line": neutral(10),
    "--shop-line-strong": neutral(22),
    "--shop-frame": neutral(15),
    "--shop-fill": neutral(3),
    "--shop-placeholder": neutral(6),
    "--shop-canvas": neutral(4),
    // The pale wash of a chosen card or pill (5b's lilac), and the deeper one of its empty swatch:
    // the shop's own colour mixed into its page, so a dark shop gets a dark wash.
    "--shop-primary-tint": "color-mix(in oklab, var(--shop-primary) 8%, var(--shop-background))",
    "--shop-primary-tint-strong": "color-mix(in oklab, var(--shop-primary) 16%, var(--shop-background))",
    "--shop-sale-ink": semantic("sale"),
    "--shop-positive-ink": semantic("positive"),
    "--shop-verified-ink": semantic("verified"),
  } as CSSProperties
}

/** The variables, and the page painted in them: what the window's root wears. */
export function shopPaletteStyle(colors: ShopColors): CSSProperties {
  return {
    ...shopPaletteVariables(colors),
    backgroundColor: "var(--shop-background)",
    color: "var(--shop-on-background)",
  }
}
