"use client"

// React
import { useId } from "react"

// Libs
import { ClockIcon, TriangleAlertIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import type { SubscriptionStripView } from "@harness-monorepo/ui/lib/subscription"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface SubscriptionStripProps {
  view: SubscriptionStripView
  /** The page's Assinar screen, which says the rest before anything is paid. */
  subscribeHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The trial's last days or the free time's, in its own three sentences: two days or more, tomorrow, today. */
function lastDaysOf(daysLeft: number, lastDay: string, many: string, one: string, today: string): string {
  if (daysLeft > 1) return format(many, { days: String(daysLeft), date: lastDay })
  return daysLeft === 1 ? format(one, { date: lastDay }) : today
}

/** What the strip says: the first line, what follows it, and the way out. */
export function stripWordsOf(view: SubscriptionStripView, text: UiMessages["subscription"]["banners"]): { title: string; lines: string[]; action: string } {
  switch (view.kind) {
    case "trial":
      return { title: lastDaysOf(view.daysLeft, view.lastDay, text.trialMany, text.trialOne, text.trialToday), lines: [text.trialText], action: text.trialAction }
    case "free":
      return { title: lastDaysOf(view.daysLeft, view.lastDay, text.freeMany, text.freeOne, text.freeToday), lines: [text.trialText], action: text.trialAction }
    case "grace":
      return { title: text.graceTitle, lines: [format(text.graceText, { date: view.payBy }), text.graceBoleto], action: text.graceAction }
  }
}

/**
 * The strip over a page's panel before it locks (BEELINK-296): its trial's or free time's last days, or
 * the grace after a renewal went unpaid, said in the warning's own colours, and the way to the Assinar
 * screen — a plan to choose, or the renewal to pay, with another card, Pix or a boleto. It is a region
 * named by its first line, so a reader can find it again; no heading, since the screen's `h1` comes
 * after it.
 */
export function SubscriptionStrip({ view, subscribeHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: SubscriptionStripProps) {
  const id = useId()
  const { title, lines, action } = stripWordsOf(view, messages.subscription.banners)
  const Icon = view.kind === "grace" ? TriangleAlertIcon : ClockIcon

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="bg-warning text-warning-foreground border-warning-foreground/20 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="flex min-w-0 gap-3">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p id={`${id}-title`} className="font-semibold">
            {title}
          </p>
          {lines.map((line) => (
            <p key={line} className="text-sm">
              {line}
            </p>
          ))}
        </div>
      </div>
      <Link href={subscribeHref} className={cn(buttonVariants({ size: "sm" }), "ml-8 w-fit shrink-0 sm:ml-0")}>
        {action}
      </Link>
    </section>
  )
}
