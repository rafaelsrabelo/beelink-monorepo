// App
import type { EventItem, StorefrontEvent } from "./storefront-event"

/**
 * A storefront event in Meta's words (BEELINK-272): its standard event names and object properties,
 * as https://developers.facebook.com/docs/meta-pixel/reference spells them. The one place those
 * words are written.
 */
export interface MetaPixelEvent {
  name: string
  params: MetaPixelParams
}

export interface MetaPixelParams {
  content_ids?: string[]
  content_type?: "product" | "product_group"
  contents?: { id: string; quantity: number }[]
  content_name?: string
  content_category?: string
  value?: number
  currency?: typeof CURRENCY
  num_items?: number
  search_string?: string
}

/** Every price in the product is in reais. */
const CURRENCY = "BRL"

/**
 * Ids are products' own, so `product`: a shelf, a search and a heart know no combination, and a
 * catalogue matches an event by one id across all of them. A feed that lists combinations instead
 * turns this into `product_group`, with the product's id as its `item_group_id`.
 */
const CONTENT_TYPE = "product"

/** Whole cents, as the product keeps money, into the decimal number of reais Meta reads a value as. */
export function reaisOf(cents: number): number {
  return cents / 100
}

function contentsOf(items: readonly Pick<EventItem, "productId" | "qty">[]): Pick<MetaPixelParams, "content_ids" | "content_type" | "contents"> {
  // One entry per product: two combinations of one product are one id, with their units added up.
  const units = new Map<string, number>()
  for (const item of items) units.set(item.productId, (units.get(item.productId) ?? 0) + item.qty)

  return {
    content_ids: [...units.keys()],
    content_type: CONTENT_TYPE,
    contents: [...units].map(([id, quantity]) => ({ id, quantity })),
  }
}

function valueOf(cents: number): Pick<MetaPixelParams, "value" | "currency"> {
  return { value: reaisOf(cents), currency: CURRENCY }
}

export function metaEventOf(event: StorefrontEvent): MetaPixelEvent {
  switch (event.name) {
    case "PageView":
      return { name: event.name, params: {} }
    case "ViewContent":
      return {
        name: event.name,
        params: {
          ...contentsOf([{ productId: event.product.id, qty: 1 }]),
          content_name: event.product.name,
          ...(event.product.category ? { content_category: event.product.category } : {}),
          ...valueOf(event.product.priceCents),
        },
      }
    case "Search":
      return { name: event.name, params: { search_string: event.term } }
    case "AddToWishlist":
      return {
        name: event.name,
        params: {
          ...contentsOf([{ productId: event.product.id, qty: 1 }]),
          ...(event.product.name ? { content_name: event.product.name } : {}),
          ...(event.product.priceCents !== undefined ? valueOf(event.product.priceCents) : {}),
        },
      }
    case "AddToCart":
      return {
        name: event.name,
        params: { ...contentsOf([event.item]), content_name: event.item.name, ...valueOf(event.item.unitPriceCents * event.item.qty) },
      }
    case "InitiateCheckout":
      return {
        name: event.name,
        params: { ...contentsOf(event.items), num_items: event.items.reduce((sum, item) => sum + item.qty, 0), ...valueOf(event.valueCents) },
      }
    case "AddPaymentInfo":
      return { name: event.name, params: { ...contentsOf(event.items), ...valueOf(event.valueCents) } }
  }
}
