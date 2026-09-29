// UI
import { StorefrontAccountNotices } from "@harness-monorepo/ui/blocks/storefront/storefront-account-notices"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { NOTICES_ERROR_KEY, NOTICES_SAVED, offersSinceOf } from "@/lib/account-notices"
import { errorSentenceOf } from "@/lib/error-sentence"
import { paramOf } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface StorefrontNoticesSectionProps {
  slug: string
  /** The profile tab's address: a save comes back to its notices. */
  accountHref: string
  /** The shop's sign-in, where a session that ended meanwhile is sent. */
  signInHref: string
  profile: Pick<CustomerProfile, "email" | "notifications">
  query: SectionQuery
  errors: WebMessages["errors"]
  messages: UiMessages
}

/** The shopper's notices by e-mail, under their addresses (BEELINK-151), and what the last save came back with. */
export function StorefrontNoticesSection({ slug, accountHref, signInHref, profile, query, errors, messages }: StorefrontNoticesSectionProps) {
  const code = paramOf(query[NOTICES_ERROR_KEY])

  return (
    <StorefrontAccountNotices
      email={profile.email}
      notices={profile.notifications}
      offersSince={offersSinceOf(profile.notifications, "pt-BR")}
      action={`/${slug}/api/customer/avisos`}
      hidden={{ retorno: `${accountHref}#avisos`, entrada: signInHref }}
      notice={paramOf(query.aviso) === NOTICES_SAVED ? messages.storefront.noticesSaved : null}
      error={code ? errorSentenceOf(errors, code) : null}
      messages={messages}
    />
  )
}
