// React
import type { ReactNode } from "react"

// Libs
import { CheckIcon } from "lucide-react"

// Block
import type { AffiliateJoinPageView } from "@harness-monorepo/ui/lib/affiliate-join"
import { BAND } from "./storefront-band"

export interface StorefrontAffiliateJoinHeroProps {
  view: Pick<AffiliateJoinPageView, "badge" | "title" | "subtitle" | "ctaLabel" | "highlights">
  /** Beside the title: the shop's picture, how a link looks, the form or its answer. */
  aside: ReactNode
  onOpen: () => void
}

/**
 * The top of the shop's "Seja afiliado" page (plan 2026-11-14), in the shop's colours: what the shop
 * offers, the button that opens the form in place, and up to three highlights.
 */
export function StorefrontAffiliateJoinHero({ view, aside, onOpen }: StorefrontAffiliateJoinHeroProps) {
  return (
    <section className="bg-shop-primary-tint border-shop-line border-b">
      <div className={`${BAND} flex flex-wrap items-center gap-10 py-12 shop-sm:py-16`}>
        <div className="flex min-w-0 flex-[1_1_28rem] flex-col gap-5">
          <span className="border-shop-line bg-shop-background text-shop-text w-fit rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">{view.badge}</span>
          <h1 className="text-shop-text text-3xl leading-tight font-extrabold tracking-tight break-words shop-sm:text-5xl">{view.title}</h1>
          <p className="text-shop-muted max-w-xl text-lg break-words">{view.subtitle}</p>
          <button type="button" onClick={onOpen} className="bg-shop-primary text-shop-on-primary focus-visible:ring-shop-primary w-fit min-h-12 rounded-xl px-7 text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
            {view.ctaLabel}
          </button>
          {view.highlights.length > 0 ? (
            <ul className="text-shop-text flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {view.highlights.map((highlight, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckIcon aria-hidden="true" className="text-shop-primary-ink size-4 shrink-0" />
                  <span className="break-words">{highlight}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="min-w-0 flex-[1_1_22rem]">{aside}</div>
      </div>
    </section>
  )
}
