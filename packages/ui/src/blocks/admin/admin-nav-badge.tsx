// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface AdminNavBadgeProps {
  /** What waits in the item's area. Nothing is drawn at zero or below: a badge is the presence of something. */
  count: number
  /** The rail is icons only above `lg`: the badge moves to the icon's corner instead of leaving. */
  collapsed?: boolean
}

/** Past it the number stops being read and starts being a width problem. */
export const NAV_BADGE_MAX = 99

/** The number as the badge writes it: itself up to ninety-nine, then "99+". */
export function navBadgeText(count: number): string {
  return count > NAV_BADGE_MAX ? `${NAV_BADGE_MAX}+` : String(count)
}

/**
 * The number beside a menu item (BEELINK-309).
 *
 * Decoration to a screen reader, always: the item says the number in words in its own name, and a
 * bare "3" read after "Pedidos" says nothing. So this is `aria-hidden`, and it is no live region —
 * the count moves on its own all day, and a menu that speaks at every move is one people mute.
 *
 * Its box is fixed — a height under the row's line, a least width equal to it — so a badge that
 * appears, or goes from one digit to two, never changes the row's height; `tabular-nums` keeps a
 * moving count from wobbling. Collapsed, it leaves the flow for the icon's corner: the rail is 56px
 * and has no room beside the icon, and a count that disappears when the rail narrows is the one
 * thing the shopkeeper collapsed the rail to keep watching.
 */
export function AdminNavBadge({ count, collapsed = false }: AdminNavBadgeProps) {
  if (!(count > 0)) return null

  return (
    <span
      aria-hidden="true"
      data-slot="nav-badge"
      className={cn(
        "bg-primary text-primary-foreground ml-auto inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] leading-none font-semibold tabular-nums",
        // The ring is the rail's own colour: it cuts the badge out of the icon it sits on.
        collapsed && "lg:ring-shell lg:absolute lg:top-0 lg:right-1 lg:ml-0 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[10px] lg:ring-2",
      )}
    >
      {navBadgeText(count)}
    </span>
  )
}
