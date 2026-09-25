// UI
import { StorefrontAccountForm } from "@harness-monorepo/ui/blocks/storefront/storefront-account-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { paramOf } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface StorefrontAccountSectionProps {
  slug: string
  /** This page's address, to come back to after a save. */
  accountHref: string
  profile: CustomerProfile
  query: SectionQuery
  errors: WebMessages["errors"]
  messages: UiMessages
}

/** The shopper's page at a shop, and what the last save came back with (`salvo`, `erro`). */
export function StorefrontAccountSection({ slug, accountHref, profile, query, errors, messages }: StorefrontAccountSectionProps) {
  const code = paramOf(query.erro)

  return (
    <div className="py-4">
      <StorefrontAccountForm
        profile={profile}
        action={`/api/storefront/${slug}/customer/perfil`}
        signOutAction={`/api/storefront/${slug}/customer/sair`}
        hidden={{ retorno: accountHref }}
        error={code ? (errors[code as keyof WebMessages["errors"]] ?? errors.UNKNOWN) : null}
        saved={paramOf(query.salvo) === "1"}
        messages={messages}
      />
    </div>
  )
}
