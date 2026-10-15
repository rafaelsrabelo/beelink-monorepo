// React
import { useId } from "react"

// Libs
import { TicketCheckIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface SubscriptionCouponAppliedProps {
  /** The last day the page is free, in words. */
  freeUntil: string | null
  /** The page's panel, where the screen goes on to by itself. */
  panelHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The coupon taken (BEELINK-224): said, with the last day the page is free, and the way to the panel —
 * open again, if the page was locked — where the screen takes the shopkeeper by itself a moment later.
 * A status, so it is heard where it appears.
 */
export function SubscriptionCouponApplied({ freeUntil, panelHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: SubscriptionCouponAppliedProps) {
  const text = messages.subscription.couponApplied
  const id = useId()

  return (
    <section role="status" aria-labelledby={`${id}-title`} className="border-primary/30 bg-primary/10 flex flex-col gap-3 rounded-xl border p-4 sm:p-6">
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-semibold">
        <TicketCheckIcon aria-hidden="true" className="size-5 shrink-0" />
        {text.title}
      </h2>
      <p className="text-sm">{freeUntil ? format(text.text, { date: freeUntil }) : text.textUndated}</p>
      <Link href={panelHref} className={cn(buttonVariants(), "w-fit")}>
        {text.back}
      </Link>
    </section>
  )
}
