// Block
import type { StorefrontSpan } from "./storefront-band-cell"

/**
 * The proportion a picture takes in a slice of the band, for the poster and the carousel alike.
 *
 * Shared because the two sit in the same rows: a carousel in a third that kept a full band's fixed
 * height stood half again as tall as the posters beside it, and clipped its headline.
 *
 * Each value follows the width the cell really has at that size. A full-width poster gets taller as
 * the screen narrows, or it is a letterbox two fingers tall. A third is a half between 640px and
 * 1024px (see `StorefrontBandCell`), so it is 16:9 there, like the half and the two thirds beside
 * it. Two thirds at 8:3 next to a 4:3 third is 6px taller in a contained band — the cell is two
 * thirds plus one 16px gap — which is the closest a plain ratio gets.
 */
export const SPAN_HEIGHT: Record<StorefrontSpan, string> = {
  FULL: "aspect-[4/3] sm:aspect-[2/1] lg:aspect-[21/9]",
  TWO_THIRDS: "aspect-[16/9] lg:aspect-[8/3]",
  HALF: "aspect-[16/9]",
  THIRD: "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[4/3]",
}

/** The headline written over the picture, sized to the slice so a third does not clip its words. */
export const SPAN_TITLE: Record<StorefrontSpan, string> = {
  FULL: "text-2xl sm:text-4xl",
  TWO_THIRDS: "text-xl lg:text-2xl",
  HALF: "text-lg",
  THIRD: "text-lg",
}
