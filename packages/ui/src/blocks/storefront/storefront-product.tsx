"use client"

// React
import { useState } from "react"

// UI
import { optionOfValue, photosOf } from "@harness-monorepo/ui/lib/photo-choice"
import {
  initialVariantOf,
  ORDER_VARIANT_MARK,
  selectionOf,
  targetOf,
  variantLabelOf,
  variantOf,
  type ChoiceOption,
  type ChoiceVariant,
  type Selection,
} from "@harness-monorepo/ui/lib/variant-choice"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { WhatsAppIcon } from "../store/store-brand-icons"
import { StorefrontPrice } from "./storefront-price"
import { StorefrontProductGallery, type StorefrontProductImage } from "./storefront-product-gallery"
import { StorefrontRestockDialog, type RestockSubmission } from "./storefront-restock-dialog"
import type { LinkComponent } from "../auth/auth-link"
import { StorefrontBuyActions } from "./storefront-buy-actions"
import { StorefrontProductBuy } from "./storefront-product-buy"
import { StorefrontProductInfo } from "./storefront-product-info"
import { StorefrontVariantPicker } from "./storefront-variant-picker"

export type { StorefrontProductImage } from "./storefront-product-gallery"

export interface StorefrontProductDetailProps {
  /** The shop, over the title: "Visite a loja …" leads to its front door. */
  shopName: string
  homeHref: string
  name: string
  /**
   * The product's Markdown. The info column draws its first bulleted list as "Sobre este item"; the
   * page draws the rest in its own section (`#descricao`).
   */
  description: string | null
  priceCents: number
  compareAtPriceCents: number | null
  images: readonly StorefrontProductImage[]
  /** `wa.me/<digits>?text=…`, built by the screen, with `ORDER_VARIANT_MARK` where the combination goes. */
  orderHref?: string
  /**
   * The shop counts this product and has none left. The page still answers — its address goes out
   * on WhatsApp — and what goes away is the way to order.
   */
  soldOut?: boolean
  /** The product's options and the combinations it sells. Absent or empty, a product with no choice. */
  options?: readonly ChoiceOption[]
  variants?: readonly ChoiceVariant[]
  /** The combination the address asked for (`?variant=`). */
  initialVariantId?: string | null
  /** Told each choice, so the screen can keep the address in step. */
  onVariantChange?: (variantId: string) => void
  /**
   * Puts the chosen combination in the cart — null for a product without options — with the cart's
   * address for "Comprar agora". Absent, the page offers the WhatsApp order alone.
   */
  cart?: { onAdd: (variantId: string | null, qty: number) => void; href: string }
  /** "Avise-me" for a sold-out combination; absent, the page offers none. */
  restock?: {
    onSubmit: (variantId: string, submission: RestockSubmission) => void
    status: "idle" | "sending" | "sent"
    error?: string | null
    phoneInvalid?: boolean
    /** Called as the dialog closes, so the next one starts clean. */
    onReset?: () => void
  }
  locale: string
  showPrice?: boolean
  showBadge?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One product's page as 5b lays it out — photos, information and choice, the buy box — and the
 * combination chosen on it.
 *
 * The choice drives what the page says: the price, the photo, whether it can be ordered and what
 * the order message names. A combination that ran out keeps its place and offers "Avise-me" instead
 * of the order button.
 */
export function StorefrontProductDetail({
  shopName,
  homeHref,
  name,
  description,
  priceCents,
  compareAtPriceCents,
  images,
  orderHref,
  soldOut = false,
  options = [],
  variants = [],
  initialVariantId,
  onVariantChange,
  cart,
  restock,
  locale,
  showPrice = true,
  showBadge = true,
  linkComponent,
  messages = defaultMessages,
}: StorefrontProductDetailProps) {
  const text = messages.storefront
  const choosing = options.length > 0 && variants.length > 0
  const [selection, setSelection] = useState<Selection>(() => {
    const first = initialVariantOf(variants, initialVariantId)
    return first && choosing ? selectionOf(first, options) : {}
  })
  const [asking, setAsking] = useState(false)

  const variant = choosing ? variantOf(selection, options, variants) : undefined
  const label = variant ? variantLabelOf(variant, options) : ""
  const unavailable = choosing ? !variant?.available : soldOut
  // The chosen combination's photos, the most specific first, behind the variant's own when it has one.
  const fitting = variant
    ? photosOf(images, optionOfValue(options, (option) => option.values, (entry) => entry.id), variant.optionValueIds)
    : images
  const shownImages = variant?.imageUrl ? [{ id: `variant-${variant.id}`, url: variant.imageUrl, alt: null }, ...fitting] : fitting

  function choose(optionId: string, valueId: string) {
    const chosen = targetOf(selection, optionId, valueId, options, variants)
    if (!chosen) return
    setSelection(selectionOf(chosen, options))
    onVariantChange?.(chosen.id)
  }

  const order = orderHref?.replace(ORDER_VARIANT_MARK, label ? encodeURIComponent(` (${label})`) : "")

  const price = showPrice ? (
    // Announced as it changes with the choice, so a screen reader hears the new price.
    <div aria-live="polite">
      <StorefrontPrice
        priceCents={variant?.priceCents ?? priceCents}
        compareAtPriceCents={variant ? variant.compareAtPriceCents : compareAtPriceCents}
        locale={locale}
        size="product"
        showBadge={showBadge}
        messages={messages}
      />
    </div>
  ) : undefined

  const picker = choosing ? (
    <StorefrontVariantPicker
      options={options}
      variants={variants}
      selection={selection}
      onSelect={choose}
      images={images}
      locale={showPrice ? locale : undefined}
      messages={messages}
    />
  ) : undefined

  return (
    <>
      {/*
        5b's top row: photos | information | buy box, 540 | 452 | 320 at 1440. Two columns from shop-lg,
        the first row hugging the information so the buy box sits under the price; one on a phone.
      */}
      <article className="grid grid-cols-1 items-start gap-6 pt-1 pb-8 leading-[1.2] text-shop-on-background shop-lg:grid-cols-2 shop-lg:grid-rows-[auto_1fr] shop-lg:gap-8 shop-xl:grid-cols-[minmax(0,540fr)_minmax(0,452fr)_320px] shop-xl:grid-rows-none">
        <div className="min-w-0 shop-lg:row-span-2 shop-xl:row-span-1">
          <StorefrontProductGallery
            key={shownImages.map((image) => image.id).join("|")}
            images={shownImages}
            name={name}
            messages={messages}
          />
        </div>

        <StorefrontProductInfo
          shopName={shopName}
          homeHref={homeHref}
          name={name}
          unavailable={unavailable}
          price={price}
          picker={picker}
          description={description}
          {...(linkComponent ? { linkComponent } : {})}
          messages={messages}
        />

        <StorefrontProductBuy messages={messages}>
          {unavailable ? (
            <div className="flex flex-col gap-3">
              {/* A bordered box and not a tinted one: an opacity tint would fade the sentence with it. */}
              <p className="rounded-xl border border-shop-line px-5 py-3 text-center text-sm text-shop-muted">
                {choosing ? text.combinationSoldOut : text.soldOutHint}
              </p>
              {restock && (variant ?? variants[0]) ? (
                <button
                  type="button"
                  onClick={() => setAsking(true)}
                  className="inline-flex w-full items-center justify-center rounded-xl border-2 border-current px-5 py-3 text-base font-medium"
                >
                  {text.notifyMe}
                </button>
              ) : null}
            </div>
          ) : cart ? (
            <StorefrontBuyActions name={name} onAdd={(qty) => cart.onAdd(variant?.id ?? null, qty)} cartHref={cart.href} orderHref={order} messages={messages} />
          ) : order ? (
            <a
              href={order}
              rel="noreferrer"
              target="_blank"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-shop-primary px-5 py-3 text-base font-medium text-shop-on-primary"
            >
              <WhatsAppIcon className="size-5" />
              {text.orderThis}
            </a>
          ) : null}
        </StorefrontProductBuy>
      </article>

      {restock ? (
        <StorefrontRestockDialog
          open={asking}
          onOpenChange={(open) => {
            setAsking(open)
            if (!open) restock.onReset?.()
          }}
          productName={name}
          variantLabel={label}
          status={restock.status}
          error={restock.error}
          phoneInvalid={restock.phoneInvalid}
          onSubmit={(submission) => {
            const target = variant ?? variants[0]
            if (target) restock.onSubmit(target.id, submission)
          }}
          messages={messages}
        />
      ) : null}
    </>
  )
}
