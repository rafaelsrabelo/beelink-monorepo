// React
import { Fragment, type ReactNode } from "react"

// UI
import { firstListOf, withoutFirstList } from "@harness-monorepo/ui/lib/markdown"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontAboutItem } from "./storefront-about-item"
import { PRODUCT_DESCRIPTION_ID } from "./storefront-product-section"

export interface StorefrontProductInfoProps {
  shopName: string
  /** The shop's front door, for "Visite a loja". */
  homeHref: string
  name: string
  /** Nothing of the chosen combination can be ordered now. */
  unavailable: boolean
  /** The price as the page draws it, announced as it changes; absent when the shop hides prices. */
  price?: ReactNode
  /** The options, when the product has any. */
  picker?: ReactNode
  /** The product's Markdown: its first bulleted list becomes "Sobre este item". */
  description?: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * 5b's middle column: the shop over the title, the title as the page's one `h1`, then the price, the
 * choice and "Sobre este item", a hairline above each. It draws what it is handed; the product block
 * owns the choice and passes each part. A part that is absent takes its hairline with it.
 */
export function StorefrontProductInfo({
  shopName,
  homeHref,
  name,
  unavailable,
  price,
  picker,
  description,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontProductInfoProps) {
  const text = messages.storefront
  const about = description ? firstListOf(description) : []
  // The link only when the description section has something the list did not say.
  const more = description && withoutFirstList(description).length > 0 ? `#${PRODUCT_DESCRIPTION_ID}` : undefined
  const parts = [
    ["price", price],
    ["picker", picker],
    ["about", about.length > 0 ? <StorefrontAboutItem items={about} moreHref={more} messages={messages} /> : null],
  ] as const

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <Link href={homeHref} className="self-start text-[14px] font-semibold text-shop-primary-ink hover:underline">
        {format(text.visitShop, { name: shopName })}
      </Link>
      <h1 className="text-[26px] leading-[1.25] font-bold text-shop-on-background">{name}</h1>
      {/*
        Its own line above the price: this is the one fact that changes what the visitor can do here.
      */}
      {unavailable ? <p className="text-sm font-semibold tracking-wide text-shop-muted uppercase">{text.soldOut}</p> : null}
      {parts.map(([key, part]) =>
        part ? (
          <Fragment key={key}>
            <div aria-hidden="true" className="h-px bg-shop-line" />
            {part}
          </Fragment>
        ) : null,
      )}
    </div>
  )
}
