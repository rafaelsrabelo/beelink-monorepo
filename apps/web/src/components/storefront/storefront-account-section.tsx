// UI
import { StorefrontAccountForm, type StorefrontAccountFormProps } from "@harness-monorepo/ui/blocks/storefront/storefront-account-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { phoneLineOf } from "@/lib/account-menu"
import { brazilTodayOf, cpfLineOf } from "@/lib/customer-identity"
import { errorSentenceOf } from "@/lib/error-sentence"
import { ADDRESS_ERROR_KEY, ADDRESS_KEY, ADDRESSES_MAX, DELIVER_TO_KEY, NEW_ADDRESS } from "@/lib/saved-address"
import { BACK_KEY, paramOf, safeBackOf } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"
import { StorefrontAddressEditor } from "./storefront-address-editor"
import { StorefrontAddressesSection } from "./storefront-addresses-section"
import { StorefrontNoticesSection } from "./storefront-notices-section"
import { StorefrontSecuritySection } from "./storefront-security-section"

export interface StorefrontAccountSectionProps {
  slug: string
  /** The profile tab's address, to come back to after a save. */
  accountHref: string
  /** The shop's sign-in, where signing out of every device lands. */
  signInHref: string
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
  return errorSentenceOf(errors, code)
}

const BLANK_ADDRESS = {
  id: null,
  label: null,
  recipientName: null,
  zipCode: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
}

/**
 * The profile tab of the shopper's area: their details and, under them, their addresses — or one
 * address's form alone, when the address asks for it (`endereco`). The phone and the CPF are put in
 * the fields as a person writes them; the API takes them either way.
 *
 * Reached from the cart, with its way back (`voltar`), a save goes back to the cart; otherwise, here.
 * A refusal always comes back here, still on its way to the cart: the cart has no form to say it on.
 */
export function StorefrontAccountSection({ slug, accountHref, signInHref, profile, query, errors, messages }: StorefrontAccountSectionProps) {
  const code = paramOf(query.erro)
  const back = paramOf(query[BACK_KEY]) ? safeBackOf(slug, paramOf(query[BACK_KEY])) : null
  const withBack = (params: Record<string, string>) => `${accountHref}?${new URLSearchParams({ ...params, ...(back ? { [BACK_KEY]: back } : {}) }).toString()}`

  const opened = paramOf(query[ADDRESS_KEY])
  const editing = opened && opened !== NEW_ADDRESS ? (profile.addresses.find((address) => address.id === opened) ?? null) : null
  const adding = opened === NEW_ADDRESS && profile.addresses.length < ADDRESSES_MAX
  if (editing || adding) {
    const refused = paramOf(query[ADDRESS_ERROR_KEY])
    return (
      <StorefrontAddressEditor
        slug={slug}
        address={editing ?? BLANK_ADDRESS}
        shopperName={profile.name}
        action={`/${slug}/api/customer/enderecos/salvar`}
        // On the way from the cart, the address saved is the one the cart then delivers to.
        hidden={{ retorno: back ?? `${accountHref}#enderecos`, formulario: withBack({ [ADDRESS_KEY]: editing?.id ?? NEW_ADDRESS }), ...(back ? { [DELIVER_TO_KEY]: "1" } : {}) }}
        cancelHref={back ?? `${accountHref}#enderecos`}
        offerDefault={profile.addresses.length > 0 && !editing?.isDefault}
        error={refused ? errorSentenceOf(errors, refused) : null}
        messages={messages}
      />
    )
  }
  // An address gone since its link was drawn — removed in another tab — is said over the cards.
  const gone = opened && !editing && opened !== NEW_ADDRESS ? { ...query, [ADDRESS_ERROR_KEY]: "CUSTOMER_ADDRESS_NOT_FOUND" } : query

  return (
    <div className="flex flex-col gap-6">
      <StorefrontAccountForm
        profile={{ ...profile, phone: phoneLineOf(profile.phone), cpf: cpfLineOf(profile.cpf) }}
        action={`/${slug}/api/customer/perfil`}
        hidden={{ retorno: back ?? accountHref, formulario: back ? withBack({}) : accountHref }}
        error={code ? errorOf(code, errors, messages) : null}
        invalidField={code ? (INVALID_FIELD_OF[code] ?? null) : null}
        birthDateMax={brazilTodayOf()}
        saved={paramOf(query.salvo) === "1"}
        messages={messages}
      />
      <StorefrontAddressesSection slug={slug} accountHref={accountHref} profile={profile} query={gone} errors={errors} messages={messages} />
      <StorefrontNoticesSection slug={slug} accountHref={accountHref} signInHref={signInHref} profile={profile} query={query} errors={errors} messages={messages} />
      <StorefrontSecuritySection slug={slug} accountHref={accountHref} signInHref={signInHref} profile={profile} query={query} errors={errors} messages={messages} />
    </div>
  )
}
