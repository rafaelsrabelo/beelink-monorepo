// React
import type { ReactNode } from "react"

// Libs
import { ShoppingBagIcon, UserRoundIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BAND } from "./storefront-band"
import { StorefrontSearch } from "./storefront-search"

/** One entry of a site's menu: a named band, as an anchor. The screen builds them. */
export interface StorefrontMenuItem {
  id: string
  label: string
  href: string
}

export interface StorefrontMastheadProps {
  name: string
  logoUrl?: string | null
  homeHref: string
  /** See `StorefrontWindowProps` — the plain search goes by address, the live one as a node. */
  searchSlot?: ReactNode
  searchAction?: string
  searchValue?: string
  searchHidden?: Record<string, string>
  cartHref?: string
  cartCount?: number
  accountHref?: string
  /** A site's named bands, as anchors. A shop passes none. */
  menu?: readonly StorefrontMenuItem[]
  /** A site's button — its contact band. Kept out of `menu`, which would list it twice. */
  cta?: { label: string; href: string } | null
  /** The categories row, drawn inside the same slab. */
  categories?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The top of the shop window: logo, then either a shop's search and icons or a site's menu and
 * button, and the categories row under them. Its own file because the window it came out of had
 * passed the line limit and a site's button was about to make it longer.
 */
export function StorefrontMasthead({
  name,
  logoUrl,
  homeHref,
  searchSlot,
  searchAction,
  searchValue = "",
  searchHidden,
  cartHref,
  cartCount,
  accountHref,
  menu = [],
  cta = null,
  categories,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontMastheadProps) {
  const text = messages.storefront

  return (
    <>
    {/*
      ------------------------------------------------------------- 1 · header + 2 · the menu

      One painted block and not two bands, because they are one thing to look at: the shops this
      was measured against put the logo, the search and the menu on a single dark slab, and a
      menu painted in the page's own background reads as content that happens to be at the top.

      It is painted in `--shop-header`, which is the point of the column. The shopkeeper's panel
      has always had a "Cor do topo" field, and the top was drawn in `--shop-background` — so the
      one colour named after this band was the one band that ignored it.

      One `<header>` wraps both, so the banner landmark is the whole slab: the menu is part of
      the shop's masthead, and a reader jumping to the banner should land on the thing that has
      the search and the categories in it, not on a strip with a logo.
    */}
    <header
      className="sticky top-0 z-30 w-full"
      style={{ backgroundColor: "var(--shop-header)", color: "var(--shop-on-header)" }}
    >
      <div className={cn(BAND, "flex h-16 items-center gap-3 shop-sm:gap-6")}>
        {/*
          The logo stands in for the name rather than sitting beside it — so it carries the name
          as its `alt`, and the link keeps an accessible name without the word being drawn twice.
          A shop with no logo yet falls back to the name as text: the masthead is never empty.
        */}
        <Link href={homeHref} className="flex shrink-0 items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-9 w-auto max-w-40 object-contain" />
          ) : (
            <span className="text-base font-semibold">{name}</span>
          )}
        </Link>

        {/*
          Centred and capped, not stretched.

          The field used to take every pixel between the logo and the icons, so on a wide monitor
          the shop's masthead was one enormous search box with a name at one end — and a field
          that wide reads as the page's subject rather than as a tool. Capped, it is centred on
          the slab whatever the logo's width, which is what the shops this was measured against
          all do.

          Never autofocused: the header is on every page, and a caret that jumps into it puts a
          phone keyboard over the shop on every arrival.
        */}
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="w-full max-w-md">
            {searchSlot ??
              (searchAction ? (
                <StorefrontSearch
                  action={searchAction}
                  value={searchValue}
                  hidden={searchHidden}
                  tone="panel"
                  messages={messages}
                />
              ) : null)}
          </div>
        </div>

        {/*
          Hidden on a phone rather than folded into a drawer: the same names are in the footer,
          one swipe away, and a drawer is a script on a page that must read without one.
        */}
        {menu.length ? (
          <nav aria-label={text.siteMenu} className="hidden items-center gap-5 shop-sm:flex">
            {menu.map((entry) => (
              <Link key={entry.id} href={entry.href} className="text-sm font-medium opacity-90 hover:opacity-100">
                {entry.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {/*
          A site's one call to action — its contact band, by name. Shown on a phone as well, where
          the menu is not: it is one button and it fits, and it is the reason the page exists.
        */}
        {cta ? (
          <Link
            href={cta.href}
            className="inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold"
            style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
          >
            {cta.label}
          </Link>
        ) : null}

        <div className="flex shrink-0 items-center gap-1">
          {accountHref ? (
            <Link href={accountHref} aria-label={text.account} className="rounded-full p-2 opacity-80">
              <UserRoundIcon aria-hidden="true" className="size-5" />
            </Link>
          ) : null}
          {cartHref ? (
            <Link href={cartHref} aria-label={text.cart} className="relative rounded-full p-2 opacity-80">
              <ShoppingBagIcon aria-hidden="true" className="size-5" />
              {cartCount ? (
                <span
                  className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
                >
                  {cartCount}
                </span>
              ) : null}
            </Link>
          ) : null}
        </div>
      </div>

      {categories ? (
        <div
          className="w-full border-t"
          style={{ borderColor: "color-mix(in oklab, var(--shop-on-header) 18%, transparent)" }}
        >
          <div className={BAND}>{categories}</div>
        </div>
      ) : null}
    </header>
    </>
  )
}
