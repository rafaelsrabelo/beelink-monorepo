"use client"

// React
import { useState } from "react"

// Libs
import { ChevronLeftIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { WhatsAppIcon } from "../store/store-brand-icons"
import { StorefrontPrice } from "./storefront-price"

export interface StorefrontProductImage {
  id: string
  url: string
  alt: string | null
}

export interface StorefrontProductDetailProps {
  name: string
  description: string | null
  priceCents: number
  compareAtPriceCents: number | null
  images: readonly StorefrontProductImage[]
  categoryName?: string | null
  /** Back to the catalogue, filtered to this product's category when it has one. */
  backHref: string
  /** `wa.me/<digits>?text=…`, built by the screen — the message names this product. */
  orderHref?: string
  locale: string
  showPrice?: boolean
  showBadge?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One product's page.
 *
 * The gallery is the only stateful thing on the storefront, and it is state about looking rather
 * than about the shop: which photo is shown is not worth an address, and putting it in one would
 * make every thumbnail a new entry in someone's history.
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
  locale,
  showPrice = true,
  showBadge = true,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontProductDetailProps) {
  const text = messages.storefront
  const [shown, setShown] = useState(0)
  const current = images[shown] ?? images[0]

  return (
    <article className="flex w-full flex-col gap-5">
      <Link href={backHref} className="inline-flex items-center gap-1 self-start text-sm opacity-75">
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
        {categoryName ?? text.backToShop}
      </Link>

      <div className="flex flex-col gap-3">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-black/5">
          {current ? (
            <img src={current.url} alt={current.alt ?? name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm opacity-50">
              {text.noPhoto}
            </div>
          )}
        </div>

        {images.length > 1 ? (
          <ul className="flex gap-2 overflow-x-auto">
            {images.map((image, at) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setShown(at)}
                  // The pressed state and not a colour alone: which thumbnail is showing has to be
                  // answerable without seeing the ring.
                  aria-pressed={at === shown}
                  // Without this the button holds only an aria-hidden image, and a screen reader
                  // announces it as "button" and nothing else — axe calls it button-name, and it
                  // is right: the picture is decorative, so the name has to come from somewhere.
                  aria-label={image.alt ?? format(text.photoOf, { n: String(at + 1), total: String(images.length) })}
                  className={cn(
                    "size-16 shrink-0 overflow-hidden rounded-lg bg-black/5",
                    at === shown ? "opacity-100" : "opacity-60",
                  )}
                  style={at === shown ? { boxShadow: "0 0 0 2px var(--shop-primary)" } : undefined}
                >
                  <img src={image.url} alt="" aria-hidden="true" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{name}</h1>
        {showPrice ? (
          <StorefrontPrice
            priceCents={priceCents}
            compareAtPriceCents={compareAtPriceCents}
            locale={locale}
            showBadge={showBadge}
            messages={messages}
          />
        ) : null}
        {description ? <p className="text-sm whitespace-pre-line opacity-80">{description}</p> : null}
      </div>

      {orderHref ? (
        <a
          href={orderHref}
          rel="noreferrer"
          target="_blank"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-medium"
          style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-background)" }}
        >
          <WhatsAppIcon className="size-5" />
          {text.orderThis}
        </a>
      ) : null}
    </article>
  )
}
