// Types
import type { PublicAnnouncementLink, PublicSection } from "@harness-monorepo/contracts"

/**
 * The strip above the header, if the shop has one.
 *
 * Read out of the same arrangement as every other component, because that is where a shopkeeper
 * writes and hides it — but drawn by the window rather than among the bands, because it sits above
 * the masthead and "before the header" is not a position the arrangement can hold.
 */
export function announcementOf(
  sections: readonly PublicSection[] = [],
): {
  left: string
  right?: string
  background: string | null
  href: string | null
  external: boolean
  motion?: "STATIC" | "MARQUEE"
} | null {
  const band = sections.find((section) => section.components.some((component) => component.kind === "ANNOUNCEMENT"))
  const strip = band?.components.find((component) => component.kind === "ANNOUNCEMENT")

  if (!band || !strip?.title) return null

  // Already resolved by the API, the way a slide's is. At most one.
  const link = strip.items[0] as PublicAnnouncementLink | undefined

  return {
    left: strip.title,
    ...(strip.subtitle ? { right: strip.subtitle } : {}),
    // The strip's colour is its band's: the one band not drawn where it sits still owns a colour.
    background: band.background,
    href: link?.href ?? null,
    external: link?.external ?? false,
    ...(strip.display === "STATIC" || strip.display === "MARQUEE" ? { motion: strip.display } : {}),
  }
}
