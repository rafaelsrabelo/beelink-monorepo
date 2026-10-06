// React
import type { ReactNode } from "react"

// Libs
import { ChevronLeftIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontPaymentLayoutProps {
  number: number
  /** The order's own page: the way back, whatever the payment says. */
  orderHref: string
  /** Why the last try to make a charge was refused, already a sentence. */
  alert?: string | null
  /** What the refusal leads to — adding the CPF it found missing; beside the sentence. */
  alertAction?: ReactNode
  /** The payment itself: a Pix, a card, a notice, or their skeleton. */
  children: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The payment screen of one order (BEELINK-205): where a shopper lands once an order charged online
 * is placed, and comes back to from the order while there is something to pay. One narrow column —
 * it is read on a phone, with a bank's app a thumb away — under the order's number and the way back.
 */
export function StorefrontPaymentLayout({ number, orderHref, alert = null, alertAction, children, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontPaymentLayoutProps) {
  const text = messages.storefront

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-4 text-shop-on-background shop-lg:py-6">
      <Link href={orderHref} className="flex w-fit items-center gap-1 text-sm font-semibold text-shop-primary-ink hover:underline">
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
        {text.paymentBack}
      </Link>
      <h1 className="text-2xl font-extrabold shop-lg:text-3xl">{format(text.paymentTitle, { number: String(number) })}</h1>
      {alert ? (
        <div role="alert" className="flex flex-col gap-2 rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          <p>{alert}</p>
          {alertAction}
        </div>
      ) : null}
      {children}
    </div>
  )
}
