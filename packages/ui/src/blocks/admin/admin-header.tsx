"use client"

// React
import type { ReactNode } from "react"

// Libs
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AdminHeaderProps {
  /** Where the brand returns to. The screen owns the route. */
  brandHref: string
  /** The search, the bell and the shop menu, built by the screen. */
  search: ReactNode
  bell: ReactNode
  storeMenu: ReactNode
  onToggleSidebar: () => void
  /**
   * The desktop twin of the hamburger. Optional, because the header is also mounted where there is
   * no rail to narrow — omitting it draws no control rather than drawing a dead one.
   */
  onToggleRail?: () => void
  /** Which way the control points, and which of the two sentences it says. */
  railCollapsed?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The one dark bar, across the top of the panel and over the sidebar.
 *
 * Three columns, and the middle one is the search. Below `lg` the grid collapses to
 * `auto 1fr auto` so the search keeps the room it has; above it the middle column is capped at
 * 560px and centred, which is what puts the brand and the account controls at the outer edges
 * rather than crowding the field.
 *
 * Everything inside the two outer columns arrives as a node. The header decides where they sit and
 * how the bar looks; what a bell does when it is pressed, and which shops exist, belong to the
 * screen — this package may not fetch and may not route.
 */
export function AdminHeader({
  brandHref,
  search,
  bell,
  storeMenu,
  onToggleSidebar,
  onToggleRail,
  railCollapsed = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: AdminHeaderProps) {
  const text = messages.shell

  return (
    <header className="bg-header h-header fixed inset-x-0 top-0 z-50 grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 lg:grid-cols-[1fr_minmax(0,35rem)_1fr]">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={text.menuOpen}
          className="text-header-foreground hover:bg-header-field-hover focus-visible:ring-header-foreground/70 grid size-8 place-items-center rounded-lg outline-none focus-visible:ring-2 lg:hidden"
        >
          <MenuIcon aria-hidden="true" className="size-4" />
        </button>

        {/*
          Two controls and not one, because below `lg` the rail is a drawer that is open or shut and
          above it the rail is always there and only narrows. One button doing both would have to
          say two different things at two different widths, and a control whose name changes with
          the window is a control nobody trusts.
        */}
        {onToggleRail ? (
          <button
            type="button"
            onClick={onToggleRail}
            aria-label={railCollapsed ? text.railExpand : text.railCollapse}
            aria-pressed={railCollapsed}
            className="text-header-foreground hover:bg-header-field-hover focus-visible:ring-header-foreground/70 hidden size-8 place-items-center rounded-lg outline-none focus-visible:ring-2 lg:grid"
          >
            {railCollapsed ? (
              <PanelLeftOpenIcon aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftCloseIcon aria-hidden="true" className="size-4" />
            )}
          </button>
        ) : null}

        <Link
          href={brandHref}
          className="focus-visible:ring-header-foreground/70 flex items-center gap-2 rounded-md px-1 py-1 outline-none focus-visible:ring-2"
        >
          <span className="text-header-foreground hidden text-[15px] font-semibold tracking-tight sm:block">
            {text.brand} 
          </span>
        </Link>
      </div>

      {search}

      <div className="flex items-center justify-end gap-1.5">
        {bell}
        {storeMenu}
      </div>
    </header>
  )
}
