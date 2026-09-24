// UI
import { BAND } from "@harness-monorepo/ui/blocks/storefront/storefront-band"
import { StorefrontShelfSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-shelf-skeleton"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

// App
import { getMessages } from "@/lib/locale"

/**
 * The shop window while its read is on the way: a header, a cover and a shelf, grey.
 *
 * A rail, because it is what a showcase is until the shopkeeper says otherwise — the page cannot know
 * this shop's shapes before the read that says them has come back.
 */
export default async function StorefrontLoading() {
  const { ui } = await getMessages()

  return (
    <div className="flex flex-col gap-8">
      <Skeleton aria-hidden="true" className="h-16 w-full rounded-none" />
      <div className={cn(BAND, "flex flex-col gap-10")}>
        <Skeleton aria-hidden="true" className="aspect-[3/1] w-full rounded-xl" />
        <StorefrontShelfSkeleton display="RAIL" messages={ui} />
      </div>
    </div>
  )
}
