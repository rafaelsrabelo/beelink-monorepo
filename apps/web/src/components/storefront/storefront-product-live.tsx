"use client"

// Types
import type { PaymentMethod, PublicCashback, PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { StorefrontProductDetail } from "@harness-monorepo/ui/blocks/storefront/storefront-product"
import { PRODUCT_REVIEWS_ID } from "@harness-monorepo/ui/blocks/storefront/storefront-product-reviews"
import { StorefrontRating } from "@harness-monorepo/ui/blocks/storefront/storefront-rating"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { productCashbackRuleOf } from "@/lib/product-cashback"
import { StorefrontFavoriteLive } from "./favorites/storefront-favorite-live"
import { useTrackView } from "./tracking/use-track"
import { useAddToCart } from "./use-add-to-cart"
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
  /** The shop over the title: "Visite a loja …", to its front door. */
  shopName: string
  homeHref: string
  product: PublicProductDetail
  /** The combination the address asked for, read on the server so the page opens on it. */
  initialVariantId: string | null
  orderHref?: string
  /** The cart's address, for "Comprar agora" and "Ver carrinho". */
  cartHref: string
  showPrice: boolean
  showBadge: boolean
  /** The rating line under the title, when the product has reviews; the shop may hide it. */
  showRating?: boolean
  /** The layout's "Em estoque" switch. */
  showStock: boolean
  /** The shop takes orders on WhatsApp, which the buy box says. */
  finishesOnWhatsApp: boolean
  /** Who sells it, and the shop's cashback while on (BEELINK-243): the box is told what this product earns at (BEELINK-313). */
  seller: { name: string; paymentMethods: readonly PaymentMethod[]; cashback: PublicCashback | null }
  restockCopy: RestockCopy
  messages: UiMessages
}

/** What one unit costs: the combination chosen, or the only one of a product without options — as the cart prices its line. */
function priceOf(product: PublicProductDetail, variantId: string | null): number {
  return product.variants.find((variant) => (variantId ? variant.id === variantId : product.variants.length === 1))?.priceCents ?? product.priceCents
}

/**
 * The product block, choosing and asking for real.
 *
 * The block draws; this keeps the address in step with the choice, puts the choice in the cart and
 * sends the "Avise-me", because a design-system block may not reach the network, the history or
 * the cart.
 *
 * It is also where the product is told as seen (BEELINK-272): once per product, whichever combination
 * the address opens on — an event names the product, never a combination.
 */
export function StorefrontProductLive({
  slug,
  shopName,
  homeHref,
  product,
  initialVariantId,
  orderHref,
  cartHref,
  showPrice,
  showBadge,
  showRating = true,
  showStock,
  finishesOnWhatsApp,
  seller,
  restockCopy,
  messages,
}: StorefrontProductLiveProps) {
  const restock = useRestockRequest(slug)
  const add = useAddToCart()
  useTrackView({ name: "ViewContent", product: { id: product.id, name: product.name, priceCents: product.priceCents, category: product.category?.name ?? null } }, product.id)
  // A request that never reached the API — offline, a dropped connection — has no code, and is still a
  // failure the visitor must be told about.
  const code = restock.error ? ("errorCode" in restock.error ? String(restock.error.errorCode) : "UNKNOWN") : null

  return (
    <StorefrontProductDetail
      shopName={shopName}
      homeHref={homeHref}
      name={product.name}
      description={product.description}
      priceCents={product.priceCents}
      compareAtPriceCents={product.compareAtPriceCents}
      promotionName={product.promotionName}
      images={product.images}
      orderHref={orderHref}
      cart={{ onAdd: (variantId, qty) => add({ productId: product.id, variantId, qty }, { name: product.name, unitPriceCents: priceOf(product, variantId) }), href: cartHref }}
      rating={
        showRating && product.rating ? (
          <StorefrontRating average={product.rating.average} count={product.rating.count} reviewsHref={`#${PRODUCT_REVIEWS_ID}`} locale="pt-BR" size="product" linkComponent={AppLink} messages={messages} />
        ) : undefined
      }
      favorite={(variantId, look) => <StorefrontFavoriteLive productId={product.id} productName={product.name} priceCents={product.priceCents} variantId={variantId} look={look} messages={messages} />}
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
      showStock={showStock}
      finishesOnWhatsApp={finishesOnWhatsApp}
      seller={{ ...seller, cashback: productCashbackRuleOf(seller.cashback, product) }}
      messages={messages}
    />
  )
}
