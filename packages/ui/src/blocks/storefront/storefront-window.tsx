// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { shopPaletteStyle, type ShopColors } from "@harness-monorepo/ui/lib/shop-palette"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { ShopPaletteProvider } from "./shop-palette-context"
import { StorefrontAnnouncement } from "./storefront-announcement"
import { BAND } from "./storefront-band"
import { StorefrontCover, type StorefrontBanner } from "./storefront-cover"
import { StorefrontFooter, type StorefrontFooterColumn, type StorefrontLink } from "./storefront-footer"
import { StorefrontMasthead, type StorefrontMastheadProps } from "./storefront-masthead"
import { StorefrontPitch } from "./storefront-pitch"

/** Declared beside the palette now; re-exported because screens import it from here. */
export type StorefrontColors = ShopColors

// Declared beside the footer now; re-exported because screens import them from here.
export type { StorefrontFooterColumn, StorefrontLink, StorefrontNetwork } from "./storefront-footer"

/** The strip above the header: what the shop is shouting this week, on each side of the page. */
export interface StorefrontAnnouncement {
  left: string
  /** Joined to the left with a dot: the strip scrolls one sentence, and this is its second half. */
  right?: string
  /** The strip's own colour, which is its band's. Null is the page's ink, as it always was. */
  background?: string | null
  /** Already resolved by the API. Null goes nowhere; the strip is then a poster, not a link. */
  href?: string | null
  external?: boolean
}

// Where they are declared now; re-exported because screens import them from here.
export type { StorefrontMenuItem } from "./storefront-masthead"
export type { StorefrontBanner } from "./storefront-cover"

