// Libs
import { CheckIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BAND } from "./storefront-band"
import { StorefrontAffiliateAvatar } from "./storefront-affiliate-avatar"

export interface StorefrontAffiliateBannerProps {
  /** The affiliate's whole name, as the shop keeps it. */
  name: string
  photoUrl: string | null
  /** Their own phrase, up to 100 characters. */
  tagline?: string | null
  messages?: UiMessages
}

/**
 * Whom the visitor came by (IMPULSEIA-105), as the shopkeeper drew it: a band in the shop's brand
 * colour under its header — the affiliate's face, their whole name with the official-partner badge,
 * and what the link does for the visitor's orders. In the page's flow: it covers nothing. Drawn only
 * where the link is in the address, so it has nothing to close.
 */
export function StorefrontAffiliateBanner({ name, photoUrl, tagline = null, messages = defaultMessages }: StorefrontAffiliateBannerProps) {
  const text = messages.storefront.affiliate

  return (
    <section aria-label={text.region} className="w-full border-t border-shop-on-primary/15 bg-shop-primary text-shop-on-primary">
      <div className={`${BAND} flex items-start gap-3 py-3 shop-sm:items-center shop-sm:py-4`}>
        <div className="flex min-w-0 flex-1 flex-col gap-2 shop-sm:flex-row shop-sm:items-center shop-sm:gap-6">
          <div className="flex min-w-0 items-center gap-3 shop-sm:gap-4">
            <StorefrontAffiliateAvatar
              name={name}
              photoUrl={photoUrl}
              size="lg"
              className="size-11 ring-2 ring-shop-on-primary/70 ring-offset-2 ring-offset-shop-primary shop-sm:size-12"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-xs leading-snug text-shop-on-primary/80">{text.bannerLead}</p>
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-base leading-tight font-extrabold tracking-wide break-words uppercase shop-sm:text-lg">{name}</p>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-shop-on-primary/60 bg-shop-on-primary/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase">
                  <CheckIcon aria-hidden="true" className="size-3" />
                  {text.partner}
                </span>
              </div>
              {tagline ? <p className="text-sm leading-snug break-words text-shop-on-primary/85">“{tagline}”</p> : null}
            </div>
          </div>
          <p className="text-xs leading-snug text-shop-on-primary/85 shop-sm:ms-auto shop-sm:max-w-sm shop-sm:text-end shop-sm:text-sm">{text.bannerNote}</p>
        </div>
      </div>
    </section>
  )
}
