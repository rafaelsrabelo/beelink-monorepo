// Types
import type { PublicCashback } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontAccountCashback } from "@harness-monorepo/ui/blocks/storefront/storefront-account-cashback"
import { StorefrontAccountOutcome } from "@harness-monorepo/ui/blocks/storefront/storefront-account-outcome"
import { StorefrontPagination } from "@harness-monorepo/ui/blocks/storefront/storefront-pagination"

// App
import { AppLink } from "@/components/app-link"
import { cashbackPageOf, cashbackTabViewOf } from "@/lib/cashback-tab-view"
import { customerCashbackAt } from "@/lib/customer-cashback"
import { PAGE_KEY, type StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface CashbackTabProps {
  slug: string
  routes: StorefrontRoutes
  query: SectionQuery
  /** The shop's cashback while it is on; null while off — the shopper still has what they were given. */
  rule: PublicCashback | null
  locale: string
  messages: UiMessages
}

/**
 * Cashback, in Minha conta (BEELINK-244): what the shopper can spend at this shop, what waits on a
 * delivery, the credits with each one's validity and the statement, a page at a time by the address.
 * Read on the server with their session. One that could not be read says so — never "you have none".
 */
export async function CashbackTab({ slug, routes, query, rule, locale, messages }: CashbackTabProps) {
  const cashback = await customerCashbackAt(slug, cashbackPageOf(query[PAGE_KEY]))
  if (!cashback) return <StorefrontAccountOutcome tone="failed" message={messages.storefront.accountCashbackTab.failed} />

  const pageCount = Math.max(1, Math.ceil(cashback.total / cashback.pageSize))

  return (
    <StorefrontAccountCashback
      {...cashbackTabViewOf(cashback, rule, { locale, messages })}
      pagination={
        pageCount > 1 ? (
          <StorefrontPagination page={cashback.page} pageCount={pageCount} href={(next) => routes.accountTab("cashback", { [PAGE_KEY]: next > 1 ? String(next) : undefined })} linkComponent={AppLink} messages={messages} />
        ) : null
      }
      messages={messages}
    />
  )
}
