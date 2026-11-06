// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontCheckoutLayoutProps {
  /** "Resumo": `StorefrontCheckoutSummary`. */
  summary: ReactNode
  /** What the shopper sets about the price — the coupon, the cashback — over the steps. */
  controls?: ReactNode
  /** The steps themselves: `StorefrontCheckout`. */
  steps: ReactNode
  messages?: UiMessages
}

/**
 * The checkout's page. On a phone: the summary's line first, then the coupon, then the steps — the
 * first of them on the first screen. From `shop-lg` the summary stands beside
 * the steps, held in view while they scroll.
 *
 * Its title is for a reader: the bar over it already says whose shop this is, and the steps say
 * where the shopper is.
 */
export function StorefrontCheckoutLayout({ summary, controls, steps, messages = defaultMessages }: StorefrontCheckoutLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 shop-lg:grid-cols-[minmax(0,1fr)_22rem] shop-lg:items-start shop-lg:gap-8">
      <h1 className="sr-only">{messages.storefront.checkoutTitle}</h1>
      <div className="flex flex-col gap-4 shop-lg:sticky shop-lg:top-4 shop-lg:col-start-2 shop-lg:row-start-1">{summary}</div>
      <div className="flex min-w-0 flex-col gap-4 shop-lg:col-start-1 shop-lg:row-start-1">
        {controls ? <div className="flex flex-col gap-4">{controls}</div> : null}
        {steps}
      </div>
    </div>
  )
}
