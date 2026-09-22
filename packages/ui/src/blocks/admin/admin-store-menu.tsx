"use client"

// React
import type { ReactNode } from "react"

// Libs
import { CheckIcon, ChevronDownIcon, LogOutIcon, PlusIcon, StoreIcon } from "lucide-react"

// UI
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@harness-monorepo/ui/components/dropdown-menu"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { DashboardUser } from "../dashboard/dashboard-types"
import type { WorkspaceOption } from "./admin-types"

export interface AdminStoreMenuProps {
  current: WorkspaceOption | null
  workspaces: readonly WorkspaceOption[]
  createHref: string
  user: DashboardUser
  onSignOut: () => void | Promise<void>
  signingOut?: boolean
  /**
   * The language control, built by the screen. A block cannot own it: switching language writes a
   * cookie and re-renders a route, and neither is this package's to do.
   */
  localeSlot?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Two initials, so a shop with no logo still has a mark rather than a hole. */
function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * The header's right-hand control: which shop you are in, and everything about the account.
 *
 * It replaces two separate things — a switcher at the top of the sidebar and a user block at its
 * foot — because they answered the same question from opposite ends of the screen. Who you are and
 * which shop you are in is one thought, and it belongs where every panel of this shape puts it.
 */
export function AdminStoreMenu({
  current,
  workspaces,
  createHref,
  user,
  onSignOut,
  signingOut = false,
  localeSlot,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: AdminStoreMenuProps) {
  const text = messages.shell

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={text.storeMenu}
        className="bg-header-field text-header-foreground hover:bg-header-field-hover focus-visible:ring-header-foreground/70 flex h-8 items-center gap-2 rounded-lg pr-2 pl-1 text-sm outline-none focus-visible:ring-2"
      >
        <span className="bg-header-accent text-header-accent-foreground grid size-6 place-items-center rounded-md text-[11px] font-semibold">
          {current ? initialsOf(current.name) : <StoreIcon aria-hidden="true" className="size-3.5" />}
        </span>
        <span className="hidden max-w-40 truncate font-medium sm:block">
          {current?.name ?? text.noStore}
        </span>
        <ChevronDownIcon aria-hidden="true" className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72">
        {/* Base UI refuses a label outside a group: MenuGroupLabel reads a context only
            Menu.Group provides, and a bare one throws at render rather than degrading. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            {text.yourStores}
          </DropdownMenuLabel>

          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.slug}
              render={<Link href={workspace.href} />}
              className="gap-2"
            >
              <StoreIcon aria-hidden="true" className="text-muted-foreground size-4" />
              <span className="flex-1 truncate">{workspace.name}</span>
              {workspace.slug === current?.slug ? (
                <CheckIcon aria-hidden="true" className="size-4" />
              ) : null}
            </DropdownMenuItem>
          ))}

          <DropdownMenuItem render={<Link href={createHref} />} className="gap-2">
            <PlusIcon aria-hidden="true" className="text-muted-foreground size-4" />
            {text.createStore}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </div>

        {localeSlot ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">{localeSlot}</div>
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled={signingOut} onClick={() => void onSignOut()} className="gap-2">
          <LogOutIcon aria-hidden="true" className="text-muted-foreground size-4" />
          {text.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
