"use client"

// Libs
import { ChevronsUpDownIcon, PlusIcon, StoreIcon } from "lucide-react"

// UI
import { Avatar, AvatarFallback, AvatarImage } from "@harness-monorepo/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@harness-monorepo/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@harness-monorepo/ui/components/sidebar"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { initialsOf } from "./dashboard-types"

export interface WorkspaceOption {
  slug: string
  name: string
  logoUrl?: string | null
  /** Built by the screen: a block never knows a shop's panel lives at `/admin/<slug>`. */
  href: string
}

export interface WorkspaceSwitcherProps {
  /** The shop being worked in, or null on a screen that belongs to no shop. */
  current: WorkspaceOption | null
  workspaces: readonly WorkspaceOption[]
  createHref: string
  loading?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Which shop you are working in, and how to work in another.
 *
 * Every shop is a workspace, and the panel is only ever inside one of them — which is why this sits
 * where the product's own name used to. A shopkeeper with three shops is three shopkeepers as far
 * as the screens below are concerned, and the one thing they must always be able to answer is
 * "whose products am I looking at".
 *
 * The scope lives in the URL and not in here. Switching is a link to the other shop's panel, so a
 * page is bookmarkable, shareable and survives a reload — a switcher that kept the choice in state
 * would hand two tabs the same shop and no way to tell which.
 */
export function WorkspaceSwitcher({
  current,
  workspaces,
  createHref,
  loading = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: WorkspaceSwitcherProps) {
  const text = messages.workspace
  const { isMobile } = useSidebar()

  const face = (workspace: WorkspaceOption) => (
    <Avatar className="size-8 rounded-lg">
      {workspace.logoUrl ? <AvatarImage src={workspace.logoUrl} alt="" /> : null}
      <AvatarFallback className="rounded-lg text-xs">{initialsOf(workspace.name)}</AvatarFallback>
    </Avatar>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}
            aria-label={text.switchLabel}
          >
            {current ? (
              face(current)
            ) : (
              <span className="bg-muted flex size-8 items-center justify-center rounded-lg">
                <StoreIcon aria-hidden="true" className="size-4" />
              </span>
            )}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="text-foreground/70 truncate text-xs">{text.label}</span>
              <span className="truncate font-medium">
                {current?.name ?? (loading ? text.loading : text.none)}
              </span>
            </div>
            <ChevronsUpDownIcon aria-hidden="true" className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="start"
          >
            {/*
              The label lives INSIDE the group, and that is not a style choice: it renders as Base
              UI's `Menu.GroupLabel`, which reads the group's context to name it for a screen reader.
              Outside one it throws at runtime — which is what it did, because this block shipped
              without a test that opened it.
            */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                {text.switchLabel}
              </DropdownMenuLabel>

              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.slug}
                  // The current one is marked rather than hidden: a list that drops the shop you
                  // are in makes a three-shop switcher show two, and you count to work out which.
                  aria-current={workspace.slug === current?.slug ? "true" : undefined}
                  render={<Link href={workspace.href} />}
                >
                  {face(workspace)}
                  <span className="truncate">{workspace.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/*
              No "change shop" item. The list above IS the change: clicking a shop goes to it, and
              a second control that only leads back to a screen offering the same list is a step
              that shows you a link to where you were already going.
            */}
            <DropdownMenuItem render={<Link href={createHref} />}>
              <PlusIcon aria-hidden="true" className="size-4" />
              {text.create}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
