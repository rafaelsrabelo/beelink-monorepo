// Libs
import { CheckIcon, XIcon } from "lucide-react"

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
  /** Their own phrase, up to 100 characters: only on the page the link arrived at. */
  tagline?: string | null
  /** Hides the band. Absent, there is no button — the page the link arrived at is never closed. */
  onDismiss?: () => void
  messages?: UiMessages
}

/**
 * Whom the visitor came by (IMPULSEIA-105), as the shopkeeper drew it: a band in the shop's brand
 * colour under its header — the affiliate's face, their whole name with the official-partner badge,
 * and what the link does for the visitor's orders. In the page's flow: it covers nothing. Closing it
 * hides the band and nothing else — the order is still credited to whoever's link it was.
 */
export function StorefrontAffiliateBanner({ name, photoUrl, tagline = null, onDismiss, messages = defaultMessages }: StorefrontAffiliateBannerProps) {
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
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-shop-on-primary/60 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase">
                  <CheckIcon aria-hidden="true" className="size-3" />
                  {text.partner}
                </span>
              </div>
              {tagline ? <p className="text-sm leading-snug break-words text-shop-on-primary/85">“{tagline}”</p> : null}
            </div>
          </div>
          <p className="text-xs leading-snug text-shop-on-primary/85 shop-sm:ms-auto shop-sm:max-w-sm shop-sm:text-end shop-sm:text-sm">{text.bannerNote}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={text.dismiss}
            className="-me-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-shop-on-primary/10 shop-md:size-9"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </section>
  )
}
