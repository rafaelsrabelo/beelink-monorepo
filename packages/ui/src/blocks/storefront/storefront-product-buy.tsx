// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontProductBuyProps {
  children: ReactNode
  messages?: UiMessages
}

/**
 * 5b's third column, where buying happens: a named region a reader can jump to, and on a wide screen
 * one that stays in view under the sticky header while the page scrolls — but only where the window
 * is tall enough to show it whole. A box that sticks with its bottom off screen hides its own button.
 */
export function StorefrontProductBuy({ children, messages = defaultMessages }: StorefrontProductBuyProps) {
  return (
    <section
      aria-label={messages.storefront.buyBoxLabel}
      className="flex min-w-0 flex-col gap-3.5 shop-xl:[@media(min-height:760px)]:sticky shop-xl:[@media(min-height:760px)]:top-[calc(var(--shop-masthead-height,117px)+16px)]"
    >
      {children}
    </section>
  )
}