export interface StorefrontWindowProps
  extends Pick<
    StorefrontMastheadProps,
    "searchAction" | "searchValue" | "searchHidden" | "searchSlot" | "cartHref" | "cartCount" | "accountHref" | "menu" | "cta" | "categories"
  > {
  name: string
  description?: string | null
  logoUrl?: string | null
  /** The shop's own address, for the logo to link home from a product page. */
  homeHref: string
  colors: StorefrontColors

  /** Band 0 — the strip over everything. Absent means no strip, never an empty bar. */
  announcement?: StorefrontAnnouncement | null

  // Bands 1 and 2 — the header and the menu — are the masthead's props, documented there once.

  /** Band 3 — the cover, when the shopkeeper chose one. */
  banner?: StorefrontBanner | null
  /** Band 6 — a second one, under the products. */
  bannerBelow?: StorefrontBanner | null

  /**
   * The landing page's own blocks, in the shopkeeper's order, drawn edge to edge.
   *
   * When it is given, bands 3 to 5 step aside: the cover, the promises and the shelves are all
   * blocks now, and which comes first is the shopkeeper's answer rather than this file's. Each one
   * states its own width — `StorefrontBand` for the contained ones, nothing for a cover that
   * bleeds — which is exactly what `children` inside a measured `<main>` cannot do.
   *
   * Every other page keeps passing `children`, because a product page is not an arrangement.
   */
  blocks?: ReactNode

  /**
   * A strip between the masthead and the page, drawn edge to edge: the listing's results band in
   * 5a, with its trail, heading and sort. Each page builds its own; the window only gives it the
   * full width, which a child inside the measured `<main>` cannot take.
   */
  pageHeader?: ReactNode

  /**
   * How `children` sit in the page.
   *
   * `padded` is the plain page: the shop's measure, 32px above and below, 32px between blocks.
   * `flush` hands the rhythm to the page — no padding, no gap, the measure still — for a page
   * that draws columns of its own, as the listing (5a) and the product page (5b) do.
   */
  layout?: "padded" | "flush"
  /**
   * What the page sits on. `background` is the shop's; `canvas` is a shade of it, for a page whose
   * panels are painted in the background and need a ground to stand out against — 5a's listing.
   */
  surface?: "background" | "canvas"

  /** Band 5 — the products. */
  children?: ReactNode

  /** Band 7 — the footer. */
  footerColumns?: readonly StorefrontFooterColumn[]
  /** The line under everything. Built by the screen: the year and the name are the shop's. */
  copyright?: string
  links?: readonly StorefrontLink[]
  orderHref?: string
  addressLine?: string | null

  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A shop window, as a page of full-width bands: header, categories, cover, products, a second
 * cover, footer. That order is the one every Brazilian shop this was measured against uses,
 * and each band is optional — a band with no data does not render, so a shop with six handmade
 * bags and no banner is a short page rather than a page of empty strips.
 *
 * It wears the shopkeeper's four colours, and that is the point of it: the panel is ours and looks
 * like us, the window is theirs and must not. The colours arrive as data and become CSS custom
 * properties, so one wrapper decides and any child asks for `--shop-primary` by name — which is
 * also why `web/no-hex-colors` is untroubled, as there is no literal anywhere.
 *
 * Nothing here reads a session. The cart and the account icon render only when the screen hands
 * over an address for them, and today it hands over neither: there is no cart and no buyer account
 * in the product, and an icon that goes nowhere teaches a visitor the rest of the page is a mockup.
 */
export function StorefrontWindow({
  name,
  description,
  logoUrl,
  homeHref,
  colors,
  announcement,
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
  banner,
  blocks,
  pageHeader,
  layout = "padded",
  surface = "background",
  bannerBelow,
  children,
  footerColumns = [],
  copyright,
  links = [],
  orderHref,
  addressLine,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontWindowProps) {
  // Every `--shop-*` variable, in the HTML on the first paint: see lib/shop-palette.ts.
  const dressed = shopPaletteStyle(colors)

  return (
    <ShopPaletteProvider colors={colors}>
    <div style={dressed} className="flex min-h-svh flex-col">
      {/* ---------------------------------------------------------------- 0 · the strip */}
      {announcement ? (
        <StorefrontAnnouncement
          left={announcement.left}
          {...(announcement.right ? { right: announcement.right } : {})}
          background={announcement.background ?? null}
          href={announcement.href ?? null}
          external={announcement.external ?? false}
          linkComponent={Link}
        />
      ) : null}

      <StorefrontMasthead
        name={name}
        logoUrl={logoUrl}
        homeHref={homeHref}
        searchSlot={searchSlot}
        {...(searchAction ? { searchAction } : {})}
        searchValue={searchValue}
        {...(searchHidden ? { searchHidden } : {})}
        {...(cartHref ? { cartHref } : {})}
        {...(cartCount !== undefined ? { cartCount } : {})}
        {...(accountHref ? { accountHref } : {})}
        menu={menu}
        cta={cta}
        categories={categories}
        linkComponent={Link}
        messages={messages}
      />

      {/* ---------------------------------------------------------------- 3 · the cover */}
      {blocks ? null : banner ? <StorefrontCover banner={banner} tall linkComponent={Link} /> : null}

      {/* ---------------------------------------------------------------- 4 · the page's own strip */}
      {pageHeader ?? null}

      {/* ---------------------------------------------------------------- 5 · the shop itself */}
      {blocks ? (
        <main className="flex flex-1 flex-col gap-8 pb-8">
          {/*
            No top padding, on purpose: a full-bleed hero is meant to meet the header. A block that
            is contained supplies its own, because only it knows it is not touching the edges.
          */}
          {blocks}
        </main>
      ) : (
        <main
          className={cn("flex flex-1 flex-col", layout === "padded" && "gap-8 py-8")}
          style={surface === "canvas" ? { backgroundColor: "var(--shop-canvas)" } : undefined}
        >
          <div className={cn(BAND, "flex flex-1 flex-col", layout === "padded" && "gap-8")}>
            {description ? <StorefrontPitch name={name} description={description} orderHref={orderHref} messages={messages} /> : null}
            {children}
          </div>
        </main>
      )}

      {/* ---------------------------------------------------------------- 6 · the second cover */}
      {bannerBelow ? <StorefrontCover banner={bannerBelow} linkComponent={Link} /> : null}

      {/* ---------------------------------------------------------------- 7 · footer */}
      <StorefrontFooter
        name={name}
        logoUrl={logoUrl}
        addressLine={addressLine}
        links={links}
        columns={footerColumns}
        copyright={copyright}
        linkComponent={Link}
        messages={messages}
      />
    </div>
    </ShopPaletteProvider>
  )
}
