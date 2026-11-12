// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontAffiliateAvatar } from "./storefront-affiliate-avatar"
import { firstNameOf } from "./storefront-affiliate-name"

export interface StorefrontAffiliateNoteProps {
  name: string
  photoUrl: string | null
  messages?: UiMessages
}

/**
 * The cart's and the checkout's line about the affiliate (IMPULSEIA-105, addendum B of the epic):
 * whose recommendation this order is, and that they will read the buyer's name on it — said where
 * the buyer decides, every time, and never closed.
 */
export function StorefrontAffiliateNote({ name, photoUrl, messages = defaultMessages }: StorefrontAffiliateNoteProps) {
  const text = messages.storefront.affiliate
  const first = firstNameOf(name)

  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-shop-primary-tint p-3 text-shop-on-background">
      <StorefrontAffiliateAvatar name={name} photoUrl={photoUrl} size="sm" />
      <p className="min-w-0 text-sm leading-snug">
        <span className="font-semibold">{text.note.replace("{name}", first)}</span> <span className="text-shop-muted">{text.noteDetail.replace("{name}", first)}</span>
      </p>
    </div>
  )
}
