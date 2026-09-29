// UI
import { StorefrontAccountForm, type StorefrontAccountFormProps } from "@harness-monorepo/ui/blocks/storefront/storefront-account-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { phoneLineOf } from "@/lib/account-menu"
import { brazilTodayOf, cpfLineOf } from "@/lib/customer-identity"
import { BACK_KEY, paramOf, safeBackOf } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface StorefrontAccountSectionProps {
  slug: string
  /** The profile tab's address, to come back to after a save. */
  accountHref: string
  profile: CustomerProfile
  query: SectionQuery
  errors: WebMessages["errors"]
  messages: UiMessages
}

/** The refusals that name one field: the form marks it invalid and points it at the sentence. */
const INVALID_FIELD_OF: Readonly<Record<string, StorefrontAccountFormProps["invalidField"]>> = {
  CUSTOMER_PHONE_TAKEN: "phone",
  CUSTOMER_CPF_INVALID: "cpf",
  CUSTOMER_BIRTH_DATE_INVALID: "birthDate",
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

/**
 * The profile tab of the shopper's area, and what the last save came back with (`salvo`, `erro`). The
 * phone and the CPF are put in the fields as a person writes them; the API takes them either way.
 */
export function StorefrontAccountSection({ slug, accountHref, profile, query, errors, messages }: StorefrontAccountSectionProps) {
  const code = paramOf(query.erro)
  const back = paramOf(query[BACK_KEY]) ? safeBackOf(slug, paramOf(query[BACK_KEY])) : null

  return (
    <div>
      <StorefrontAccountForm
        profile={{ ...profile, phone: phoneLineOf(profile.phone), cpf: cpfLineOf(profile.cpf) }}
        action={`/${slug}/api/customer/perfil`}
        // Reached from the cart's "Alterar dados", a save goes back to the cart; otherwise, here. A
        // refusal always comes back here, still on its way to the cart: the cart has no form to say it on.
        hidden={{
          retorno: back ?? accountHref,
          formulario: back ? `${accountHref}?${new URLSearchParams({ [BACK_KEY]: back }).toString()}` : accountHref,
        }}
        error={code ? errorOf(code, errors, messages) : null}
        invalidField={code ? (INVALID_FIELD_OF[code] ?? null) : null}
        birthDateMax={brazilTodayOf()}
        saved={paramOf(query.salvo) === "1"}
        messages={messages}
      />
    </div>
  )
}
