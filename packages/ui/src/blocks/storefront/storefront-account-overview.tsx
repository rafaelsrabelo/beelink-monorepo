// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontAccountOverviewProps {
  name: string
  /**
   * What the front tells, in the order it tells it: the order on its way — or how the last one
   * ended — then the shopper's details. The reviews to write and the favourites join with theirs.
   */
  children: ReactNode
  messages?: UiMessages
}

/**
 * The area's front (6c): a greeting, then what the shopper would come to check. Never a card per
 * page of the menu — the menu is beside it, and on a phone right under it.
 */
export function StorefrontAccountOverview({ name, children, messages = defaultMessages }: StorefrontAccountOverviewProps) {
  const text = messages.storefront
  const first = name.trim().split(/\s+/)[0] || name

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold shop-lg:text-3xl">{format(text.accountHello, { name: first })}</h1>
      {children}
    </div>
  )
}
