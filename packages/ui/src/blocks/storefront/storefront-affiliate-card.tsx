// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BAND } from "./storefront-band"
import { StorefrontAffiliateAvatar } from "./storefront-affiliate-avatar"

export interface StorefrontAffiliateCardProps {
  /** The affiliate's whole name, as the shop keeps it. */
  name: string
  photoUrl: string | null
  /** Their own phrase, up to 100 characters; null with none. */
  tagline?: string | null
  messages?: UiMessages
}

/**
 * Whom the visitor came by, on the page their link arrived at (IMPULSEIA-105): the affiliate's face
 * and whole name, and their phrase when they wrote one — so whoever opens the link knows at once the
 * page is that person's recommendation. Under the shop's header, in its flow and its tint, like the
 * offer strip: it covers nothing, and announces nothing — it is there when the page arrives. The
 * prices and the catalogue are the shop's own either way.
 */
export function StorefrontAffiliateCard({ name, photoUrl, tagline = null, messages = defaultMessages }: StorefrontAffiliateCardProps) {
  const text = messages.storefront.affiliate

  return (
    <section aria-label={text.region} className="w-full border-b border-shop-line bg-shop-primary-tint text-shop-on-background">
      <div className={`${BAND} flex items-center gap-3 py-3 shop-md:gap-4 shop-md:py-4`}>
        <StorefrontAffiliateAvatar name={name} photoUrl={photoUrl} size="lg" className="shop-md:size-12" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm leading-snug break-words">
            {text.cardLead} <strong className="font-semibold">{name}</strong>
          </p>
          {tagline ? <p className="text-sm leading-snug break-words text-shop-muted">“{tagline}”</p> : null}
        </div>
      </div>
    </section>
  )
}
