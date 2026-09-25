// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { RELATED_CARD_WIDTH } from "./storefront-related-rail"

/**
 * The related rail while its products are on their way, in its own shape — the title's line and six
 * compact cards — so the sections under it do not jump when it arrives. Hidden from a reader: it is
 * the page's last thing to load, and saying so would interrupt the product being read.
 */
export function StorefrontRelatedSkeleton() {
  return (
    // The lower sections' frame, as StorefrontProductSection draws it.
    <div aria-hidden="true" className="flex flex-col gap-4 border-t border-shop-line py-7">
      <Skeleton className="h-[26px] w-72 max-w-full" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }, (_, at) => (
          <div key={at} className={cn("flex shrink-0 flex-col gap-1.5", RELATED_CARD_WIDTH)}>
            <Skeleton className="h-[180px] w-full rounded-[12px]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-[22px] w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
