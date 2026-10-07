"use client"

// Libs
import { skipToken, useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type {
  CreateRestockRequestPayload,
  CustomerOffers,
  CustomerOffersPayload,
  CustomerOrder,
  CustomerOrderQuotePayload,
  OrderQuote,
  PlaceCustomerOrderPayload,
  PublicProductCard,
} from "@harness-monorepo/contracts"

// App
import { sameOffersCart, type ServedOffers } from "@/lib/cart-offers"
import { sameCart, type ServedQuote } from "@/lib/cart-pricing"
import { cancelShopperOrder, fetchCustomerOffers, placeShopperOrder, quoteCart, searchStorefront, sendRestockRequest } from "./storefront-requests"

/** Below this a shop answers with most of itself, and every keystroke would be a request. */
const MIN_QUERY_LENGTH = 2

/** Long enough for a word to finish, short enough that the list does not feel late. */
const DEBOUNCE_MS = 250

/**
 * How long a price is trusted without asking again. A promotion starts or ends with no write to tell
 * the page, so a cart left open is priced again when the shopper comes back to it.
 */
const QUOTE_STALE_MS = 30 * 1000

export const storefrontKeys = {
  all: ["storefront"] as const,
  search: (slug: string, term: string, scope: string) => [...storefrontKeys.all, slug, "search", scope, term] as const,
  quotes: (slug: string) => [...storefrontKeys.all, slug, "quote"] as const,
  /** Who asks is part of the question (BEELINK-245): a first-purchase promotion prices one cart differently for each. */
  quote: (slug: string, shopperId: string | null, cart: CustomerOrderQuotePayload | null) => [...storefrontKeys.quotes(slug), shopperId, cart] as const,
  /** A shopper's offers for one cart: theirs alone, so who asks is part of the key. */
  offers: (slug: string, shopperId: string | null, cart: CustomerOffersPayload) => [...storefrontKeys.all, slug, "offers", shopperId, cart] as const,
}

export interface StorefrontSearchHandle {
  products: PublicProductCard[]
  total: number
  pending: boolean
}

/**
 * The same term typed, deleted and typed again is one request, because the answer is cached under
 * it — which is what makes this a query rather than something the component re-runs by hand.
 */
export function useStorefrontSearch(slug: string, term: string, scope = ""): StorefrontSearchHandle {
  const trimmed = term.trim()
  const enabled = trimmed.length >= MIN_QUERY_LENGTH

  const search = useQuery({
    // The scope is part of the key: "whey" in every category and "whey" in one are two lists.
    queryKey: storefrontKeys.search(slug, trimmed, scope),
    queryFn: () => searchStorefront(slug, trimmed, scope),
    enabled,
    // A shop's catalogue does not change while someone is typing into it, and re-running on a
    // window focus would spend a request to replace a list with itself.
    staleTime: 5 * 60 * 1000,
  })

  return {
    products: search.data?.products ?? [],
    total: search.data?.total ?? 0,
    // `isFetching` and not `isPending`: a disabled query is pending for ever, which would leave a
    // spinner under the field from the moment it renders.
    pending: enabled && search.isFetching,
  }
}

export { DEBOUNCE_MS, MIN_QUERY_LENGTH }

export interface RestockVariables {
  productId: string
  payload: CreateRestockRequestPayload
}

/** "Avise-me". Nothing is cached from it: a request is not on the shop window. */
export function useRestockRequest(slug: string): UseMutationResult<void, Error, RestockVariables> {
  return useMutation({
    mutationFn: ({ productId, payload }: RestockVariables) => sendRestockRequest(slug, productId, payload),
  })
}

/**
 * The cart's price, following the cart (BEELINK-194). It starts from the price the page was served
 * with when that answers this very cart, so the first paint asks nothing. A changed cart keeps the
 * last price on screen while the new one is asked, rather than drop the summary to a skeleton at
 * every press of "+".
 *
 * The page is served before any coupon is checked. A cart that arrives with one kept shows the
 * served price — the same cart, without the coupon — until the answer with it lands.
 *
 * A price is the asker's (BEELINK-245): `shopperId` is the signed-in shopper, null a visitor. Neither
 * the served price nor the one kept from the last question stands in for another asker's — the
 * session can end under an open page, and the page is read again as a visitor's.
 *
 * Not retried: a refusal — a line the shop stopped selling, too many tries — is not a blip, and the
 * next change of the cart asks again anyway.
 */
export function useCartQuote(slug: string, shopperId: string | null, cart: CustomerOrderQuotePayload, served: ServedQuote | null): UseQueryResult<OrderQuote, Error> {
  const mine = served?.shopperId === shopperId ? served : null
  // In `cartQuoteOf`'s own order, which is what makes two questions comparable.
  const servedWithoutCoupon = mine && sameCart(mine.cart, { items: cart.items, fulfillment: cart.fulfillment, ...(cart.addressId ? { addressId: cart.addressId } : {}), ...(cart.shipping ? { shipping: cart.shipping } : {}) }) ? mine.quote : undefined

  return useQuery({
    queryKey: storefrontKeys.quote(slug, shopperId, cart),
    queryFn: () => quoteCart(slug, cart),
    enabled: cart.items.length > 0,
    initialData: () => (mine && sameCart(mine.cart, cart) ? mine.quote : undefined),
    initialDataUpdatedAt: mine?.at,
    // The last price stays on screen while the next is asked only for whoever asked it: `queryKey[3]` is the asker.
    placeholderData: (previous: OrderQuote | undefined, last) => (last?.queryKey[3] === shopperId ? previous : undefined) ?? servedWithoutCoupon,
    staleTime: QUOTE_STALE_MS,
    retry: false,
  })
}

/**
 * The signed-in shopper's offers for the cart on screen: the shop's shown coupons it may take, as the
 * API lists them. Asked only of a shopper with something in the cart — a visitor is told of no code.
 *
 * It starts from what the page was served with, when that answers this very cart for this very
 * shopper, and keeps the last list on screen while the next is asked: a list that emptied and
 * filled again at every press of "+" would be a summary that jumps.
 */
export function useCustomerOffers(slug: string, shopperId: string | null, cart: CustomerOffersPayload, served: ServedOffers | null): UseQueryResult<CustomerOffers, Error> {
  const mine = served && served.shopperId === shopperId ? served : null

  return useQuery({
    queryKey: storefrontKeys.offers(slug, shopperId, cart),
    queryFn: () => fetchCustomerOffers(slug, cart),
    enabled: shopperId !== null && (cart.items?.length ?? 0) > 0,
    initialData: () => (mine && sameOffersCart(mine.cart, cart) ? mine.offers : undefined),
    initialDataUpdatedAt: mine?.at,
    // Only for whoever asked it: `queryKey[3]` is the asker.
    placeholderData: (previous: CustomerOffers | undefined, last) => (last?.queryKey[3] === shopperId ? previous : undefined) ?? mine?.offers,
    staleTime: QUOTE_STALE_MS,
    retry: false,
  })
}

/**
 * A price already in hand, read back by the question it answered and never asked again: what a
 * coupon was refused with, kept on screen after the cart stopped asking about it. The answer stays
 * the cache's — a copy of it in a component's state would be a second source for one fact.
 */
export function useAnsweredCartQuote(slug: string, shopperId: string | null, cart: CustomerOrderQuotePayload | null): OrderQuote | undefined {
  return useQuery<OrderQuote>({ queryKey: storefrontKeys.quote(slug, shopperId, cart), queryFn: skipToken, staleTime: Infinity }).data
}

/**
 * The cart's order. Nothing cached is dropped: the cart page reads its products fresh on every
 * visit, and the shopper's orders are not on the shop window.
 */
export function usePlaceShopperOrder(slug: string): UseMutationResult<CustomerOrder, Error, PlaceCustomerOrderPayload> {
  return useMutation({ mutationFn: (payload: PlaceCustomerOrderPayload) => placeShopperOrder(slug, payload) })
}

/** The shopper's cancel. The list is server-drawn, so the page is read again once it settles. */
export function useCancelShopperOrder(slug: string): UseMutationResult<CustomerOrder, Error, number> {
  return useMutation({ mutationFn: (number: number) => cancelShopperOrder(slug, number) })
}
