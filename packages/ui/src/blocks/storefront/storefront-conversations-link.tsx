// Libs
import { MessageCircleIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { openInPlace } from "./open-in-place"

export interface StorefrontConversationsLinkProps {
  /** The conversations' own page, where the link leads without a script or to a new tab. */
  href: string
  /** Messages from the shop not read yet, across every conversation. */
  unread?: number
  /** Opens the conversations' panel in place, on a plain click. */
  onOpen?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The header's conversations, beside the account: a balloon with the unread count, drawn as the
 * cart's. The count lives in the link's name, and the badge is for the eye.
 */
export function StorefrontConversationsLink({ href, unread = 0, onOpen, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontConversationsLinkProps) {
  const text = messages.storefront
  const label = unread === 0 ? text.conversationsLink : unread === 1 ? text.conversationsLinkWithOne : format(text.conversationsLinkWithCount, { count: String(unread) })

  return (
    <Link href={href} aria-label={label} onClick={(event) => openInPlace(event, onOpen)} className="flex shrink-0 items-center">
      <span className="relative flex">
        <MessageCircleIcon aria-hidden="true" className="size-7" strokeWidth={1.8} />
        {unread > 0 ? (
          // The brand toned against the header, as the cart's badge, so it shows on a header in the brand.
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold"
            style={{ backgroundColor: "var(--shop-primary-on-header)", color: "var(--shop-on-primary-on-header)" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </span>
    </Link>
  )
}
