"use client"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { StorefrontProductDetail } from "@harness-monorepo/ui/blocks/storefront/storefront-product"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"
import { useRestockRequest } from "@/services/storefront/storefront-hooks"

/** The refusals a visitor can meet asking for a restock, as sentences picked on the server. */
export interface RestockCopy {
  RESTOCK_VARIANT_INVALID: string
  BAD_REQUEST: string
  RATE_LIMITED: string
  UNKNOWN: string
}

export interface StorefrontProductLiveProps {
  slug: string
  product: PublicProductDetail
  /** The combination the address asked for, read on the server so the page opens on it. */
  initialVariantId: string | null
  orderHref?: string
  /** The cart's address, for "Comprar agora" and "Ver carrinho". */
  cartHref: string
  showPrice: boolean
  showBadge: boolean
  restockCopy: RestockCopy
  messages: UiMessages
}

/**
 * The product block, choosing and asking for real.
 *
 * The block draws; this keeps the address in step with the choice, puts the choice in the cart and
 * sends the "Avise-me", because a design-system block may not reach the network, the history or
 * the cart.
 */
export function StorefrontProductLive({
  slug,
  product,
  initialVariantId,
  orderHref,
  cartHref,
  showPrice,
  showBadge,
  restockCopy,
  messages,
}: StorefrontProductLiveProps) {
  const restock = useRestockRequest(slug)
  const add = useCart((cart) => cart.add)
  // A request that never reached the API — offline, a dropped connection — has no code, and is still a
  // failure the visitor must be told about.
  const code = restock.error ? ("errorCode" in restock.error ? String(restock.error.errorCode) : "UNKNOWN") : null

  return (
    <StorefrontProductDetail
      name={product.name}
      description={product.description}
      priceCents={product.priceCents}
      compareAtPriceCents={product.compareAtPriceCents}
      images={product.images}
      orderHref={orderHref}
      cart={{ onAdd: (variantId, qty) => add({ productId: product.id, variantId, qty }), href: cartHref }}
      soldOut={product.soldOut}
      options={product.options}
      variants={product.variants}
      initialVariantId={initialVariantId}
      onVariantChange={(variantId) => {
        // Replaced, not pushed: choosing a size is not a page the back button should step through.
        const url = new URL(window.location.href)
        url.searchParams.set("variant", variantId)
        window.history.replaceState(window.history.state, "", url)
      }}
      restock={{
        status: restock.isSuccess ? "sent" : restock.isPending ? "sending" : "idle",
        error: code ? (restockCopy[code as keyof RestockCopy] ?? restockCopy.UNKNOWN) : null,
        phoneInvalid: code === "BAD_REQUEST",
        onSubmit: (variantId, submission) =>
          restock.mutate({
            productId: product.id,
            payload: {
              variantId,
              phone: submission.phone,
              name: submission.name || null,
              ...(submission.website ? { website: submission.website } : {}),
            },
          }),
        onReset: () => restock.reset(),
      }}
      locale="pt-BR"
      showPrice={showPrice}
      showBadge={showBadge}
      messages={messages}
    />
  )
}
