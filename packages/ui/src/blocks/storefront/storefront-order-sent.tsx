// Libs
import { CheckCircle2Icon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrderSentProps {
  /** The link that was opened, kept for a second try: the cart it was built from is gone. */
  href: string
  continueHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** What the cart becomes once the order has gone to WhatsApp: said plainly, with a way to retry. */
export function StorefrontOrderSent({ href, continueHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrderSentProps) {
  const text = messages.storefront

  return (
    <section role="status" className="flex flex-col items-center gap-3 py-16 text-center">
      <CheckCircle2Icon aria-hidden="true" className="size-10 text-shop-positive-ink" />
      <p className="text-lg font-bold">{text.checkoutSent}</p>
      <p className="text-sm text-shop-muted">{text.checkoutSentHint}</p>
      <a href={href} target="_blank" rel="noreferrer" className="text-sm font-semibold text-shop-primary-ink underline">
        {text.checkoutRetry}
      </a>
      <Link href={continueHref} className="mt-2 rounded-[10px] bg-shop-primary px-4 py-2 text-sm font-semibold text-shop-on-primary">
        {text.cartContinue}
      </Link>
    </section>
  )
}
