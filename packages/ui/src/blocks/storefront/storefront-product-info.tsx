// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

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
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * 5b's middle column: the shop over the title, the title as the page's one `h1`, then the price and
 * the choice. It draws what it is handed; the product block owns the choice and passes each part.
 */
export function StorefrontProductInfo({ shopName, homeHref, name, unavailable, price, picker, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontProductInfoProps) {
  const text = messages.storefront

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
      {price}
      {picker}
    </div>
  )
}
