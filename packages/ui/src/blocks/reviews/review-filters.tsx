// Libs
import { XIcon } from "lucide-react"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface ReviewStatusFilter {
  key: string
  label: string
  /** Absent while the list is read: a zero beside the skeleton would be a false count. */
  count?: number
  href: string
  active: boolean
}

export interface ReviewRatingFilter {
  /** 1 to 5; null is every rating. */
  rating: number | null
  href: string
  active: boolean
}

export interface ReviewFiltersProps {
  statuses: readonly ReviewStatusFilter[]
  ratings: readonly ReviewRatingFilter[]
  /** The product the list is narrowed to, and the way back to every product. */
  product: { name: string; clearHref: string } | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const PILL = "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm"
const ACTIVE = "bg-foreground text-background border-foreground"

/**
 * The panel's reviews narrowed: all, published or hidden with how many each holds, by rating, and to
 * one product. Links, so every state is an address — shared, reloaded or gone back to.
 */
export function ReviewFilters({ statuses, ratings, product, linkComponent: Link = AnchorLink, messages = defaultMessages }: ReviewFiltersProps) {
  const text = messages.reviews

  return (
    <div className="flex flex-col gap-2">
      <nav aria-label={text.statusLabel} className="flex flex-wrap gap-1.5">
        {statuses.map((status) => (
          <Link key={status.key} href={status.href} aria-current={status.active ? "true" : undefined} className={cn(PILL, status.active ? ACTIVE : "hover:bg-muted")}>
            {status.label}
            {status.count !== undefined ? (
              <>
                {" "}
                <span className="tabular-nums opacity-70">({status.count})</span>
              </>
            ) : null}
          </Link>
        ))}
      </nav>
      <nav aria-label={text.ratingLabel} className="flex flex-wrap items-center gap-1.5">
        {ratings.map((filter) => (
          <Link key={filter.rating ?? "all"} href={filter.href} aria-current={filter.active ? "true" : undefined} className={cn(PILL, filter.active ? ACTIVE : "hover:bg-muted")}>
            {filter.rating === null ? (
              text.ratingAll
            ) : (
              <>
                <span aria-hidden="true">{filter.rating}★</span>
                <span className="sr-only">{filter.rating === 1 ? text.ratingStarOne : format(text.ratingStars, { count: String(filter.rating) })}</span>
              </>
            )}
          </Link>
        ))}
      </nav>
      {product ? (
        <p className={cn(PILL, "bg-muted w-fit border-transparent")}>
          {format(text.productChip, { name: product.name })}
          <Link href={product.clearHref} aria-label={text.clearProduct} className="hover:bg-background -mr-1 inline-flex size-7 items-center justify-center rounded-full">
            <XIcon aria-hidden="true" className="size-3.5" />
          </Link>
        </p>
      ) : null}
    </div>
  )
}
