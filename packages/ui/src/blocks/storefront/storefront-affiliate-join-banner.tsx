// Libs
import { ArrowRightIcon } from "lucide-react"

// Block
import type { AffiliateJoinBannerView } from "@harness-monorepo/ui/lib/affiliate-join"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontAffiliateJoinBannerProps {
  view: AffiliateJoinBannerView
  /** The shop's "Seja afiliado" page. */
  href: string
  linkComponent?: LinkComponent
}

/**
 * The shop's invitation to sell for it (plan 2026-11-14), in its colours, leading to the page: the
 * "Programa de afiliados" block of design mode (plan 2026-11-19). A card and no margin of its own —
 * the band it sits in gives the page's.
 */
export function StorefrontAffiliateJoinBanner({ view, href, linkComponent: Link = AnchorLink }: StorefrontAffiliateJoinBannerProps) {
  return (
    <div className="bg-shop-primary text-shop-on-primary flex flex-wrap items-center justify-between gap-6 rounded-3xl p-8">
      <div className="flex min-w-0 flex-[1_1_26rem] flex-col gap-2">
        <h2 className="text-2xl leading-tight font-extrabold break-words shop-sm:text-3xl">{view.title}</h2>
        <p className="opacity-90 break-words">{view.text}</p>
      </div>
      <Link href={href} className="bg-shop-on-primary text-shop-primary inline-flex min-h-12 items-center gap-2 rounded-xl px-7 font-bold">
        {view.cta}
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </div>
  )
}
