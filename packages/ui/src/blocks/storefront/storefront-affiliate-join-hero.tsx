// React
import type { ReactNode } from "react"

// Libs
import { CheckIcon } from "lucide-react"

// Block
import type { AffiliateJoinPageView } from "@harness-monorepo/ui/lib/affiliate-join"
import { BAND } from "./storefront-band"

/** Where the form is on the page: the closing call leads here, with no script. */
export const JOIN_FORM_ID = "candidatura"

export interface StorefrontAffiliateJoinHeroProps {
  view: Pick<AffiliateJoinPageView, "badge" | "title" | "subtitle" | "highlights">
  /** Beside the title: the form, or its answer once sent. */
  form: ReactNode
  /** The shop's picture, or how a link looks: under the title on a computer, after the form on a phone. */
  media?: ReactNode
}

/**
 * The top of the shop's "Seja afiliado" page (plan 2026-11-14), in the shop's colours: what the shop
 * offers, up to three highlights, and the form already open beside them — the page is the form, with
 * no button between a visitor and it. On a phone the form comes right after the title, before the
 * picture: most visitors arrive there, and the form is what they came for.
 */
export function StorefrontAffiliateJoinHero({ view, form, media }: StorefrontAffiliateJoinHeroProps) {
  return (
    <section className="bg-shop-primary-tint border-shop-line border-b">
      <div className={`${BAND} grid items-start gap-x-10 gap-y-8 py-12 shop-sm:py-16 shop-md:grid-cols-2`}>
        <div className="flex min-w-0 flex-col gap-5">
          <span className="border-shop-line bg-shop-background text-shop-text w-fit rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">{view.badge}</span>
          <h1 className="text-shop-text text-3xl leading-tight font-extrabold tracking-tight break-words shop-sm:text-5xl">{view.title}</h1>
          <p className="text-shop-muted max-w-xl text-lg break-words">{view.subtitle}</p>
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
        {/* Clear of the shop's sticky header when the closing call jumps here. */}
        <div id={JOIN_FORM_ID} className="min-w-0 scroll-mt-24 shop-md:col-start-2 shop-md:row-span-2 shop-md:row-start-1">
          {form}
        </div>
        {media ? <div className="min-w-0">{media}</div> : null}
      </div>
    </section>
  )
}
