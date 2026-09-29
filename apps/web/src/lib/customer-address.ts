// Types
import type { CustomerAddress, CustomerProfile } from "@harness-monorepo/contracts"

/**
 * A delivery address on one line, as a shopkeeper reads it on WhatsApp: "Av. Paulista, 1000, apto 12
 * — Bela Vista — São Paulo/SP — CEP 01310-930". Only the parts on file; nothing on file is null.
 */
export function addressLineOf(address: CustomerAddress): string | null {
  const street = [address.street, address.number, address.complement].filter(Boolean).join(", ")
  const place = [address.city, address.state].filter(Boolean).join("/")
  const parts = [street, address.neighborhood, place, address.zipCode ? `CEP ${zipCodeOf(address.zipCode)}` : null].filter(Boolean)

  return parts.length ? parts.join(" — ") : null
}

/** A CEP as a person writes it, "60323-231", from the eight digits a record may keep bare; anything else as it is. */
export function zipCodeOf(zipCode: string | null): string | null {
  const digits = zipCode?.replace(/\D/g, "") ?? ""
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : zipCode
}

/** Where an order goes, short enough for one line under its status: "Av. Paulista, 1000, apto 12 — São Paulo/SP". */
export function addressShortOf(address: CustomerAddress): string | null {
  const street = [address.street, address.number, address.complement].filter(Boolean).join(", ")
  const place = [address.city, address.state].filter(Boolean).join("/")
  const parts = [street, place].filter(Boolean)

  return parts.length ? parts.join(" — ") : null
}

/** Whether there is somewhere to deliver: a street and a city — the rule the API places an order by. */
export function isDeliverable(address: Pick<CustomerAddress, "street" | "city">): boolean {
  return Boolean(address.street?.trim() && address.city?.trim())
}

/** Whether the shop can reach the shopper and deliver: a phone, and a saved address with a street and a city. */
export function isReachable(profile: Pick<CustomerProfile, "phone" | "addresses">): boolean {
  return Boolean(profile.phone) && profile.addresses.some(isDeliverable)
}
