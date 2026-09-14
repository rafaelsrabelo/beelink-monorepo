"use client"

// React
import type { ComponentProps } from "react"

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

export interface NavSecondaryProps extends ComponentProps<typeof SidebarGroup> {
  items: DashboardNavItem[]
  linkComponent?: LinkComponent
}

export function NavSecondary({ items, linkComponent: Link = AnchorLink, ...props }: NavSecondaryProps) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton size="sm" render={<Link href={item.href} />}>
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
