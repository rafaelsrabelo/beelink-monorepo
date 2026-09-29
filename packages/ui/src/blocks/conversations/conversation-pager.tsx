// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface ConversationPagerProps {
  /** The page before, of more recent conversations; null on the first. */
  newerHref: string | null
  /** The page after, of older ones; null on the last. */
  olderHref: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The way through a shop's conversations past the first page: links, so each page is an address. */
export function ConversationPager({ newerHref, olderHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: ConversationPagerProps) {
  const text = messages.conversations
  if (!newerHref && !olderHref) return null

  return (
    <nav aria-label={text.title} className="flex justify-between border-t px-3 py-2 text-sm">
      {newerHref ? (
        <Link href={newerHref} className="text-primary hover:underline">
          {text.newer}
        </Link>
      ) : (
        <span />
      )}
      {olderHref ? (
        <Link href={olderHref} className="text-primary hover:underline">
          {text.older}
        </Link>
      ) : null}
    </nav>
  )
}
