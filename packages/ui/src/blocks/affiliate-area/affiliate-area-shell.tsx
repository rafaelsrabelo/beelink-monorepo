"use client"

// React
import type { ReactNode } from "react"

// Libs
import { ChevronDownIcon, LayoutDashboardIcon, LogOutIcon } from "lucide-react"

// UI
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@harness-monorepo/ui/components/dropdown-menu"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliateAreaShellProps {
  user: { name: string; email: string }
  /** The way into the shop's panel, for an account that owns a shop too; null for one that does not. */
  panelHref: string | null
  onSignOut: () => void
  signingOut?: boolean
  children: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The frame of the affiliate's own area (IMPULSEIA-108): bee-link's mark, the account and nothing of
 * a shop's panel — the area is no shop's panel, so no shop's menu is drawn around it.
 */
export function AffiliateAreaShell({ user, panelHref, onSignOut, signingOut = false, children, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateAreaShellProps) {
  const text = messages.affiliateArea

  return (
    <div className="bg-shell-content flex min-h-svh flex-col">
      <header className="bg-header text-header-foreground flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
        <Link href="/afiliado" className="flex items-baseline gap-2 font-semibold">
          <span>{text.brand}</span>
          <span className="text-sm font-normal opacity-80">{text.title}</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={text.account.menu}
            className="bg-header-field hover:bg-header-field-hover focus-visible:ring-header-foreground/70 flex h-8 max-w-56 items-center gap-2 rounded-lg px-2 text-sm outline-none focus-visible:ring-2"
          >
            <span className="truncate">{user.name}</span>
            <ChevronDownIcon aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            {panelHref ? (
              <DropdownMenuItem render={<Link href={panelHref} />} className="gap-2">
                <LayoutDashboardIcon aria-hidden="true" className="text-muted-foreground size-4" />
                {text.account.panel}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem disabled={signingOut} onClick={() => onSignOut()} className="gap-2">
              <LogOutIcon aria-hidden="true" className="text-muted-foreground size-4" />
              {text.account.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 lg:py-8">{children}</main>
    </div>
  )
}
