// Libs
import { XIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliateFilterChipProps {
  /** Whose orders are shown. */
  name: string
  /** The same list, for every affiliate. */
  clearHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The orders list kept to one affiliate's orders (IMPULSEIA-107), and the way back to all of them. */
export function AffiliateFilterChip({ name, clearHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateFilterChipProps) {
  const text = messages.affiliates.ordersFilter

  return (
    <p className="bg-muted flex w-fit items-center gap-2 rounded-full py-1 pr-1 pl-3 text-sm">
      <span>{format(text.label, { name })}</span>
      <Link href={clearHref} aria-label={text.clear} className="hover:bg-background focus-visible:ring-ring rounded-full p-1 outline-none focus-visible:ring-2">
        <XIcon aria-hidden="true" className="size-3.5" />
      </Link>
    </p>
  )
}
