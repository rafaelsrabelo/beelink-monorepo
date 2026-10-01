// UI
import { StorefrontAccountPrivacy } from "@harness-monorepo/ui/blocks/storefront/storefront-account-privacy"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { DATA_ERROR_KEY, PRIVACY_ERROR_KEY, downloadErrorOf, privacyActionsOf, privacyErrorOf } from "@/lib/account-privacy"
import { paramOf } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface StorefrontPrivacySectionProps {
  slug: string
  /** The profile tab's address: a refusal comes back to its privacy section. */
  accountHref: string
  /** The shop's sign-in, where a deleted account — or a session that ended — lands. */
  signInHref: string
  profile: Pick<CustomerProfile, "email" | "hasPassword">
  query: SectionQuery
  errors: WebMessages["errors"]
  messages: UiMessages
}

/** The last of the profile tab (BEELINK-152): the shopper's copy of their data, and the end of their account. */
export function StorefrontPrivacySection({ slug, accountHref, signInHref, profile, query, errors, messages }: StorefrontPrivacySectionProps) {
  const code = paramOf(query[PRIVACY_ERROR_KEY])
  const failed = paramOf(query[DATA_ERROR_KEY])
  const carried = { retorno: `${accountHref}#privacidade`, entrada: signInHref }
  const actions = privacyActionsOf(slug)

  return (
    <StorefrontAccountPrivacy
      email={profile.email}
      hasPassword={profile.hasPassword}
      // A link carries no form: where to come back to, and the sign-in, ride in its address.
      dataHref={`${actions.data}?${new URLSearchParams(carried).toString()}`}
      deleteAction={actions.delete}
      hidden={carried}
      downloadError={failed ? downloadErrorOf(failed, errors, messages) : null}
      error={code ? privacyErrorOf(code, errors, messages) : null}
      messages={messages}
    />
  )
}
