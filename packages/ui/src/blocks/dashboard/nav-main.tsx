"use client"

// UI
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
 * The panel's menu, one level deep.
 *
 * Children are always visible. They were not before — the shell appended a shop's pages to the
 * top-level list, so an account item and a shop item sat at the same indent with nothing naming
 * which shop the shop ones belonged to. Nesting is what says "these are inside that".
 *
 * Nothing collapses, deliberately. A collapsible menu needs its open state remembered across
 * navigations or it shuts the section someone is working in, and open by default is what this
 * replaced. `SidebarMenuSub` was already exported and already styled; it had simply never been
 * used.
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

                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((child) => {
                      const childCurrent = isCurrent(child, activeHref)

                      return (
                        <SidebarMenuSubItem key={`${child.href}:${child.title}`}>
                          <SidebarMenuSubButton
                            isActive={childCurrent}
                            aria-current={childCurrent ? "page" : undefined}
                            render={<Link href={child.href} />}
                          >
                            {child.icon}
                            <span>{child.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
