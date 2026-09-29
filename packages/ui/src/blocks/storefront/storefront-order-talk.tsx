// Libs
import { MessageCircleIcon } from "lucide-react"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { openInPlace } from "./open-in-place"

export interface StorefrontOrderTalkProps {
  /** This order's conversation on its own page, where the link leads without a script or to a new tab. */
  href: string
  /** Opens this order's conversation in the panel, on a plain click. */
  onOpen?: () => void
  /** "outline" beside Ver comprovante, as the order's top draws it; "quiet" on a card, under its main action. */
  emphasis?: "outline" | "quiet"
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const LOOK = {
  outline: "h-10 rounded-full border border-shop-line-strong bg-shop-background px-4 hover:bg-shop-fill",
  quiet: "h-11 rounded-full border border-shop-line-strong bg-shop-background px-5 hover:bg-shop-fill",
} as const

/** "Falar com a loja" on an order on its way: its conversation, opened where the shopper is. */
export function StorefrontOrderTalk({ href, onOpen, emphasis = "outline", linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrderTalkProps) {
  const text = messages.storefront

  return (
    <Link
      href={href}
      onClick={(event) => openInPlace(event, onOpen)}
      className={cn("flex shrink-0 items-center justify-center gap-2 text-sm font-semibold text-shop-on-background", LOOK[emphasis])}
    >
      <MessageCircleIcon aria-hidden="true" className="size-4" />
      {text.accountMessages}
    </Link>
  )
}
