// Types
import type { PublicProductDetail, PublicProductVariant } from "@harness-monorepo/contracts"

// UI
import { plainTextOf } from "@harness-monorepo/ui/lib/markdown"
import { optionOfValue, photosOf } from "@harness-monorepo/ui/lib/photo-choice"

/**
 * What a search result and a link preview say of one product, from the product alone — apart from
 * its page so each rule can be tested without drawing one.
 */

/** Cut where a search result cuts, on a word, so the tail is never half a sentence. */
const DESCRIPTION_MAX_LENGTH = 160

/**
 * The words alone: the description is Markdown at rest, and a search result showing `**` is a
 * search result nobody clicks.
 */
export function sharedDescriptionOf(markdown: string | null): string | undefined {
  if (!markdown) return undefined
  const text = plainTextOf(markdown)
  if (text.length <= DESCRIPTION_MAX_LENGTH) return text || undefined
  return `${text.slice(0, DESCRIPTION_MAX_LENGTH).replace(/\s+\S*$/, "")}…`
}

/** The combination the address asked for, when the product has it. */
export function sharedVariantOf(product: PublicProductDetail, asked: string | string[] | undefined): PublicProductVariant | null {
  return (typeof asked === "string" ? product.variants.find((entry) => entry.id === asked) : null) ?? null
}

/** The chosen combination's own photo, or the most specific one tagged for it, or the first. */
export function sharedPhotoOf(product: PublicProductDetail, chosen: PublicProductVariant | null): string | undefined {
  if (!chosen) return product.images[0]?.url
  if (chosen.imageUrl) return chosen.imageUrl
  const optionOf = optionOfValue(product.options, (option) => option.values, (value) => value.id)
  return photosOf(product.images, optionOf, chosen.optionValueIds)[0]?.url ?? product.images[0]?.url
}

/**
 * The product's address as a link preview is told it: with the combination the address chose.
 *
 * The canonical leaves it out, and a preview's address must not. Meta's readers — Facebook,
 * Messenger, Instagram — fetch the card from the address the page declares rather than from the one
 * that was shared, so without it a link to "Uva · 300 g" would show the first photo again.
 */
export function sharedAddressOf(address: string, chosen: PublicProductVariant | null): string {
  return chosen ? `${address}?variant=${encodeURIComponent(chosen.id)}` : address
}
