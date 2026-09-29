// UI
import { StorefrontAddressCards } from "@harness-monorepo/ui/blocks/storefront/storefront-address-cards"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import {
  ADDRESS_ERROR_KEY,
  ADDRESS_KEY,
  ADDRESS_NOTICE_KEY,
  ADDRESSES_MAX,
  NEW_ADDRESS,
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

/** The shopper's saved addresses under their details, as 6h draws them, and what the last change came back with. */
export function StorefrontAddressesSection({ slug, accountHref, profile, query, errors, messages }: StorefrontAddressesSectionProps) {
  const code = paramOf(query[ADDRESS_ERROR_KEY])
  const formOf = (id: string) => `${accountHref}?${new URLSearchParams({ [ADDRESS_KEY]: id }).toString()}`

  return (
    <StorefrontAddressCards
      addresses={profile.addresses.map((address) => ({
        id: address.id,
        heading: savedAddressHeadingOf(address, profile.name),
        lines: savedAddressLinesOf(address),
        isDefault: address.isDefault,
        editHref: formOf(address.id),
      }))}
      addHref={profile.addresses.length < ADDRESSES_MAX ? formOf(NEW_ADDRESS) : null}
      limit={ADDRESSES_MAX}
      removeAction={`/${slug}/api/customer/enderecos/remover`}
      defaultAction={`/${slug}/api/customer/enderecos/padrao`}
      hidden={{ retorno: accountHref, formulario: accountHref }}
      notice={addressNoticeOf(paramOf(query[ADDRESS_NOTICE_KEY]), messages)}
      error={code ? (errors[code as keyof WebMessages["errors"]] ?? errors.UNKNOWN) : null}
      messages={messages}
    />
  )
}
