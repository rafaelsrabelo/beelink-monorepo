// Libs
import { LockIcon, StoreIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { planMoney } from "@harness-monorepo/ui/lib/plan-figures"
import type { SubscriptionLockValue, SubscriptionOfferView } from "@harness-monorepo/ui/lib/subscription"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface SubscriptionLockedProps {
  reason: SubscriptionLockValue
  /** The day it ended, in words — the trial's, the free time's, the grace's or the paid period's last day. Null where there is none to say. */
  endedOn: string | null
  /** The page as the account's list of pages has it; null while that list is read. */
  page: { name: string; logoUrl: string | null } | null
  /** A shop, whose customers keep reading their orders; a site takes none. */
  shop: boolean
  /** The account has other pages, which stay open. */
  otherPages: boolean
  /** The plan on sale and its cycles' figures, worked out by the screen; null where none is on sale. */
  plan: { name: string; offers: readonly SubscriptionOfferView[] } | null
  /** The plan is still being read: its lines stand as a skeleton. */
  planPending?: boolean
  /** The page's Assinar screen. */
  subscribeHref: string
  /** The screen's language: it decides how an amount is written. */
  locale: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A page locked for want of payment (BEELINK-296), drawn in place of any screen of its panel but the
 * Assinar one: why, in the owner's words and with the day it happened, what each period of the plan
 * costs the page, and the way to the Assinar screen — the renewal due for a suspended page, a plan for
 * any other. Then what being locked means: the panel closed, the page off the air to its visitors and
 * never why, a shop's customers keeping their orders, nothing deleted, the account's other pages open.
 *
 * It is the screen's `h1`. No figure is written here: the amounts arrive in the offers, and a sentence
 * takes them through its `{placeholders}`.
 */
export function SubscriptionLocked({ reason, endedOn, page, shop, otherPages, plan, planPending = false, subscribeHref, locale, linkComponent: Link = AnchorLink, messages = defaultMessages }: SubscriptionLockedProps) {
  const text = messages.subscription.locked
  const names = messages.subscription.cycles.names
  const money = (cents: number) => planMoney(cents, locale)

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-2 sm:py-6 lg:px-6">
      <header className="flex flex-col gap-3">
        {page ? (
          // On the panel's own ground, where `muted-foreground` is under 4.5:1: the shell's muted is drawn for it.
          <p className="text-shell-muted flex min-w-0 items-center gap-2 text-sm">
            {page.logoUrl ? <img src={page.logoUrl} alt="" className="size-6 shrink-0 rounded object-contain" /> : <StoreIcon aria-hidden="true" className="size-4 shrink-0" />}
            <span className="truncate">{page.name}</span>
          </p>
        ) : null}
        <div className="flex items-start gap-3">
          <span className="bg-warning text-warning-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <LockIcon aria-hidden="true" className="size-5" />
          </span>
          <h1 className="pt-1 text-2xl font-semibold text-balance">{text.titles[reason]}</h1>
        </div>
        <p>{endedOn ? format(text.texts[reason], { date: endedOn }) : text.textsUndated[reason]}</p>
      </header>

      <div className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
        {planPending ? (
          <div aria-hidden="true" className="flex flex-col gap-3">
            <Skeleton className="h-6 w-56" />
            {[0, 1, 2].map((at) => (
              <Skeleton key={at} className="h-4 w-full max-w-sm" />
            ))}
          </div>
        ) : plan ? (
          <>
            <h2 className="text-lg font-semibold">{format(text.pricesTitle, { plan: plan.name })}</h2>
            <ul className="flex flex-col gap-1.5 text-sm tabular-nums">
              {plan.offers.map((offer) => (
                <li key={offer.cycle}>
                  {offer.cycle === "MONTHLY"
                    ? format(text.priceMonthly, { cycle: names[offer.cycle], amount: money(offer.monthlyCents) })
                    : format(text.priceAtOnce, { cycle: names[offer.cycle], total: money(offer.totalCents), months: String(offer.months), amount: money(offer.monthlyCents) })}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="text-shell-muted text-sm">{messages.subscription.facts.renewal}</p>
        <Link href={subscribeHref} className={cn(buttonVariants({ size: "lg" }), "h-10 w-full px-4 sm:w-fit")}>
          {text.actions[reason]}
        </Link>
      </div>

      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
        <li>{text.meaning}</li>
        {shop ? <li>{text.customers}</li> : null}
        <li>{text.kept}</li>
        {otherPages ? <li>{text.otherPages}</li> : null}
      </ul>
    </section>
  )
}
