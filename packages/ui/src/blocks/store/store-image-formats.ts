/**
 * What a media type is called when it is shown to a shopkeeper. `image/jpeg` is the truth the
 * browser tells and "JPEG" is the word the person reading the form knows, and those are not the
 * same register. A type with no entry here falls back to its subtype, so an `accept` this map has
 * not caught up with still reads as something rather than as a blank.
 */
export const FORMAT_NAMES: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "image/avif": "AVIF",
  "image/svg+xml": "SVG",
}

export const MEGABYTE = 1024 * 1024
