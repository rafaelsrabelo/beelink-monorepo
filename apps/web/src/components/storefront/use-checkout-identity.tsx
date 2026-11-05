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
  /** Who is buying, as the cart's address left it; null where nobody is asked — a signed-in shopper. */
  identity: CheckoutIdentityState | null
  /** The cart's own address, as the shop spells it. */
  cartHref: string
  /** The coupon the summary shows: every way back carries it. */
  coupon: string | null
  /** Signing in and signing up with a password, each coming back to the cart with the coupon. */
  signInHref: string
  signUpHref: string
  messages: UiMessages
}

/**
 * The checkout's "who is buying" for a visitor (plan 2026-11-05--compra-sem-cadastro), posting to
 * `/[slug]/api/customer/checkout/<step>`, every answer landing back on the checkout (`#finalizar`)
 * with the coupon. Null for a signed-in shopper, who has nothing to say about themselves here.
 */
export function useCheckoutIdentity({ slug, identity, cartHref, coupon, signInHref, signUpHref, messages }: CheckoutIdentityInput): ReactNode {
  return useMemo(() => {
    if (!identity) return null
    const back = pathWithCoupon(`${cartHref}#${CHECKOUT_ANCHOR}`, coupon)
    const door = `/${slug}/api/customer/checkout`
    return (
      <StorefrontCheckoutIdentity
        step={identity.step}
        email={identity.email}
        actions={{ identify: `${door}/identificar`, code: `${door}/codigo`, resend: `${door}/reenviar` }}
        hidden={{ retorno: back }}
        otherEmailHref={back}
        hrefs={{ signIn: signInHref, signUp: signUpHref, terms: LEGAL_ROUTES.terms, privacy: LEGAL_ROUTES.privacy }}
        error={identity.error}
        notice={identity.notice}
        linkComponent={AppLink}
        messages={messages}
      />
    )
  }, [slug, identity, cartHref, coupon, signInHref, signUpHref, messages])
}
