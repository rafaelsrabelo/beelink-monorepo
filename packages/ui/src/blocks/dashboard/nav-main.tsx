"use client"

// UI
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@harness-monorepo/ui/components/sidebar"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { DashboardNavItem } from "./dashboard-types"

export interface NavMainProps {
  items: DashboardNavItem[]
  activeHref?: string
  linkComponent?: LinkComponent
}

/**
 * Exact unless the item asks otherwise. `/admin/<slug>` is a prefix of every page inside that
 * shop, so a blanket prefix rule would mark the overview current on the settings page too.
 */
function isCurrent(item: DashboardNavItem, activeHref?: string): boolean {
  if (!activeHref) return false
  if (item.match === "prefix") return activeHref === item.href || activeHref.startsWith(`${item.href}/`)
  return item.href === activeHref
}

/**
 * The panel's menu: one level, and one level is the design.
 *
 * It briefly grew a second, to put a shop's pages under the item they belong to. That was the
 * wrong answer to a real complaint — a sidebar is for the handful of places the product has, and
 * which shop you are editing belongs to the page, not to a branch that appears and disappears as
 * you navigate. What survived is `match`, which is about something else entirely.
 */
export function NavMain({ items, activeHref, linkComponent: Link = AnchorLink }: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const current = isCurrent(item, activeHref)

            return (
              <SidebarMenuItem key={`${item.href}:${item.title}`}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={current}
                  // The styling comes from isActive; a screen reader needs to be told in words.
                  aria-current={current ? "page" : undefined}
                  render={<Link href={item.href} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>

              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
