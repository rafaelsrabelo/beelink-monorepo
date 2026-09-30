"use client"

// React
import { useEffect } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { ReviewFilters } from "@harness-monorepo/ui/blocks/reviews/review-filters"
import { ReviewList } from "@harness-monorepo/ui/blocks/reviews/review-list"
import { ReviewListSkeleton } from "@harness-monorepo/ui/blocks/reviews/review-list-skeleton"
import { ReviewsFailed } from "@harness-monorepo/ui/blocks/reviews/reviews-failed"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { shopReviewRowsOf, shopReviewsAddressOf, shopReviewsHrefOf, shopReviewsQueryOf } from "@/lib/shop-review-view"
import { useMarkShopReviewsSeen, useSetShopReviewVisibility, useShopReviews } from "@/services/reviews/shop-review-hooks"

export interface ReviewsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
  web: WebMessages
}

const RATINGS = [null, 5, 4, 3, 2, 1] as const

/**
 * The shop's reviews (J19): what customers said of its products, narrowed by status, rating and
 * product — every state in the address — and hidden or published again one by one. Opening it is
 * seeing them: the menu's count of new ones goes back to nothing.
 */
export function ReviewsScreen({ slug, locale, messages, web }: ReviewsScreenProps) {
  const text = messages.reviews
  const router = useRouter()
  const address = shopReviewsAddressOf(useSearchParams())
  const list = useShopReviews(slug, shopReviewsQueryOf(address))
  const toggle = useSetShopReviewVisibility(slug)
  const { mutate: markSeen } = useMarkShopReviewsSeen(slug)
  const hrefOf = (next: Parameters<typeof shopReviewsHrefOf>[2]) => shopReviewsHrefOf(slug, address, next)

  useEffect(() => markSeen(), [markSeen, slug])

  const counts = list.data?.counts
  const statuses = [
    { key: "ALL", label: text.statusAll, count: counts?.ALL ?? 0, href: hrefOf({ status: undefined }), active: address.status === undefined },
    { key: "PUBLISHED", label: text.statusPublished, count: counts?.PUBLISHED ?? 0, href: hrefOf({ status: "PUBLISHED" }), active: address.status === "PUBLISHED" },
    { key: "HIDDEN", label: text.statusHidden, count: counts?.HIDDEN ?? 0, href: hrefOf({ status: "HIDDEN" }), active: address.status === "HIDDEN" },
  ]
  const ratings = RATINGS.map((rating) => ({ rating, href: hrefOf({ rating: rating ?? undefined }), active: (address.rating ?? null) === rating }))
  // The product's name comes from its reviews on the page; none on it, and the chip still names one.
  const productName = list.data?.reviews.find((review) => review.product.id === address.productId)?.product.name ?? text.productUnknown
  const filtered = address.status !== undefined || address.rating !== undefined || address.productId !== undefined

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </header>

      <ReviewFilters
        statuses={statuses}
        ratings={ratings}
        product={address.productId ? { name: productName, clearHref: hrefOf({ productId: undefined }) } : null}
        linkComponent={AppLink}
        messages={messages}
      />

      {toggle.error ? <p role="alert" className="text-destructive text-sm">{pageErrorCopy(toggle.error, web)}</p> : null}

      <section aria-label={text.title} className="bg-card rounded-xl border">
        {list.isPending ? (
          <ReviewListSkeleton />
        ) : !list.data ? (
          <ReviewsFailed onRetry={() => void list.refetch()} messages={messages} />
        ) : (
          <ReviewList
            rows={shopReviewRowsOf(list.data.reviews, slug, address, locale)}
            empty={filtered ? "filtered" : "none"}
            busyId={toggle.isPending ? toggle.variables?.reviewId : null}
            onToggle={(row) => toggle.mutate({ reviewId: row.id, hidden: !row.hidden })}
            linkComponent={AppLink}
            messages={messages}
          />
        )}
      </section>

      {list.data && list.data.total > list.data.pageSize ? (
        <TablePager
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onPageChange={(page) => router.push(hrefOf({ page }) as Parameters<typeof router.push>[0])}
          busy={list.isFetching}
          rangeLabel={(from, to, total) => format(text.range, { from: String(from), to: String(to), total: String(total) })}
        />
      ) : null}
    </div>
  )
}
