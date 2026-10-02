/**
 * A photograph the site serves from its own files, one per width: a phone downloads the small one.
 * The blocks are handed it as data and never know where the files live.
 */
export interface LandingPhoto {
  src: string
  /** Every width there is a file for, as `srcset` writes it. */
  srcSet: string
  /** The largest file's, so the page holds the photo's place before it arrives. */
  width: number
  height: number
}

export interface LandingPictureProps {
  photo: LandingPhoto
  /** Empty for a photo that only sets a mood: a reader is told nothing it would miss. */
  alt: string
  /** How wide it is drawn, as `sizes` writes it, so the browser picks the file. */
  sizes: string
  className?: string
}

/** One of the brand's photographs, fetched once it nears the screen — and never while it is hidden. */
export function LandingPicture({ photo, alt, sizes, className }: LandingPictureProps) {
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  )
}
