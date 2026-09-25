// Types
import type { CustomerAddress, CustomerProfile } from "@harness-monorepo/contracts"

/**
 * A delivery address on one line, as a shopkeeper reads it on WhatsApp: "Av. Paulista, 1000, apto 12
 * — Bela Vista — São Paulo/SP — CEP 01310-930". Only the parts on file; nothing on file is null.
 */
export function addressLineOf(address: CustomerAddress): string | null {
  const street = [address.street, address.number, address.complement].filter(Boolean).join(", ")
  const place = [address.city, address.state].filter(Boolean).join("/")
  const parts = [street, address.neighborhood, place, address.zipCode ? `CEP ${address.zipCode}` : null].filter(Boolean)

  return parts.length ? parts.join(" — ") : null
}

/** Whether the shop can reach the shopper and deliver: a phone, and a street with a city. */
export function isReachable(profile: Pick<CustomerProfile, "phone" | "address">): boolean {
  return Boolean(profile.phone && profile.address.street && profile.address.city)
}
