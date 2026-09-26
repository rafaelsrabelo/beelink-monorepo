// UI
import { StorefrontAccountForm } from "@harness-monorepo/ui/blocks/storefront/storefront-account-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { BACK_KEY, paramOf, safeBackOf } from "@/lib/storefront-routes"
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

/**
 * A refused save in the shopper's words. A phone the shop already has is most likely the record the
 * shopkeeper made from a WhatsApp sale: the shopper is told to talk to the shop, which can merge the
 * two — never that another customer has it, and never merged from here.
 */
function errorOf(code: string, errors: WebMessages["errors"], messages: UiMessages): string {
  if (code === "CUSTOMER_PHONE_TAKEN") return messages.storefront.accountPhoneTaken
  return errors[code as keyof WebMessages["errors"]] ?? errors.UNKNOWN
}

/** The shopper's page at a shop, and what the last save came back with (`salvo`, `erro`). */
export function StorefrontAccountSection({ slug, accountHref, profile, query, errors, messages }: StorefrontAccountSectionProps) {
  const code = paramOf(query.erro)
  const back = paramOf(query[BACK_KEY]) ? safeBackOf(slug, paramOf(query[BACK_KEY])) : null

  return (
    <div className="py-4">
      <StorefrontAccountForm
        profile={profile}
        action={`/${slug}/api/customer/perfil`}
        signOutAction={`/${slug}/api/customer/sair`}
        // Reached from the cart's "Alterar dados", a save goes back to the cart; otherwise, here. A
        // refusal always comes back here, still on its way to the cart: the cart has no form to say it on.
        hidden={{
          retorno: back ?? accountHref,
          formulario: back ? `${accountHref}?${new URLSearchParams({ [BACK_KEY]: back }).toString()}` : accountHref,
        }}
        error={code ? errorOf(code, errors, messages) : null}
        saved={paramOf(query.salvo) === "1"}
        messages={messages}
      />
    </div>
  )
}
