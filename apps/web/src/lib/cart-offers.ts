// Types
import type { CustomerOffers, CustomerOffersPayload } from "@harness-monorepo/contracts"

/**
 * The cart a shopper's offers are asked about: the question their quote is asked, without the code
 * typed or their credit — neither changes which coupons the cart may take. Named field by field,
 * since the API's door refuses a body that carries anything else; and in one order, so the page
 * that served the first answer and the browser that follows it ask the same question.
 */
export function offersCartOf(cart: CustomerOffersPayload): CustomerOffersPayload {
  return {
    ...(cart.items?.length ? { items: cart.items } : {}),
    ...(cart.fulfillment ? { fulfillment: cart.fulfillment } : {}),
    ...(cart.addressId ? { addressId: cart.addressId } : {}),
    ...(cart.shipping ? { shipping: cart.shipping } : {}),
  }
}

/** Whether two questions are the same one. Both come from `offersCartOf`, so their fields are in one order. */
export function sameOffersCart(one: CustomerOffersPayload, other: CustomerOffersPayload): boolean {
  return JSON.stringify(one) === JSON.stringify(other)
}

/** A shopper's offers as the page was served with them, and the cart they were read against: the browser starts from them. */
export interface ServedOffers {
  shopperId: string
  cart: CustomerOffersPayload
  offers: CustomerOffers
  /** When they were read, in epoch milliseconds: they age from then. */
  at: number
}
