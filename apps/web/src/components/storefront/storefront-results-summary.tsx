// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { StorefrontResultsCount } from "@harness-monorepo/ui/blocks/storefront/storefront-results-count"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontResultsSummaryProps {
  /** The same request the grid waits on: the count is the API's total, never one page's length. */
  catalogue: Promise<StorefrontCatalog>
  term?: string
  locale: string
  messages: UiMessages
}

/** The results band's count, once the shelf has answered. It streams beside a title already drawn. */
export async function StorefrontResultsSummary({ catalogue: pending, term, locale, messages }: StorefrontResultsSummaryProps) {
  const catalogue = await pending

  return (
    <StorefrontResultsCount
      page={catalogue.page}
      pageSize={catalogue.pageSize}
      total={catalogue.total}
      {...(term ? { term } : {})}
      locale={locale}
      messages={messages}
    />
  )
}
