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

export function NavMain({ items, activeHref, linkComponent: Link = AnchorLink }: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isCurrent = item.href === activeHref

            return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isCurrent}
                // The styling comes from isActive; a screen reader needs to be told in words.
                aria-current={isCurrent ? "page" : undefined}
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
