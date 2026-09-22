"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { DashboardNavItem } from "../dashboard/dashboard-types"

export interface AdminSidebarProps {
  items: DashboardNavItem[]
  /** Pushed to the foot of the rail — settings, and whatever joins it. */
  footerItems?: DashboardNavItem[]
  activeHref?: string
  /** Below `lg` the rail is a drawer, and this is whether it is showing. */
  open?: boolean
  onClose?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Exact unless the item asks otherwise. `/admin/<slug>` is a prefix of every page inside that shop,
 * so a blanket prefix rule would light the shop's home on the settings page too.
 */
function isCurrent(item: DashboardNavItem, activeHref?: string): boolean {
  if (!activeHref) return false
  if (item.match === "prefix") return activeHref === item.href || activeHref.startsWith(`${item.href}/`)
  return item.href === activeHref
}

function NavList({
  items,
  activeHref,
  onClose,
  Link,
}: {
  items: DashboardNavItem[]
  activeHref?: string
  onClose?: () => void
  Link: LinkComponent
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const current = isCurrent(item, activeHref)
        const shared = cn(
          "flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] transition-colors",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
          current
            ? "bg-nav-active text-nav-active-foreground font-semibold shadow-xs"
            : "text-shell-text hover:bg-nav-hover",
        )
        const inner = (
          <>
            {item.icon ? (
              <span aria-hidden="true" className="text-shell-muted [&>svg]:size-[18px] shrink-0">
                {item.icon}
              </span>
            ) : null}
            <span className="truncate">{item.title}</span>
          </>
        )

        return (
          <li key={`${item.href}:${item.title}`}>
            {item.disabled ? (
              // A button and never a link: an anchor with no destination still takes a tab stop and
              // is still announced as a way forward. aria-disabled and not the native attribute, so
              // the item stays reachable and a screen reader can still find the shape of the menu.
              <button type="button" aria-disabled="true" className={cn(shared, "w-full opacity-50")}>
                {inner}
              </button>
            ) : (
              <Link
                href={item.href}
                onClick={onClose}
                aria-current={current ? "page" : undefined}
                className={shared}
              >
                {inner}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The light rail under the header.
 *
 * Sticky from `lg` up and a drawer below it, which is one element in two modes rather than two
 * elements: a second copy of the menu is a second place for an item to be forgotten.
 *
 * The overlay is a plain div and not a dialog. The drawer holds navigation, and trapping focus in
 * a menu a person opened to leave the page is the kind of correctness that reads as a bug.
 */
export function AdminSidebar({
  items,
  footerItems = [],
  activeHref,
  open = false,
  onClose,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: AdminSidebarProps) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn("top-header fixed inset-0 z-30 bg-black/30 lg:hidden", open ? "block" : "hidden")}
      />

      <aside
        aria-label={messages.shell.navLabel}
        className={cn(
          // `lg:bg-transparent` is load-bearing: above `lg` the column in admin-shell owns both the
          // rail's colour and its cut corner, and this element sits exactly on top of that corner.
          // Painting its own background here made it square again — the radius was there the whole
          // time, with an opaque square drawn over it.
          "bg-shell lg:bg-transparent",
          "top-header h-[calc(100dvh-var(--header-height))] w-sidebar fixed left-0 z-40 shrink-0 overflow-y-auto px-2 py-3 transition-transform",
          // The left half of the panel's cut top. The page takes the right half, and between them
          // they leave one rounded block with the header's colour showing at either end.
          // The corner is on the column that holds this, in admin-shell — it has to be, because
          // that column is the one that reaches the bottom of a long page.
          "lg:sticky lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <nav className="flex h-full flex-col justify-between gap-4">
          <NavList items={items} activeHref={activeHref} onClose={onClose} Link={Link} />
          {footerItems.length > 0 ? (
            <NavList items={footerItems} activeHref={activeHref} onClose={onClose} Link={Link} />
          ) : null}
        </nav>
      </aside>
    </>
  )
}
