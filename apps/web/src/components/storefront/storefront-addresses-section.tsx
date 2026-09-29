// UI
import { StorefrontAddressCards } from "@harness-monorepo/ui/blocks/storefront/storefront-address-cards"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { errorSentenceOf } from "@/lib/error-sentence"
import {
  ADDRESS_ERROR_KEY,
  ADDRESS_KEY,
  ADDRESS_NOTICE_KEY,
  ADDRESSES_MAX,
  NEW_ADDRESS,
  REMOVE_KEY,
  addressNoticeOf,
  savedAddressHeadingOf,
  savedAddressLinesOf,
} from "@/lib/saved-address"
import { paramOf } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface StorefrontAddressesSectionProps {
  slug: string
  /** The profile tab's address: the cards' form opens under it, and every change comes back to it. */
  accountHref: string
  profile: Pick<CustomerProfile, "name" | "addresses">
  query: SectionQuery
  errors: WebMessages["errors"]
  messages: UiMessages
}

/**
 * The shopper's saved addresses under their details, as 6h draws them, and what the last change came
 * back with. Every change comes back to the cards (`#enderecos`), where what it did is said, rather
 * than to the top of the tab, under a whole form.
 */
export function StorefrontAddressesSection({ slug, accountHref, profile, query, errors, messages }: StorefrontAddressesSectionProps) {
  const code = paramOf(query[ADDRESS_ERROR_KEY])
  const asking = paramOf(query[REMOVE_KEY])
  const cards = `${accountHref}#enderecos`
  const withQuery = (key: string, id: string, fragment: string) => `${accountHref}?${new URLSearchParams({ [key]: id }).toString()}${fragment}`

  return (
    <StorefrontAddressCards
      addresses={profile.addresses.map((address) => ({
        id: address.id,
        heading: savedAddressHeadingOf(address, profile.name),
        lines: savedAddressLinesOf(address),
        isDefault: address.isDefault,
        editHref: withQuery(ADDRESS_KEY, address.id, ""),
        removeHref: withQuery(REMOVE_KEY, address.id, `#endereco-${address.id}`),
      }))}
      addHref={profile.addresses.length < ADDRESSES_MAX ? withQuery(ADDRESS_KEY, NEW_ADDRESS, "") : null}
      limit={ADDRESSES_MAX}
      removeAction={`/${slug}/api/customer/enderecos/remover`}
      defaultAction={`/${slug}/api/customer/enderecos/padrao`}
      confirming={profile.addresses.some((address) => address.id === asking) ? (asking ?? null) : null}
      cancelHref={cards}
      hidden={{ retorno: cards, formulario: cards }}
      notice={addressNoticeOf(paramOf(query[ADDRESS_NOTICE_KEY]), messages)}
      error={code ? errorSentenceOf(errors, code) : null}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
