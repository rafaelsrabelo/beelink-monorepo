// React
import type { CSSProperties, ReactNode } from "react"

// Libs
import { LockIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BAND } from "./storefront-band"

export interface StorefrontCheckoutBarProps {
  name: string
  logoUrl?: string | null
  homeHref: string
  /** The bag, back to the cart: the web's live link, which counts as the cart fills. */
  cart: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The checkout's whole header: the shop's logo, back to its front, and the bag, back to the cart —
 * no search, no menu, no strip of offers. A checkout is where a purchase is finished, and every way
 * off it that is not a step of it is a purchase left half-way.
 *
 * Painted in `--shop-header`, as the masthead is: the logo was chosen against that colour, and a
 * white logo on the page's own background would vanish.
 */
export function StorefrontCheckoutBar({ name, logoUrl = null, homeHref, cart, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontCheckoutBarProps) {
  const text = messages.storefront

  return (
    <header className="w-full border-b border-shop-line" style={{ backgroundColor: "var(--shop-header)", color: "var(--shop-on-header)" } as CSSProperties}>
      <div className={cn(BAND, "flex h-16 items-center gap-4")}>
        {/* The logo stands in for the name and carries it as its `alt`, as in the masthead. */}
        <Link href={homeHref} className="me-auto flex shrink-0 items-center">
          {logoUrl ? <img src={logoUrl} alt={name} className="h-9 w-auto max-w-40 object-contain" /> : <span className="text-base font-semibold">{name}</span>}
        </Link>
        <p className="flex items-center gap-1.5 text-sm font-medium opacity-80">
          <LockIcon aria-hidden="true" className="size-4" />
          {text.checkoutSecure}
        </p>
        {cart}
      </div>
    </header>
  )
}
