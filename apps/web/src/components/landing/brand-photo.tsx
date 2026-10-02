// Next
import Image, { type StaticImageData } from "next/image"

export interface BrandPhotoProps {
  /** A static import from `src/assets/images`. */
  image: StaticImageData
  /** Empty for a photo that only sets a mood: a reader is told nothing it would miss. */
  alt: string
  /** How wide it is drawn, as `sizes` writes it: Next offers only the widths that fit. */
  sizes: string
}

/**
 * One of the brand's photographs, filling the box a block frames it in. Next serves it as AVIF or
 * WebP at the width the screen needs, under a hashed name cached for good, and never sends the
 * original. Lazy — never fetched while hidden — with a blur of a few bytes holding its place.
 */
export function BrandPhoto({ image, alt, sizes }: BrandPhotoProps) {
  return <Image src={image} alt={alt} sizes={sizes} fill placeholder="blur" className="object-cover" />
}
