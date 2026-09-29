// Types
import type { CustomerProfile, CustomerSavedAddress } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutAddress } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { addressLineOf, isDeliverable, zipCodeOf } from "./customer-address"

/** The profile tab's query: the address form open, `novo` or a saved address's id. */
export const ADDRESS_KEY = "endereco"
export const NEW_ADDRESS = "novo"
/** What the last change to the addresses came back with (`AddressNotice`). */
export const ADDRESS_NOTICE_KEY = "aviso"
/** A refused change to the addresses, as its code; apart from `erro`, which is the details form's. */
export const ADDRESS_ERROR_KEY = "erro-endereco"
/** The cart's query: an address just saved on the way from it, to deliver to. */
export const DELIVER_TO_KEY = "entregar"
/** The most a shopper keeps: the API's own cap, said before a save it would refuse. */
export const ADDRESSES_MAX = 10

export type AddressNotice = "endereco-salvo" | "endereco-removido" | "endereco-padrao"

/** The sentence for what the last change came back with; null for no change, or a word it does not know. */
export function addressNoticeOf(raw: string | undefined, messages: UiMessages): string | null {
  const text = messages.storefront
  const said: Record<AddressNotice, string> = {
    "endereco-salvo": text.addressesSaved,
    "endereco-removido": text.addressesRemoved,
    "endereco-padrao": text.addressesDefaultSet,
  }
  return raw && raw in said ? said[raw as AddressNotice] : null
}

/** "Casa · Rafael Souza": the name the shopper gave it and who receives there; who receives alone, without a name. */
export function savedAddressHeadingOf(address: Pick<CustomerSavedAddress, "label" | "recipientName">, shopperName: string): string {
  const recipient = address.recipientName ?? shopperName
  return address.label ? `${address.label} · ${recipient}` : recipient
}

/** A card's lines, as 6h draws them: the street with its number and complement, the neighbourhood with the city, the CEP. */
export function savedAddressLinesOf(address: CustomerSavedAddress): string[] {
  const street = [address.street, address.number, address.complement].filter(Boolean).join(", ")
  const place = [address.city, address.state].filter(Boolean).join("/")
  const area = [address.neighborhood, place].filter(Boolean).join(", ")
  return [street, area, zipCodeOf(address.zipCode) ?? ""].filter(Boolean)
}

/** A CEP's eight digits, as the header's "Entregar em" keeps one; null for anything that is not a CEP. */
export function cepDigitsOf(zipCode: string | null | undefined): string | null {
  const digits = zipCode?.replace(/\D/g, "") ?? ""
  return digits.length === 8 ? digits : null
}

/** The saved addresses a delivery can go to — a street and a city, the API's rule — as the cart offers them, the default first. */
export function checkoutAddressesOf(shopper: Pick<CustomerProfile, "name" | "addresses">): StorefrontCheckoutAddress[] {
  return shopper.addresses
    .filter(isDeliverable)
    .map((address) => ({ id: address.id, heading: savedAddressHeadingOf(address, shopper.name), line: addressLineOf(address) ?? "" }))
}
