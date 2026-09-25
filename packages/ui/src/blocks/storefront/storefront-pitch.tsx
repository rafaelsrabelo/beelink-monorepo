// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { WhatsAppIcon } from "../store/store-brand-icons"

export interface StorefrontPitchProps {
  name: string
  description: string
  /** `wa.me/…`, built by the screen. Absent, the pitch is words and no button. */
  orderHref?: string
  messages?: UiMessages
}

/**
 * The shop's name, a line about it and its WhatsApp, centred — the page a shop has before it has
 * an arrangement of its own. The landing page stopped drawing it (a profile page is not a landing
 * page), and it stays for the window's plain mode, where it is the one thing that says whose shop
 * this is. Its own file only because the window had passed the line limit.
 */
export function StorefrontPitch({ name, description, orderHref, messages = defaultMessages }: StorefrontPitchProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <p className="max-w-2xl text-sm opacity-80">{description}</p>
      {orderHref ? (
        <a
          href={orderHref}
          rel="noreferrer"
          target="_blank"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-medium"
          style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
        >
          <WhatsAppIcon className="size-5" />
          {messages.storefront.order}
        </a>
      ) : null}
    </div>
  )
}
