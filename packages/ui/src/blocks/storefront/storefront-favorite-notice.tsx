// Libs
import { XIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontFavoriteNoticeProps {
  /** What went wrong with the last heart pressed; null says nothing. */
  message: string | null
  /** Where the sentence points, when it points somewhere: the favourites tab, for the cap. */
  link?: { href: string; label: string }
  onClose: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A heart that could not be saved, said at the foot of the screen until it is closed. The region is
 * always in the page, empty when there is nothing to say, so a reader hears the sentence arrive.
 */
export function StorefrontFavoriteNotice({ message, link, onClose, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontFavoriteNoticeProps) {
  const text = messages.storefront

  return (
    <div role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
      {message ? (
        <p className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-shop-on-background py-2 pr-2 pl-4 text-sm text-shop-background shadow-lg">
          <span>
            {message}
            {link ? (
              <>
                {" "}
                <Link href={link.href} className="font-semibold underline underline-offset-2">
                  {link.label}
                </Link>
              </>
            ) : null}
          </span>
          <button type="button" onClick={onClose} aria-label={text.favoriteNoticeClose} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full">
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        </p>
      ) : null}
    </div>
  )
}
