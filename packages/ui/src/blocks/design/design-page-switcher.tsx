"use client"

// React
import type { MouseEvent } from "react"

// Libs
import { CheckIcon, ChevronDownIcon, FileTextIcon, HouseIcon, PlusIcon } from "lucide-react"

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
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** One page the editor can open, already addressed by the screen. */
export interface DesignPageLink {
  id: string
  kind: "HOME" | "LANDING"
  title: string
  /** The editor's address for this page. */
  href: string
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
}

export interface DesignPageSwitcherProps {
  /** The home and the landings not archived, in the order the list shows them. */
  pages: readonly DesignPageLink[]
  currentId: string
  /** The name on the button, which is the page being edited, known before the list arrives. */
  currentTitle: string
  /** Every link's click, so the screen can ask before an unpublished arrangement is left behind. */
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void
  /** "Nova landing page", when the screen offers it. */
  onCreate?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Which page design mode is editing, in the bar's breadcrumb, and the way to another.
 *
 * Links and not buttons: each page is an address of its own, so a page opens in a new tab with the
 * usual gesture and the browser's Back returns to the one before. A page that is not up says so
 * beside its name; an archived one is left to the Páginas tab, where it can be restored.
 */
export function DesignPageSwitcher({
  pages,
  currentId,
  currentTitle,
  onNavigate,
  onCreate,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: DesignPageSwitcherProps) {
  const text = messages.design.pages

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={format(text.switchTo, { page: currentTitle })}
        className="text-header-foreground hover:bg-header-foreground/10 focus-visible:ring-header-foreground/70 flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-medium outline-none focus-visible:ring-2"
      >
        <span className="truncate">{currentTitle}</span>
        <ChevronDownIcon aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-72">
        {/* Base UI refuses a label outside a group: see AdminStoreMenu. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">{text.heading}</DropdownMenuLabel>
          {pages.map((page) => {
            const Icon = page.kind === "HOME" ? HouseIcon : FileTextIcon
            const current = page.id === currentId

            return (
              <DropdownMenuItem
                key={page.id}
                render={<Link href={page.href} onClick={onNavigate} aria-current={current ? "page" : undefined} />}
                className="gap-2"
              >
                <Icon aria-hidden="true" className="text-muted-foreground size-4" />
                <span className="flex-1 truncate">{page.title}</span>
                {page.status === "PUBLISHED" ? null : (
                  <span className="text-muted-foreground text-xs">{text.status[page.status]}</span>
                )}
                {current ? <CheckIcon aria-hidden="true" className="size-4" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>

        {onCreate ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreate} className="gap-2">
              <PlusIcon aria-hidden="true" className="text-muted-foreground size-4" />
              {text.newLanding}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
