// Types
import type { CustomerAddress, CustomerProfile, CustomerPurchase } from "@harness-monorepo/contracts"

/** The visitor's address as the checkout lists it: no id of a record, which the order would send — the API takes the session's. */
export const PURCHASE_ADDRESS_ID = ""

const NO_ADDRESS: CustomerAddress = { zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null }

/**
 * A visitor's purchase session as the checkout reads a shopper (plan 2026-11-06--P0-checkout-sem-codigo):
 * only what they typed — a name, an e-mail, a WhatsApp, the address they gave — and nothing a record or an
 * account holds: no CPF (asked when a carrier or an online payment needs it), no credit, no history. The
 * checkout of a signed-in shopper then serves them unchanged.
 */
export function purchaseProfileOf(purchase: CustomerPurchase): CustomerProfile {
  return {
    id: "visitante",
    name: purchase.name,
    email: purchase.email,
    phone: purchase.phone,
    cpf: null,
    birthDate: null,
    address: purchase.address ?? NO_ADDRESS,
    addresses: purchase.address ? [{ id: PURCHASE_ADDRESS_ID, label: null, recipientName: null, ...purchase.address, isDefault: true }] : [],
    hasPassword: false,
    notifications: { orders: false, favorites: false, cashback: false, offers: false, offersChosenAt: null },
    cashback: { balanceCents: 0, pendingCents: 0 },
  }
}
