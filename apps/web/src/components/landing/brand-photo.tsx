// Next
import Image, { type StaticImageData } from "next/image"

export interface BrandPhotoProps {
  /** A static import from `src/assets/images`. */
  image: StaticImageData
  /** Empty for a photo that only sets a mood: a reader is told nothing it would miss. */
  alt: string
  /** How wide it is drawn, as `sizes` writes it: Next offers only the widths that fit. */
  sizes: string
  /**
   * `contain` shows the whole of it inside a box of another proportion, where artwork with words
   * drawn in it would lose them to a cut. `fill` stretches it edge to edge, for a block that draws
   * from its edges. A photograph covers its box.
   */
  fit?: keyof typeof FIT
}

const FIT = { cover: "object-cover", contain: "object-contain", fill: "object-fill" } as const

/**
 * One of the brand's photographs, filling the box a block frames it in. Next serves it as AVIF or
 * WebP at the width the screen needs, under a hashed name cached for good, and never sends the
 * original. Lazy — never fetched while hidden — with a blur of a few bytes holding its place.
 */
export function BrandPhoto({ image, alt, sizes, fit = "cover" }: BrandPhotoProps) {
  return (
    <Image
      src={image}
      alt={alt}
      sizes={sizes}
      fill
      placeholder="blur"
      className={FIT[fit]}
    />
  )
}
