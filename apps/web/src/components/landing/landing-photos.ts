// Types
import type { LandingPhoto } from "@harness-monorepo/ui/blocks/landing/landing-picture"

/**
 * The brand's photographs, served from `public/brand/photos`: one WebP per width, made from the
 * originals with sharp (resized, quality 78) — a two-megabyte PNG is not something a phone on a
 * data plan should download for a background. A new photo gets the same widths under its own name.
 */
const BASE = "/brand/photos"
const WIDTHS = [640, 1024] as const
const LARGEST = WIDTHS[WIDTHS.length - 1]!

/** A photo's files, by the name they share; `height` is the largest file's. */
function photoOf(name: string, height: number): LandingPhoto {
  return {
    src: `${BASE}/${name}-${LARGEST}.webp`,
    srcSet: WIDTHS.map((width) => `${BASE}/${name}-${width}.webp ${width}w`).join(", "),
    width: LARGEST,
    height,
  }
}

export const BRAND_PHOTOS = {
  /** A courier on the road with the yellow bag: under the landing's couriers' section. */
  courier: photoOf("courier", 1536),
  /** The yellow poster at a bus stop. */
  busStop: photoOf("poster-bus-stop", 1280),
  /** The black poster on a wall: the landing's posters, and beside the sign-in and sign-up forms. */
  wall: photoOf("poster-wall", 1536),
} satisfies Record<string, LandingPhoto>
