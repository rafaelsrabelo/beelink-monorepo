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
  /** "sm" beside Ver comprovante, as the order's top draws it; "md" on a card, as tall as its main action. */
  size?: "sm" | "md"
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const HEIGHT = { sm: "h-10 px-4", md: "h-11 px-5" } as const

/** "Falar com a loja" on an order on its way: its conversation, opened where the shopper is. */
export function StorefrontOrderTalk({ href, onOpen, size = "sm", linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrderTalkProps) {
  const text = messages.storefront

  return (
    <Link
      href={href}
      onClick={(event) => openInPlace(event, onOpen)}
      className={cn("flex shrink-0 items-center justify-center gap-2 rounded-full border border-shop-line-strong bg-shop-background text-sm font-semibold text-shop-on-background hover:bg-shop-fill", HEIGHT[size])}
    >
      <MessageCircleIcon aria-hidden="true" className="size-4" />
      {text.accountMessages}
    </Link>
  )
}
