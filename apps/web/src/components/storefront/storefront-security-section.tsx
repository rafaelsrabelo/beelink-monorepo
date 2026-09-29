// UI
import { StorefrontAccountSecurity } from "@harness-monorepo/ui/blocks/storefront/storefront-account-security"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { SECURITY_ERROR_KEY, SECURITY_NOTICE_KEY, securityFieldOf, securityNoticeOf } from "@/lib/account-security"
import { errorSentenceOf } from "@/lib/error-sentence"
import { paramOf } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface StorefrontSecuritySectionProps {
  slug: string
  /** The profile tab's address: every change comes back to its security section. */
  accountHref: string
  /** The shop's sign-in, where signing out of every device lands. */
  signInHref: string
  profile: Pick<CustomerProfile, "email" | "hasPassword">
  query: SectionQuery
  errors: WebMessages["errors"]
  messages: UiMessages
}

/** The shopper's own access to their account, under their addresses (BEELINK-150), and what the last change came back with. */
export function StorefrontSecuritySection({ slug, accountHref, signInHref, profile, query, errors, messages }: StorefrontSecuritySectionProps) {
  const code = paramOf(query[SECURITY_ERROR_KEY])
  const here = `${accountHref}#seguranca`
  const action = (name: string) => `/${slug}/api/customer/seguranca/${name}`

  return (
    <StorefrontAccountSecurity
      email={profile.email}
      hasPassword={profile.hasPassword}
      actions={{ change: action("trocar-senha"), create: action("criar-senha"), everywhere: action("sair-de-todos") }}
      hidden={{ retorno: here, entrada: signInHref }}
      notice={securityNoticeOf(paramOf(query[SECURITY_NOTICE_KEY]), profile.email, messages)}
      error={code ? errorSentenceOf(errors, code) : null}
      invalidField={securityFieldOf(code)}
      messages={messages}
    />
  )
}
