/**
 * bee-link's picture for a product that has none of its own — one for every shop.
 *
 * It is the web app's file (apps/web/public/brand), named by its address and never stored on a
 * product: a product with no photo has an empty gallery, and the first photo the shopkeeper adds
 * takes this one's place everywhere at once. Storybook serves the same folder, so a story draws
 * what the shop window does.
 */
export const PRODUCT_PLACEHOLDER_SRC = "/brand/product-placeholder.jpg"

/** A product's picture, or bee-link's when it has none. */
export function productImageOf(url: string | null | undefined): string {
  return url ? url : PRODUCT_PLACEHOLDER_SRC
}
