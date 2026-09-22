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
  /**
   * The shop counts this product and has none left.
   *
   * The page still answers — this address goes out on WhatsApp, and a 404 the day the stock runs
   * out breaks every link already shared. What goes away is the way to order, because sending a
   * shopkeeper a request they cannot fill wastes two people's time instead of one's.
   */
  soldOut?: boolean
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
  soldOut = false,
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
        {/*
          Its own line above the price rather than a badge beside the name: this is the one fact
          that changes what the visitor can do here, and it has to be read before the price is.
          No token: the shop window is painted from the shopkeeper's own colours, so everything
          here is an opacity on their foreground.
        */}
        {soldOut ? (
          <p className="text-sm font-semibold tracking-wide uppercase opacity-70">{text.soldOut}</p>
        ) : null}
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

      {soldOut ? (
        // A bordered box and not a tinted one. A background of `--shop-primary` needs an alpha, and
        // an `opacity` on the element is the wrong tool for that: opacity composites the whole
        // subtree, so the sentence inside fades with the tint and no `opacity-100` on a child can
        // bring it back. The border reads as a panel and leaves the text at full strength.
        <p className="rounded-xl border border-current/20 px-5 py-3 text-center text-sm opacity-70">
          {text.soldOutHint}
        </p>
      ) : orderHref ? (
        <a
          href={orderHref}
          rel="noreferrer"
          target="_blank"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-medium"
          style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
        >
          <WhatsAppIcon className="size-5" />
          {text.orderThis}
        </a>
      ) : null}
    </article>
  )
}
