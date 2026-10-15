// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface AdminPlanCardSkeletonProps {
  /** The rail is icons only, above `lg`: the icon's place alone. */
  collapsed?: boolean
}

/**
 * The plan's card while the open page's plan is read (BEELINK-220): the card's box, its icon and its two
 * lines, each as tall as what replaces it, so the foot of the rail does not move when the card arrives.
 * The pulses take the rail's grey: the skeleton's own would vanish into the card's white.
 */
export function AdminPlanCardSkeleton({ collapsed = false }: AdminPlanCardSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="plan-card-skeleton"
      className={cn(
        "bg-shell-surface border-shell-border flex items-start gap-2.5 rounded-lg border px-[7px] py-2",
        collapsed && "lg:justify-center lg:border-transparent lg:bg-transparent lg:px-0 lg:py-[7px]",
      )}
    >
      <Skeleton className="bg-shell mt-px size-[18px] shrink-0 rounded" />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2 py-px", collapsed && "lg:hidden")}>
        <Skeleton className="bg-shell h-3.5 w-24" />
        <Skeleton className="bg-shell h-3 w-36 max-w-full" />
      </div>
    </div>
  )
}
