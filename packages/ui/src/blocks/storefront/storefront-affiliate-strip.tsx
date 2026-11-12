// Libs
import { XIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BAND } from "./storefront-band"
import { StorefrontAffiliateAvatar } from "./storefront-affiliate-avatar"
import { firstNameOf } from "./storefront-affiliate-name"

export interface StorefrontAffiliateStripProps {
  name: string
  photoUrl: string | null
  /** Closes the strip. Absent, there is no button. */
  onDismiss?: () => void
  messages?: UiMessages
}

/**
 * Whom the visitor came by, on every page after the one their link arrived at (IMPULSEIA-105): one
 * slim line, the affiliate's small face and first name. The visitor may close it; that hides the
 * line and nothing else — the order is still credited to whoever's link it was.
 */
export function StorefrontAffiliateStrip({ name, photoUrl, onDismiss, messages = defaultMessages }: StorefrontAffiliateStripProps) {
  const text = messages.storefront.affiliate

  return (
    <section aria-label={text.region} className="w-full border-b border-shop-line bg-shop-primary-tint text-shop-on-background">
      <div className={`${BAND} flex items-center gap-2 py-1.5`}>
        <StorefrontAffiliateAvatar name={name} photoUrl={photoUrl} size="sm" />
        <p className="min-w-0 flex-1 truncate text-sm">{text.strip.replace("{name}", firstNameOf(name))}</p>
        {onDismiss ? (
          <button type="button" onClick={onDismiss} aria-label={text.dismiss} className="-me-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-shop-fill shop-md:size-9">
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </section>
  )
}
