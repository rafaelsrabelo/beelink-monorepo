"use client"

// React
import type { ReactNode } from "react"

// Next
import { usePathname } from "next/navigation"

// UI
import { SubscriptionLockedSkeleton } from "@harness-monorepo/ui/blocks/billing/subscription-locked-skeleton"
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { isSubscribePage, pageLockOf, pageSlugOf, pageStripOf } from "@/lib/page-lock-view"
import { usePageStanding } from "@/services/billing/page-lock-hooks"
import { PageLockedLive } from "./page-locked-live"
import { PageStripLive } from "./page-strip-live"

export interface PageLockGateProps {
  /** The panel's real-time channel: not opened while the page is locked, and opened anew once it is not. */
  realtime: ReactNode
  locale: string
  messages: UiMessages
  children: ReactNode
}

/**
 * What stands between the panel's shell and a page's screens (BEELINK-296). The shell around it — the
 * menu, the switch to another page, the account — is never closed.
 *
 * A page whose subscription reads locked has its notice in place of every screen but the Assinar one,
 * which is the way out; a page whose reads were refused for its lock before the subscription said so
 * has the notice's skeleton until the subscription answers — or, should that read fail, says so and
 * offers to try again. A page about to lock has its strip over the screen. Where billing is off, none
 * of it: the screen is drawn at once, as ever, never waiting on the subscription, and the elements drawn
 * are the same three slots with nothing in the strip's — the DOM of the panel as it was.
 *
 * The channel is left out while the page is closed — its ticket would be refused — and mounted anew
 * once it opens, which asks for a fresh ticket: a channel refused once never asks again by itself.
 */
export function PageLockGate({ realtime, locale, messages, children }: PageLockGateProps) {
  const pathname = usePathname()
  const slug = pageSlugOf(pathname)
  const onSubscribe = slug !== null && isSubscribePage(pathname, slug)
  const { subscription, refused } = usePageStanding(slug, onSubscribe)
  const lock = pageLockOf(subscription.data, locale)
  const closed = lock !== null || refused
  const strip = slug !== null && !closed && !onSubscribe ? pageStripOf(subscription.data, locale) : null

  let screen: ReactNode = children
  if (slug !== null && closed && !onSubscribe) {
    screen = lock ? (
      <PageLockedLive slug={slug} lock={lock} locale={locale} messages={messages} />
    ) : (
      <>
        {/* Until the notice is drawn, a reader is still told what this is. */}
        <h1 className="sr-only">{messages.subscription.untitled}</h1>
        {subscription.isError && !subscription.isFetching ? (
          <div className="mx-auto w-full max-w-2xl px-4 lg:px-6">
            <IntegrationsFailed onRetry={() => void subscription.refetch()} message={messages.subscription.failed} messages={messages} />
          </div>
        ) : (
          <SubscriptionLockedSkeleton />
        )}
      </>
    )
  }

  return (
    <>
      {closed ? null : realtime}
      {slug !== null && strip ? <PageStripLive slug={slug} view={strip} messages={messages} /> : null}
      {screen}
    </>
  )
}
