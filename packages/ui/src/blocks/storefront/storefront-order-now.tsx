// Libs
import { ChevronRightIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontOrderSteps, type StorefrontOrderStep } from "./storefront-order-steps"

export interface StorefrontOrderNowProps {
  /** "Pedido nº 1042 · R$ 237,22 · Pix": every line arrives in the shopper's words. */
  eyebrow: string
  /** Where it stands: "Em preparo". */
  headline: string
  /** Who it goes to and where, or the pick-up; null for a delivery that recorded no address. */
  destination: string | null
  /** One more line under it, when the status has something to add. */
  note?: string | null
  steps: readonly StorefrontOrderStep[]
  href: string
  /** The other orders on their way, past this one, and where they are listed. */
  more?: { label: string; href: string } | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The order on its way, at the head of the area's front (6c): where it stands, where it goes, the
 * steps it has taken and the ones to come, and the way to follow it.
 */
export function StorefrontOrderNow({ eyebrow, headline, destination, note, steps, href, more, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrderNowProps) {
  const text = messages.storefront

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-shop-line bg-shop-background p-5 text-shop-on-background shop-md:p-6">
      {/* The eyebrow and the headline carry it to the eye; the outline needs it said. */}
      <h2 className="sr-only">{text.accountInProgress}</h2>
      <div className="flex flex-col gap-4 shop-md:flex-row shop-md:items-start">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[13px] font-bold tracking-[0.04em] text-shop-muted uppercase">{eyebrow}</p>
          <p className="text-2xl font-extrabold text-shop-positive-ink">{headline}</p>
          {destination ? <p className="text-sm text-shop-muted">{destination}</p> : null}
          {note ? <p className="text-sm text-shop-muted">{note}</p> : null}
        </div>
        <Link
          href={href}
          className="flex h-11 shrink-0 items-center justify-center rounded-full bg-shop-primary px-5 text-sm font-bold text-shop-on-primary hover:opacity-90 shop-md:ml-auto"
        >
          {text.accountTrackOrder}
        </Link>
      </div>

      <StorefrontOrderSteps steps={steps} messages={messages} />

      {more ? (
        <Link href={more.href} className="flex w-fit items-center gap-1 text-sm font-semibold text-shop-primary-ink hover:underline">
          {more.label}
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </section>
  )
}
