// React
import type { CSSProperties, ReactNode } from "react"

// Libs
import { ShoppingBagIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
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
  /** Between the logo and the search: the "Entregar em" block, when the shop has one to draw. */
  deliverTo?: ReactNode
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

/** The top row, as 5a and 5b draw it, and the menu row under it with its border. */
const ROW_HEIGHT_PX = 72
const MENU_HEIGHT_PX = 45

/**
 * The top of the shop window: logo, then either a shop's search and links or a site's menu and
 * button, and the categories row under them.
 *
 * Drawn as the 5a/5b designs draw it: a 72px row with 28px between its parts, the search taking
 * every pixel between the "Entregar em" block and the account link, and the account and the cart
 * as words beside their marks. The search used to be capped and centred at the owner's request;
 * the designs settled it the other way, and this follows them.
 *
 * It writes its own height into `--shop-masthead-height`, for what sticks below it — the product
 * page's buy box — to read instead of hardcoding a number. The value counts the categories row
 * as the bar draws it; the row of photographs is taller, and whoever needs the exact height under
 * that variant measures it.
 */
export function StorefrontMasthead({
  name,
  logoUrl,
  homeHref,
  deliverTo,
  searchSlot,
  searchAction,
  searchValue = "",
  searchHidden,
  cartHref,
  cartCount = 0,
  accountHref,
  menu = [],
  cta = null,
  categories,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontMastheadProps) {
  const text = messages.storefront
  const height = ROW_HEIGHT_PX + (categories ? MENU_HEIGHT_PX : 0)

  return (
    /*
      ------------------------------------------------------------- 1 · header + 2 · the menu

      One painted block and not two bands, because they are one thing to look at: the shops this
      was measured against put the logo, the search and the menu on a single dark slab, and a
      menu painted in the page's own background reads as content that happens to be at the top.

      It is painted in `--shop-header`, which is the point of the column: the shopkeeper's panel
      has always had a "Cor do topo" field, and this is the band it names.

      One `<header>` wraps both, so the banner landmark is the whole slab: the menu is part of
      the shop's masthead, and a reader jumping to the banner should land on the thing that has
      the search and the categories in it, not on a strip with a logo.
    */
    <header
      className="sticky top-0 z-30 w-full"
      style={
        {
          backgroundColor: "var(--shop-header)",
          color: "var(--shop-on-header)",
          "--shop-masthead-height": `${height}px`,
        } as CSSProperties
      }
    >
      <div className={cn(BAND, "flex items-center gap-4 shop-lg:gap-7")} style={{ height: ROW_HEIGHT_PX }}>
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

        {/* Hidden on a phone, where the row has room for the search and the cart and no more. */}
        {deliverTo ? <div className="hidden shrink-0 shop-lg:block">{deliverTo}</div> : null}

        {/*
          Never autofocused: the header is on every page, and a caret that jumps into it puts a
          phone keyboard over the shop on every arrival.
        */}
        <div className="flex min-w-0 flex-1">
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

        {accountHref ? (
          <Link href={accountHref} className="hidden shrink-0 flex-col text-xs leading-[1.3] shop-lg:flex">
            <span className="opacity-85">{text.accountGreeting}</span>
            <span className="text-sm font-bold">{text.account}</span>
          </Link>
        ) : null}

        {cartHref ? (
          <Link
            href={cartHref}
            aria-label={format(text.cartWithCount, { count: String(cartCount) })}
            className="flex shrink-0 items-center gap-1.5 text-sm font-bold"
          >
            <span className="relative flex">
              <ShoppingBagIcon aria-hidden="true" className="size-7" strokeWidth={1.8} />
              {cartCount > 0 ? (
                // The brand toned against the header, so it shows on a header painted in the brand.
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold"
                  style={{ backgroundColor: "var(--shop-primary-on-header)", color: "var(--shop-on-primary-on-header)" }}
                >
                  {cartCount}
                </span>
              ) : null}
            </span>
            <span className="hidden shop-lg:inline">{text.cart}</span>
          </Link>
        ) : null}
      </div>

      {categories ? (
        <div
          className="w-full border-t"
          style={{ borderColor: "color-mix(in oklab, var(--shop-on-header) 14%, transparent)" }}
        >
          <div className={BAND}>{categories}</div>
        </div>
      ) : null}
    </header>
  )
}
