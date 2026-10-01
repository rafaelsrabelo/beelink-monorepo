// Libs
import { MailIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontFavoritesHintProps {
  /** Whether the shopper kept "Favoritos" on among their notices by e-mail. */
  on: boolean
  /** The notices' own box on the profile, where it is turned on or off. */
  settingsHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Over Favoritos (6g): what the shop does with a favourite that gets cheaper or comes back — by e-mail — and the way to change it. */
export function StorefrontFavoritesHint({ on, settingsHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontFavoritesHintProps) {
  const text = messages.storefront

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-shop-muted">
      <MailIcon aria-hidden="true" className="size-4 shrink-0" />
      <span>{on ? text.favoritesHintOn : text.favoritesHintOff}</span>
      <Link href={settingsHref} className="inline-flex min-h-11 items-center font-semibold text-shop-primary-ink underline underline-offset-2">
        {on ? text.favoritesHintChange : text.favoritesHintTurnOn}
      </Link>
    </p>
  )
}
