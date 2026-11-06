// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductImportReviewSkeletonProps {
  rows?: number
  messages?: UiMessages
}

/**
 * The review's shape while the document is read: the same columns and row height, so the table
 * that replaces it lands without a jump. The line above it says how long the wait can be — a
 * minute of grey boxes with nothing said reads as a page that hung.
 */
export function ProductImportReviewSkeleton({ rows = 5, messages = defaultMessages }: ProductImportReviewSkeletonProps) {
  const text = messages.catalog.products.import

  return (
    <section className="flex flex-col gap-4" aria-busy="true">
      <p className="text-muted-foreground text-sm" role="status">
        {text.readingHint}
      </p>
      <div className="rounded-xl border px-4">
        <ul className="divide-y">
          {Array.from({ length: rows }, (_unused, index) => (
            <li key={index} className="grid gap-3 py-4 sm:grid-cols-[auto_1fr_8rem_14rem] sm:items-start">
              <Skeleton className="mt-2.5 size-4" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
