"use client"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { AffiliateAreaNotice } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-notice"
import { AffiliateAreaSkeleton } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-skeleton"
import { AffiliateAreaTabs, type AffiliateAreaTab } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-tabs"
import { AffiliateStatusBadge } from "@harness-monorepo/ui/blocks/affiliates/affiliate-status-badge"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateShopHrefOf } from "@/lib/affiliate-area-view"
import { useAffiliateHome } from "@/services/affiliate-area/affiliate-area-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { AffiliateHomeSection } from "./affiliate-home-section"
import { AffiliateOrdersSection } from "./affiliate-orders-section"
import { AffiliateProductsSection } from "./affiliate-products-section"
import { AffiliateProfileSection } from "./affiliate-profile-section"
import { AffiliateStatementSection } from "./affiliate-statement-section"
import { areaWordsOf } from "./affiliate-area-words"

export interface AffiliateShopScreenProps {
  slug: string
  /** The section the address asks for; one the standing does not offer opens the front page. */
  tab: AffiliateAreaTab
  origin: string
  locale: string
  messages: UiMessages
}

const SELLING: readonly AffiliateAreaTab[] = ["home", "products", "orders", "statement", "profile"]
/** An ended standing has no links to share: the rest stays, history and payouts first. */
const ENDED: readonly AffiliateAreaTab[] = ["home", "orders", "statement", "profile"]
const MISSING = new Set(["AFFILIATE_NOT_FOUND", "STORE_NOT_FOUND", "STORE_MOVED"])

/** `/afiliado/<loja>` (IMPULSEIA-108): the affiliate's page at one shop, its sections in the address. */
export function AffiliateShopScreen({ slug, tab, origin, locale, messages }: AffiliateShopScreenProps) {
  const home = useAffiliateHome(slug)
  const text = messages.affiliateArea

  if (home.isPending) return <AffiliateAreaSkeleton />
  if (home.isError) {
    const missing = home.error instanceof AffiliateError && MISSING.has(home.error.errorCode)
    return <AffiliateAreaNotice kind={missing ? "notFound" : "failed"} onRetry={() => void home.refetch()} linkComponent={AppLink} messages={messages} />
  }

  const read = home.data
  const tabs = read.affiliate.status === "ENDED" ? ENDED : SELLING
  const active = tabs.find((offered) => offered === tab) ?? "home"
  const words = areaWordsOf(locale, origin)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <AppLink href="/afiliado" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {text.back}
        </AppLink>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{read.store.name}</h1>
          <AffiliateStatusBadge status={read.affiliate.status} messages={messages} />
        </div>
      </header>

      <AffiliateAreaTabs active={active} tabs={tabs} hrefOf={(section) => affiliateShopHrefOf(slug, section)} linkComponent={AppLink} messages={messages} />

      {active === "home" ? <AffiliateHomeSection home={read} words={words} messages={messages} /> : null}
      {active === "products" ? <AffiliateProductsSection slug={slug} words={words} messages={messages} /> : null}
      {active === "orders" ? <AffiliateOrdersSection slug={slug} words={words} messages={messages} /> : null}
      {active === "statement" ? <AffiliateStatementSection slug={slug} words={words} messages={messages} /> : null}
      {active === "profile" ? <AffiliateProfileSection slug={slug} home={read} messages={messages} /> : null}
    </div>
  )
}
