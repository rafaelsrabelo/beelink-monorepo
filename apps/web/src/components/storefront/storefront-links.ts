// Types
import type { PublicStore } from "@harness-monorepo/contracts"
import type { StorefrontLink } from "@harness-monorepo/ui/blocks/storefront/storefront-window"

/**
 * Turns what a shop stored into where a visitor is sent.
 *
 * It lives here and not in the block for the reason every block here takes hrefs rather than
 * handles: `instagram.com/<handle>` is knowledge about a third party, and the design system holds
 * none. A shop stores a handle without its `@`, and a phone as digits with the country code —
 * which is exactly what `wa.me` wants and why the column is shaped that way.
 */
export function storefrontLinksOf(store: PublicStore): StorefrontLink[] {
  const social = store.socialNetworks

  const links: Array<StorefrontLink | null> = [
    social.instagram ? { network: "instagram", href: `https://instagram.com/${social.instagram}` } : null,
    social.tiktok ? { network: "tiktok", href: `https://tiktok.com/@${social.tiktok}` } : null,
    social.youtube ? { network: "youtube", href: `https://youtube.com/@${social.youtube}` } : null,
    // Spotify is already a full URL: it has no handle the web can expand, which is why the field
    // is a URL in the first place.
    social.spotify ? { network: "spotify", href: social.spotify } : null,
  ]

  return links.filter((link): link is StorefrontLink => link !== null)
}

/**
 * `wa.me/<digits>`, or nothing at all. A shop carried over without a number gets no button rather
 * than one that opens WhatsApp with no one on the other end.
 */
export function orderHrefOf(store: PublicStore): string | undefined {
  const digits = store.socialNetworks.whatsapp?.replace(/\D/g, "")

  return digits ? `https://wa.me/${digits}` : undefined
}

/**
 * Where the shop is, on one line, for the footer. Only what a customer would use to find it: the
 * street and the number say where to knock, and the city says which "Rua das Flores" it is.
 *
 * `null` for a shop that filled none of it in — a footer with a lone comma reads as a bug.
 */
export function addressLineOf(store: PublicStore & { address?: { street?: string | null; number?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null } }): string | null {
  const address = store.address
  if (!address) return null

  const street = [address.street, address.number].filter(Boolean).join(", ")
  const place = [address.neighborhood, address.city, address.state].filter(Boolean).join(" · ")
  const line = [street, place].filter(Boolean).join(" — ")

  return line || null
}
