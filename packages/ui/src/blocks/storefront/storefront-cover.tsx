// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontBanner {
  imageUrl: string
  /** Where "comprar agora" goes. Absent means the banner is a picture and not a promise. */
  href?: string
  alt?: string
}

export interface StorefrontCoverProps {
  banner: StorefrontBanner
  /** The cover over the shop is tall; the one under the products, a strip. */
  tall?: boolean
  linkComponent?: LinkComponent
}

/**
 * A banner across the whole window, above or below the shop. Its own file only because the window
 * it came out of had passed the line limit.
 *
 * Decorative unless the shopkeeper wrote a description: a banner whose words are painted into the
 * JPEG has nothing a screen reader can read out of the file.
 */
export function StorefrontCover({ banner, tall = false, linkComponent: Link = AnchorLink }: StorefrontCoverProps) {
  const picture = (
    <img
      src={banner.imageUrl}
      alt={banner.alt ?? ""}
      aria-hidden={banner.alt ? undefined : "true"}
      className={cn("w-full object-cover", tall ? "h-44 shop-sm:h-72 shop-lg:h-96" : "h-32 shop-sm:h-48")}
    />
  )

  return banner.href ? (
    <Link href={banner.href} className="block w-full">
      {picture}
    </Link>
  ) : (
    picture
  )
}
