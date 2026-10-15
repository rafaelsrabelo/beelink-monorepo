"use client"

// UI
import { SubscriptionStrip } from "@harness-monorepo/ui/blocks/billing/subscription-strip"
import type { SubscriptionStripView } from "@harness-monorepo/ui/lib/subscription"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { subscribePageOf } from "@/lib/subscribe-view"
import { useBillingAccount } from "@/services/billing/billing-hooks"

export interface PageStripLiveProps {
  slug: string
  view: SubscriptionStripView
  messages: UiMessages
}

/**
 * The strip over a page's screens before it locks (BEELINK-296), wired — and only where the page can
 * lock. Without bee-link's Asaas key nothing locks (BEELINK-223), and the account's billing read says so
 * (`BILLING_UNAVAILABLE`, the Assinar screen's own sign): the strip would threaten a lock that never
 * comes, and lead to a screen saying subscribing is unavailable. Nothing is drawn until that read has
 * answered once.
 *
 * As wide as the panel's column: the strip is about the page, not about the screen under it, whose own
 * measure varies from screen to screen.
 */
export function PageStripLive({ slug, view, messages }: PageStripLiveProps) {
  const account = useBillingAccount()
  if (account.data === undefined) return null

  return (
    <div className="mb-5">
      <SubscriptionStrip view={view} subscribeHref={subscribePageOf(slug)} linkComponent={AppLink} messages={messages} />
    </div>
  )
}
