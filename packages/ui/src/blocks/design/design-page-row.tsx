"use client"

// React
import type { MouseEvent } from "react"

// Libs
import { ExternalLinkIcon, FileTextIcon, HouseIcon, MoreHorizontalIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@harness-monorepo/ui/components/dropdown-menu"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { DesignPageLink } from "./design-page-switcher"

/** A page as the Páginas tab lists it. */
export interface DesignPageRowData extends DesignPageLink {
  /** What a visitor types after the shop's address: "/" for the home, "/lp/<address>" for a landing. */
  address: string
  inMenu: boolean
  /** The page in the shop window. Null while nobody is served it. */
  shopHref: string | null
}

export interface DesignPageRowProps {
  page: DesignPageRowData
  current: boolean
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void
  onStatus?: (id: string, status: DesignPageLink["status"]) => void
  onSettings?: (id: string) => void
  busy?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One page: a link to edit it, what it is called and where it lives, and — on a landing — a menu to
 * put it up, take it down or look at it in the shop. The home has no menu: it is the shop's own
 * address, always up, and nothing here changes it.
 */
export function DesignPageRow({
  page,
  current,
  onNavigate,
  onStatus,
  onSettings,
  busy = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: DesignPageRowProps) {
  const text = messages.design.pages
  const Icon = page.kind === "HOME" ? HouseIcon : FileTextIcon
  const landing = page.kind === "LANDING"

  return (
    <li className={cn("flex items-center gap-1 rounded-lg border", current ? "border-primary bg-primary/5" : "border-border")}>
      <Link
        href={page.href}
        onClick={onNavigate}
        aria-current={current ? "page" : undefined}
        className="focus-visible:ring-ring flex min-w-0 flex-1 items-start gap-2 rounded-lg p-2.5 outline-none focus-visible:ring-2"
      >
        <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">{page.title}</span>
          <span className="text-muted-foreground truncate text-xs">{landing ? page.address : text.homeHint}</span>
          {landing ? (
            <span className="flex flex-wrap gap-1">
              <Badge variant={page.status === "PUBLISHED" ? "secondary" : "outline"}>{text.status[page.status]}</Badge>
              {page.inMenu ? <Badge variant="outline">{text.inMenu}</Badge> : null}
            </span>
          ) : null}
        </span>
      </Link>

      {landing ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={format(text.actions, { page: page.title })}
            disabled={busy}
            className="hover:bg-muted focus-visible:ring-ring mr-1 grid size-8 shrink-0 place-items-center rounded-md outline-none focus-visible:ring-2 disabled:opacity-50"
          >
            <MoreHorizontalIcon aria-hidden="true" className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {onSettings ? <DropdownMenuItem onClick={() => onSettings(page.id)}>{text.settings}</DropdownMenuItem> : null}
            {onStatus && page.status !== "PUBLISHED" ? (
              <DropdownMenuItem onClick={() => onStatus(page.id, "PUBLISHED")}>{text.publish}</DropdownMenuItem>
            ) : null}
            {onStatus && page.status === "PUBLISHED" ? (
              <DropdownMenuItem onClick={() => onStatus(page.id, "DRAFT")}>{text.unpublish}</DropdownMenuItem>
            ) : null}
            {onStatus && page.status === "ARCHIVED" ? (
              <DropdownMenuItem onClick={() => onStatus(page.id, "DRAFT")}>{text.restore}</DropdownMenuItem>
            ) : null}
            {onStatus && page.status !== "ARCHIVED" ? (
              <DropdownMenuItem onClick={() => onStatus(page.id, "ARCHIVED")}>{text.archive}</DropdownMenuItem>
            ) : null}
            {page.shopHref ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href={page.shopHref} target="_blank" rel="noreferrer" />} className="gap-2">
                  {text.view}
                  <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  )
}
