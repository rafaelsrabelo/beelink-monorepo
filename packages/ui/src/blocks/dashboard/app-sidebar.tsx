"use client"

// React
import type { ComponentProps, ReactNode } from "react"

// UI
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@harness-monorepo/ui/components/sidebar"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { DashboardNavItem, DashboardUser } from "./dashboard-types"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"

export interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  user: DashboardUser
  onSignOut: () => void | Promise<void>
  signingOut?: boolean
  navMain: DashboardNavItem[]
  navSecondary?: DashboardNavItem[]
  activeHref?: string
  brandName?: string
  brandHref?: string
  brandIcon?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The shell around every signed-in screen. It knows who is signed in, and nothing else. */
export function AppSidebar({
  user,
  onSignOut,
  signingOut,
  navMain,
  navSecondary = [],
  activeHref,
  brandName = "Harness",
  brandHref = "/dashboard",
  brandIcon,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href={brandHref} />}
            >
              {brandIcon}
              <span className="text-base font-semibold">{brandName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} activeHref={activeHref} linkComponent={Link} />
        {navSecondary.length > 0 ? (
          <NavSecondary items={navSecondary} className="mt-auto" linkComponent={Link} />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onSignOut={onSignOut} signingOut={signingOut} messages={messages} />
      </SidebarFooter>
    </Sidebar>
  )
}
