"use client"

// React
import { useState } from "react"

// Libs
import { ChevronLeftIcon } from "lucide-react"

// UI
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
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { WhatsAppIcon } from "../store/store-brand-icons"
import { StorefrontPrice } from "./storefront-price"
import { StorefrontProductGallery, type StorefrontProductImage } from "./storefront-product-gallery"
import { StorefrontRestockDialog, type RestockSubmission } from "./storefront-restock-dialog"
import { StorefrontVariantPicker } from "./storefront-variant-picker"

export type { StorefrontProductImage } from "./storefront-product-gallery"

export interface StorefrontProductDetailProps {
  name: string
  description: string | null
  priceCents: number
  compareAtPriceCents: number | null
  images: readonly StorefrontProductImage[]
  categoryName?: string | null
  /** Back to the catalogue, filtered to this product's category when it has one. */
  backHref: string
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
 * One product's page, and the combination chosen on it.
 *
 * The choice drives what the page says: the price, the photo, whether it can be ordered and what
 * the order message names. A combination that ran out keeps its place and offers "Avise-me" instead
 * of the order button.
 */
export function StorefrontProductDetail({
  name,
  description,
  priceCents,
  compareAtPriceCents,
  images,
  categoryName,
  backHref,
  orderHref,
  soldOut = false,
  options = [],
  variants = [],
  initialVariantId,
  onVariantChange,
  restock,
  locale,
  showPrice = true,
  showBadge = true,
  linkComponent: Link = AnchorLink,
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
  const shownImages = variant?.imageUrl ? [{ id: `variant-${variant.id}`, url: variant.imageUrl, alt: null }, ...images] : images

  function choose(optionId: string, valueId: string) {
    const chosen = targetOf(selection, optionId, valueId, options, variants)
    if (!chosen) return
    setSelection(selectionOf(chosen, options))
    onVariantChange?.(chosen.id)
  }

  const order = orderHref?.replace(ORDER_VARIANT_MARK, label ? encodeURIComponent(` (${label})`) : "")

  return (
    <article className="flex w-full flex-col gap-5">
      <Link href={backHref} className="inline-flex items-center gap-1 self-start text-sm opacity-75">
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
        {categoryName ?? text.backToShop}
      </Link>

      <StorefrontProductGallery key={variant?.imageUrl ?? "product"} images={shownImages} name={name} messages={messages} />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{name}</h1>
        {/*
          Its own line above the price: this is the one fact that changes what the visitor can do
          here. No token — the shop window is painted from the shopkeeper's own colours.
        */}
        {unavailable ? (
          <p className="text-sm font-semibold tracking-wide uppercase opacity-70">{text.soldOut}</p>
        ) : null}
        {showPrice ? (
          // Announced as it changes with the choice, so a screen reader hears the new price.
          <div aria-live="polite">
            <StorefrontPrice
              priceCents={variant?.priceCents ?? priceCents}
              compareAtPriceCents={variant ? variant.compareAtPriceCents : compareAtPriceCents}
              locale={locale}
              showBadge={showBadge}
              messages={messages}
            />
          </div>
        ) : null}
        {description ? <p className="text-sm whitespace-pre-line opacity-80">{description}</p> : null}
      </div>

      {choosing ? (
        <StorefrontVariantPicker
          options={options}
          variants={variants}
          selection={selection}
          onSelect={choose}
          locale={showPrice ? locale : undefined}
          messages={messages}
        />
      ) : null}

      {unavailable ? (
        <div className="flex flex-col gap-3">
          {/* A bordered box and not a tinted one: an opacity tint would fade the sentence with it. */}
          <p className="rounded-xl border border-current/20 px-5 py-3 text-center text-sm opacity-70">
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
      ) : order ? (
        <a
          href={order}
          rel="noreferrer"
          target="_blank"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-medium"
          style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
        >
          <WhatsAppIcon className="size-5" />
          {text.orderThis}
        </a>
      ) : null}

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
    </article>
  )
}
