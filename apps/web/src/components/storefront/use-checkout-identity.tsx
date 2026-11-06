"use client"

// React
import { useMemo, type ReactNode } from "react"

// UI
import { StorefrontCheckoutIdentity } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout-identity"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { CHECKOUT_ANCHOR } from "./use-checkout-address-form"
import { pathWithCoupon } from "@/lib/cart-coupon"
import type { CheckoutIdentityState } from "@/lib/checkout-identity"
import { LEGAL_ROUTES } from "@/lib/legal-routes"

export interface CheckoutIdentityInput {
  slug: string
  /** Who is buying, as the cart's address left it; null where nobody is asked — a shopper or a visitor already identified. */
  identity: CheckoutIdentityState | null
  /** The cart's own address, as the shop spells it. */
  cartHref: string
  /** The coupon the summary shows: the way back carries it. */
  coupon: string | null
  /** Signing in and signing up, optional, each coming back to the cart with the coupon. */
  signInHref: string
  signUpHref: string
  messages: UiMessages
}

/** Where every visitor's form lands back: the checkout, with the coupon. */
export function checkoutBackOf(cartHref: string, coupon: string | null): string {
  return pathWithCoupon(`${cartHref}#${CHECKOUT_ANCHOR}`, coupon)
}

/**
 * A visitor's "who is buying" (plan 2026-11-06--P0-checkout-sem-codigo), posting to
 * `/[slug]/api/customer/checkout/identificar`, which opens their purchase session and lands back on the
 * checkout (`#finalizar`) with the coupon. Null where nobody is to be asked.
 */
export function useCheckoutIdentity({ slug, identity, cartHref, coupon, signInHref, signUpHref, messages }: CheckoutIdentityInput): ReactNode {
  return useMemo(() => {
    if (!identity) return null
    return (
      <StorefrontCheckoutIdentity
        email={identity.email}
        action={`/${slug}/api/customer/checkout/identificar`}
        hidden={{ retorno: checkoutBackOf(cartHref, coupon) }}
        hrefs={{ signIn: signInHref, signUp: signUpHref, terms: LEGAL_ROUTES.terms, privacy: LEGAL_ROUTES.privacy }}
        error={identity.error}
        // Inside the checkout's first step, which says "Seus dados" itself.
        headless
        linkComponent={AppLink}
        messages={messages}
      />
    )
  }, [slug, identity, cartHref, coupon, signInHref, signUpHref, messages])
}
