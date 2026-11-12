"use client"

// React
import { useState } from "react"

// UI
import { AffiliateAreaNotice } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-notice"
import { AffiliateProductLinks } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-product-links"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { productLinkViewOf, type AreaWords } from "@/lib/affiliate-area-view"
import { useAffiliateProducts } from "@/services/affiliate-area/affiliate-area-hooks"
import { useCopied } from "./use-copied"
import { useDebounced } from "./use-debounced"

export interface AffiliateProductsSectionProps {
  slug: string
  words: AreaWords
  messages: UiMessages
}

/** Each product's link, and what it pays: searched by name, a page at a time. */
export function AffiliateProductsSection({ slug, words, messages }: AffiliateProductsSectionProps) {
  const [search, setSearch] = useState({ text: "", page: 1 })
  const q = useDebounced(search.text.trim(), 300)
  const products = useAffiliateProducts(slug, search.page, q, true)
  const { copiedKey, copy } = useCopied()

  if (products.isPending) return <Skeleton className="h-72 w-full rounded-xl" />
  if (products.isError) return <AffiliateAreaNotice kind="failed" onRetry={() => void products.refetch()} messages={messages} />

  const { data } = products
  return (
    <AffiliateProductLinks
      products={data.products.map((product) => productLinkViewOf(product, words, messages.affiliateArea.products))}
      pager={{ page: data.page, pageSize: data.pageSize, total: data.total }}
      search={search.text}
      // A new search starts on its first page.
      onSearch={(text) => setSearch({ text, page: 1 })}
      onPage={(page) => setSearch((current) => ({ ...current, page }))}
      copiedId={copiedKey}
      onCopy={copy}
      messages={messages}
    />
  )
}
