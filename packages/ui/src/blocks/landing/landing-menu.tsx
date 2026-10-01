"use client"

// React
import { useRef } from "react"

// Libs
import { MenuIcon, XIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { LANDING_CTA } from "./landing-styles"

export interface LandingMenuLink {
  href: string
  label: string
}

export interface LandingMenuProps {
  /** Names the button for a reader: "Menu". */
  label: string
  /** The page's own sections: plain anchors. */
  sections: readonly LandingMenuLink[]
  /** The legal texts: other pages. */
  pages: readonly LandingMenuLink[]
  signIn: LandingMenuLink
  createStore: LandingMenuLink
  linkComponent?: LinkComponent
  className?: string
}

const ITEM = "flex h-12 items-center rounded-xl px-3 text-base font-semibold hover:bg-brand-sand-soft"

/**
 * The header's menu where its links do not fit: a button that opens them under the header.
 *
 * A `<details>`, not a dialog: it opens before any script arrives, the browser says "expanded" or
 * "collapsed" for it, and it stays inside the landing's shell — a portal would leave the brand's
 * typeface and focus ring behind. The script only closes it: after a link was followed, since an
 * anchor leaves the page where it is and the open menu would cover the section just reached, and on
 * Escape. It takes its sentences as props and imports no dictionary, like the other client blocks.
 */
export function LandingMenu({ label, sections, pages, signIn, createStore, linkComponent: Link = AnchorLink, className }: LandingMenuProps) {
  const menu = useRef<HTMLDetailsElement>(null)
  const close = () => {
    if (menu.current) menu.current.open = false
  }

  return (
    <details
      ref={menu}
      className={cn("group", className)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !menu.current?.open) return
        close()
        menu.current.querySelector("summary")?.focus()
      }}
    >
      <summary aria-label={label} className="flex size-[46px] cursor-pointer list-none items-center justify-center rounded-full border-[1.5px] border-brand-line-strong bg-brand-surface [&::-webkit-details-marker]:hidden">
        <MenuIcon aria-hidden="true" className="size-5 group-open:hidden" />
        <XIcon aria-hidden="true" className="hidden size-5 group-open:block" />
      </summary>
      {/* Over the page, under the header: the page below does not move when it opens. */}
      <div onClick={(event) => (event.target as HTMLElement).closest("a") && close()} className="absolute inset-x-4 top-full z-20 flex flex-col gap-1 rounded-3xl border-[1.5px] border-brand-line bg-brand-surface p-3 shadow-2xl shadow-brand-ink/15 md:inset-x-10">
        <nav aria-label={label} className="flex flex-col">
          {sections.map(({ href, label: name }) => (
            <a key={href} href={href} className={ITEM}>
              {name}
            </a>
          ))}
        </nav>
        <div className="mx-3 my-1 border-t border-brand-line" />
        {pages.map(({ href, label: name }) => (
          <Link key={href} href={href} className={cn(ITEM, "h-10 text-sm font-medium text-brand-text")}>
            {name}
          </Link>
        ))}
        {/* On a phone only: from `sm` the bar above already shows both. */}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
          <Link href={signIn.href} className={cn(LANDING_CTA, "h-12 border-[1.5px] border-brand-ink text-[15px] font-bold")}>
            {signIn.label}
          </Link>
          <Link href={createStore.href} className={cn(LANDING_CTA, "h-12 bg-brand-ink text-[15px] font-bold text-brand-on-ink")}>
            {createStore.label}
          </Link>
        </div>
      </div>
    </details>
  )
}
