// Libs
import { CheckCircle2Icon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrderSentProps {
  /** The order's number, the one the shop's panel shows. */
  number: number
  /**
   * The WhatsApp link that was opened, kept for a second try — or to open it at all, when the
   * browser refused the tab. Null at a shop without WhatsApp: the shop takes it from here.
   */
  href: string | null
  continueHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** What the cart becomes once the order is placed: its number, said plainly, and what comes next. */
export function StorefrontOrderSent({ number, href, continueHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrderSentProps) {
  const text = messages.storefront

  return (
    <section role="status" className="flex flex-col items-center gap-3 py-16 text-center">
      <CheckCircle2Icon aria-hidden="true" className="size-10 text-shop-positive-ink" />
      <p className="text-lg font-bold">{format(text.checkoutSent, { number: String(number) })}</p>
      <p className="text-sm text-shop-muted">{href ? text.checkoutSentHint : text.checkoutSentShopHint}</p>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-sm font-semibold text-shop-primary-ink underline">
          {text.checkoutRetry}
        </a>
      ) : null}
      <Link href={continueHref} className="mt-2 rounded-[10px] bg-shop-primary px-4 py-2 text-sm font-semibold text-shop-on-primary">
        {text.cartContinue}
      </Link>
    </section>
  )
}
