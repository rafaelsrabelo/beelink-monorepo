// Types
import type { ComponentKind, StoreType } from "@harness-monorepo/contracts"

// UI
import { SECTION_TYPES } from "@harness-monorepo/ui/lib/section-registry"

const KINDS = Object.keys(SECTION_TYPES) as ComponentKind[]

/**
 * What the gallery never offers on this page: what this kind of shop cannot hold — a site sells
 * nothing, so nothing filed under "Produtos e venda"; a store takes its leads through the cart, not
 * a form — and, on a landing, the strip at all: it is the home's, drawn on every page that uses the
 * header. The strip a page already has is `takenKindsOf`'s, not this.
 */
export function unavailableKindsOf(storeType: StoreType, landing: boolean): ComponentKind[] {
  const cannotHold = storeType === "INSTITUTIONAL" ? KINDS.filter((kind) => SECTION_TYPES[kind].category === "SELLING") : (["CONTACT"] as const)
  return [...cannotHold, ...(landing ? (["ANNOUNCEMENT"] as const) : [])]
}

/**
 * Whether what a kind draws is resolved on the server — a showcase's products, a featured product's
 * card — so a new or saved one sends the page for it, and the preview draws the server's answer.
 */
export function resolvedOnServer(kind: ComponentKind): boolean {
  return kind === "PRODUCTS" || kind === "FEATURED_PRODUCT"
}

/**
 * Whether a kind's fields read the shop's categories and products: a banner, the strip and a block's
 * button point at one; a showcase draws from one or picks them; the categories block counts them, to
 * say why it draws nothing.
 */
export function readsCatalog(kind: ComponentKind): boolean {
  return (
    kind === "BANNER" ||
    kind === "ANNOUNCEMENT" ||
    kind === "CALL_TO_ACTION" ||
    kind === "IMAGE_TEXT" ||
    kind === "PRODUCTS" ||
    kind === "FEATURED_PRODUCT" ||
    kind === "CATEGORIES"
  )
}
