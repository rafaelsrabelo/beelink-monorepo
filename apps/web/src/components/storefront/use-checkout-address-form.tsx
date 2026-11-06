"use client"

// React
import { useMemo } from "react"

// Types
import type { CustomerProfile } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutAddressForm } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontAddressEditor } from "./storefront-address-editor"
import { pathWithCoupon } from "@/lib/cart-coupon"
import { ADDRESSES_MAX, BLANK_ADDRESS, DELIVER_TO_KEY } from "@/lib/saved-address"

/** The checkout's steps: a way back to the checkout lands on them, not on the page's top, over the summary and the coupon. */
export const CHECKOUT_ANCHOR = "finalizar"

export interface CheckoutAddressFormInput {
  slug: string
  shopper: Pick<CustomerProfile, "name" | "addresses"> | null
  /** The checkout's own address, as the shop spells it. */
  checkoutHref: string
  /** The coupon the summary shows as applied: the way back carries it, or it would go missing on the way. */
  coupon: string | null
  /** Why the address last sent from here was refused, already a sentence; null with none. */
  error: string | null
  /**
   * A visitor's purchase session (plan 2026-11-06--P0-checkout-sem-codigo): their one address is kept on
   * the session, not saved on a record, so the form posts to the checkout's own handler and replaces it.
   */
  visitor?: boolean
  messages: UiMessages
}

/**
 * The address form the checkout opens in place, posting to the same handler as the profile tab's
 * (`/[slug]/api/customer/enderecos/salvar`): saved, it lands back on the checkout with the address
 * chosen to deliver to (`entregar`); refused, back on the checkout too, which opens it again with
 * the sentence. Null where a form here could not be saved — nobody signed in, or the addresses
 * already at the API's cap — and the checkout keeps its link to the profile tab, which says so.
 */
export function useCheckoutAddressForm({ slug, shopper, checkoutHref, coupon, error, visitor = false, messages }: CheckoutAddressFormInput): StorefrontCheckoutAddressForm | null {
  const name = shopper?.name ?? null
  const full = !visitor && (shopper?.addresses.length ?? 0) >= ADDRESSES_MAX

  return useMemo(() => {
    if (name === null || full) return null
    const back = pathWithCoupon(`${checkoutHref}#${CHECKOUT_ANCHOR}`, coupon)
    return {
      startOpen: error !== null,
      draw: ({ autoFocus, onCancel }) => (
        <StorefrontAddressEditor
          slug={slug}
          address={BLANK_ADDRESS}
          shopperName={name}
          action={visitor ? `/${slug}/api/customer/checkout/endereco` : `/${slug}/api/customer/enderecos/salvar`}
          hidden={visitor ? { retorno: back } : { retorno: back, formulario: back, [DELIVER_TO_KEY]: "1" }}
          compact
          autoFocus={autoFocus}
          {...(onCancel ? { onCancel } : {})}
          offerDefault={false}
          error={error}
          messages={messages}
        />
      ),
    } satisfies StorefrontCheckoutAddressForm
  }, [slug, name, full, visitor, checkoutHref, coupon, error, messages])
}
