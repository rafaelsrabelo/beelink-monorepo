// Libs
import { UserRoundIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontAccountLinkProps {
  /** The shopper's page when signed in, the sign-in page when not: the web decides which. */
  href: string
  /** The signed-in shopper's name; null invites them to sign in. */
  name: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The header's account, as 5a draws it beside the cart: a greeting over "Minha conta" from `shop-lg`,
 * the mark alone below it. Signed in, the greeting is the shopper's first name.
 */
export function StorefrontAccountLink({ href, name, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontAccountLinkProps) {
  const text = messages.storefront
  const first = name?.trim().split(/\s+/)[0]
  const greeting = first ? format(text.accountHello, { name: first }) : text.accountGreeting

  return (
    <Link href={href} aria-label={`${greeting} — ${text.account}`} className="flex shrink-0 items-center gap-1.5">
      <UserRoundIcon aria-hidden="true" className="size-7 shop-lg:hidden" strokeWidth={1.8} />
      <span aria-hidden="true" className="hidden flex-col text-xs leading-[1.3] shop-lg:flex">
        <span className="max-w-32 truncate opacity-85">{greeting}</span>
        <span className="text-sm font-bold">{text.account}</span>
      </span>
    </Link>
  )
}
