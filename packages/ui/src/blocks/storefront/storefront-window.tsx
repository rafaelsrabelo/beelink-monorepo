// React
import type { CSSProperties, ReactNode } from "react"

// Libs
import { ShoppingBagIcon, UserRoundIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { readableOn, toneOn } from "@harness-monorepo/ui/lib/contrast"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import {
  InstagramIcon,
  SpotifyIcon,
  TikTokIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "../store/store-brand-icons"
import { StorefrontSearch } from "./storefront-search"

/** The four colours a shop dresses its window in. They are data, chosen by the shopkeeper. */
export interface StorefrontColors {
  background: string
  primary: string
  header: string
  /** The foot, which used to borrow the header's. There is no `text`: it is derived per surface. */
  footer: string
}

export type StorefrontNetwork = "whatsapp" | "instagram" | "tiktok" | "youtube" | "spotify"

export interface StorefrontLink {
  network: StorefrontNetwork
  /** Built by the screen. A block never knows that a handle becomes `instagram.com/<handle>`. */
  href: string
}

/** The strip above the header: what the shop is shouting this week, on each side of the page. */
export interface StorefrontAnnouncement {
  left: string
  /** Dropped on a phone rather than wrapped: two lines of small caps is a banner, not a strip. */
  right?: string
}

/** One column of the footer. The screen builds them, because a block knows no address. */
export interface StorefrontFooterColumn {
  id: string
  title: string
  items: readonly { label: string; href: string }[]
}

/** One of the promises a shop makes above its products — free delivery, instalments, PIX. */
export interface StorefrontHighlight {
  id: string
  title: string
  detail?: string
  /**
   * The mark beside the words. A node and not an icon name, because the block would otherwise hold
   * a table mapping "pix" to a glyph — which is knowledge about what a shop takes at the door, and
   * belongs to the screen that already knows it.
   */
  icon?: ReactNode
}

export interface StorefrontBanner {
  imageUrl: string
  /** Where "comprar agora" goes. Absent means the banner is a picture and not a promise. */
  href?: string
  alt?: string
}

export interface StorefrontWindowProps {
  name: string
  description?: string | null
  logoUrl?: string | null
  /** The shop's own address, for the logo to link home from a product page. */
  homeHref: string
  colors: StorefrontColors

  /** Band 0 — the strip over everything. Absent means no strip, never an empty bar. */
  announcement?: StorefrontAnnouncement | null

  /**
   * Band 1 — the header. Absent hrefs mean the icon does not render: nothing here is decorative.
   *
   * The search arrives as an address and not as a ready-made node, unlike `categories`. The two
   * bands are not the same kind of thing: band 2 is a list whose every href only the screen can
   * build, so the screen builds it; a search is complete once it knows where to send the term,
   * and handing the window a node instead would hand every page the header's proportions to
   * get right on its own — six pages, six headers. No `searchAction`, no search.
   */
  searchAction?: string
  searchValue?: string
  searchHidden?: Record<string, string>
  /**
   * A search of the screen's own making, put where the plain one would go.
   *
   * The live one answers while someone types, which needs a client component, a request and a
   * cache — none of which belongs in a design-system block. So the screen builds it and hands it
   * over, and the header keeps deciding the proportions, which is the whole reason the plain
   * search arrives as an address instead of a node. A screen passes one or the other, never both.
   */
  searchSlot?: ReactNode
  cartHref?: string
  cartCount?: number
  accountHref?: string

  /** Band 2 — the categories, rendered edge to edge above everything else. */
  categories?: ReactNode

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
  /** Band 4 — what the shop promises. Empty means the band is absent, never an empty strip. */
  highlights?: readonly StorefrontHighlight[]

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

const ICONS: Record<StorefrontNetwork, typeof WhatsAppIcon> = {
  whatsapp: WhatsAppIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  spotify: SpotifyIcon,
}

/**
 * Every band is full-bleed; what is centred is the content inside it.
 *
 * 1440 and not the 1152 it started at. The shop owner said the page read as too centred and he was
 * right: at 1152 a wide monitor shows a column of shop with a hand's width of empty page on each
 * side, and a rail of four product cards inside it has cards the size of stamps. Every shop this
 * was measured against runs to about this width and then stops — stopping matters too, because a
 * line of body text the full width of a 27-inch screen is a line nobody finishes.
 */
const BAND = "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10"

function Section({ banner, Link, tall }: { banner: StorefrontBanner; Link: LinkComponent; tall?: boolean }) {
  const picture = (
    <img
      src={banner.imageUrl}
      alt={banner.alt ?? ""}
      // Decorative unless the shopkeeper wrote a description: a banner whose words are painted
      // into the JPEG has nothing a screen reader can read out of the file.
      aria-hidden={banner.alt ? undefined : "true"}
      className={cn("w-full object-cover", tall ? "h-44 sm:h-72 lg:h-96" : "h-32 sm:h-48")}
    />
  )

  return banner.href ? (
    <Link href={banner.href} className="block w-full">
      {picture}
    </Link>
  ) : (
    picture
  )
}

/**
 * A shop window, as a page of full-width bands: header, categories, cover, promises, products, a
 * second cover, footer. That order is the one every Brazilian shop this was measured against uses,
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
  categories,
  banner,
  blocks,
  bannerBelow,
  highlights = [],
  children,
  footerColumns = [],
  copyright,
  links = [],
  orderHref,
  addressLine,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontWindowProps) {
  const text = messages.storefront

  /*
    Four surfaces the shopkeeper chose, and one readable foreground derived from each.

    Per surface and not one global ink, which is the defect this replaces: `--shop-background` used
    to paint the page AND colour every word printed on a coloured surface. That holds only while
    the page is pale and the top is not — choose black for both and the shop is black on black.

    Computed here, where the variables are already written, so it is in the HTML on the first
    paint. The shop window is prerendered; a colour decided after hydration is a flash of
    unreadable text on every visit.

    `--shop-text` survives as a name because it is also a *surface* — the announcement strip, the
    logo chip and the poster's gradient are all drawn in it — and it is exactly the page's ink, so
    the two are one value rather than two that can disagree.
  */
  const ink = readableOn(colors.background)
  const dressed = {
    "--shop-background": colors.background,
    "--shop-on-background": ink,
    "--shop-primary": colors.primary,
    "--shop-on-primary": readableOn(colors.primary),
    /*
      The brand as a *word* on the page, rather than as a surface behind one.

      A section's heading, a "see all" link and a promise's icon are painted in the shop's own
      colour, and `readableOn` cannot serve them: answering "black or white" would throw the brand
      away. This is the brand itself, mixed toward the page's ink only as far as 4.5:1 requires —
      a pale yellow on white and a navy on black are the two a shopkeeper cannot read at all, and
      every other brand comes back untouched.
    */
    "--shop-primary-ink": toneOn(colors.primary, colors.background),
    "--shop-header": colors.header,
    "--shop-on-header": readableOn(colors.header),
    "--shop-footer": colors.footer,
    "--shop-on-footer": readableOn(colors.footer),
    "--shop-text": ink,
    "--shop-on-text": colors.background,
    backgroundColor: "var(--shop-background)",
    color: "var(--shop-on-background)",
  } as CSSProperties

  return (
    <div style={dressed} className="flex min-h-svh flex-col">
      {/* ---------------------------------------------------------------- 0 · the strip */}
      {announcement ? (
        <div
          className="w-full text-[11px] font-medium tracking-wide uppercase"
          style={{ backgroundColor: "var(--shop-text)", color: "var(--shop-on-text)" }}
        >
          <div className={cn(BAND, "flex h-8 items-center justify-center gap-6 sm:justify-between")}>
            <p>{announcement.left}</p>
            {announcement.right ? <p className="hidden sm:block">{announcement.right}</p> : null}
          </div>
        </div>
      ) : null}

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
        <div className={cn(BAND, "flex h-16 items-center gap-3 sm:gap-6")}>
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

      {/* ---------------------------------------------------------------- 3 · the cover */}
      {blocks ? null : banner ? <Section banner={banner} Link={Link} tall /> : null}

      {/* ---------------------------------------------------------------- 4 · what the shop promises */}
      {blocks || !highlights.length ? null : (
        <div className="w-full" style={{ backgroundColor: "color-mix(in oklab, var(--shop-header) 10%, transparent)" }}>
          <ul className={cn(BAND, "grid grid-cols-2 gap-x-6 gap-y-5 py-6 sm:grid-cols-4")}>
            {highlights.map((highlight) => (
              // Icon beside the words and not above them: four stacked icons read as a row of
              // buttons, and none of these is one. Left-aligned for the same reason — a centred
              // two-line block with a mark on top is a feature grid, and this is a receipt.
              <li key={highlight.id} className="flex items-center gap-3">
                {highlight.icon ? (
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: "color-mix(in oklab, var(--shop-primary) 14%, transparent)",
                      color: "var(--shop-primary-ink)",
                    }}
                  >
                    {highlight.icon}
                  </span>
                ) : null}
                <div className="flex min-w-0 flex-col">
                  <p className="text-sm font-semibold">{highlight.title}</p>
                  {highlight.detail ? <p className="text-xs opacity-70">{highlight.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
      <main className={cn(BAND, "flex flex-1 flex-col gap-8 py-8")}>
        {description ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-semibold">{name}</h1>
            <p className="max-w-2xl text-sm opacity-80">{description}</p>
            {orderHref ? (
              <a
                href={orderHref}
                rel="noreferrer"
                target="_blank"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-medium"
                style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
              >
                <WhatsAppIcon className="size-5" />
                {text.order}
              </a>
            ) : null}
          </div>
        ) : null}

        {children}
      </main>
      )}

      {/* ---------------------------------------------------------------- 6 · the second cover */}
      {bannerBelow ? <Section banner={bannerBelow} Link={Link} /> : null}

      {/* ---------------------------------------------------------------- 7 · footer */}
      {/*
        Painted in `--shop-header` like the top of the page: the two ends of a shop are the same
        furniture, and a footer in the page's own background just looks like the page running out.

        Columns and not one centred stack, because a footer is a map — the shop's own pages on one
        side and who the shop is on the other. The screen builds the columns: a block that knew
        what "Produtos" links to would be a block holding the route word this whole scheme exists
        to keep out of components.
      */}
      <footer className="w-full" style={{ backgroundColor: "var(--shop-footer)", color: "var(--shop-on-footer)" }}>
        <div className={cn(BAND, "flex flex-col gap-10 py-12 sm:flex-row sm:justify-between")}>
          <div className="flex max-w-xs flex-col gap-4">
            {/* Same rule as the masthead: the logo replaces the name, and says it. */}
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="h-9 w-auto max-w-40 object-contain" />
              ) : (
                <p className="text-base font-semibold">{name}</p>
              )}
            </div>
            {addressLine ? <p className="text-sm opacity-70">{addressLine}</p> : null}

          {links.length ? (
            <nav aria-label={text.socialLabel} className="flex items-center gap-3">
              {links.map((link) => {
                const Icon = ICONS[link.network]

                return (
                  <a
                    key={link.network}
                    href={link.href}
                    rel="noreferrer"
                    target="_blank"
                    className="rounded-full p-2 opacity-80 transition-opacity hover:opacity-100"
                    aria-label={text.networks[link.network]}
                  >
                    <Icon className="size-5" />
                  </a>
                )
              })}
            </nav>
          ) : null}
          </div>

          {footerColumns.length ? (
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {footerColumns.map((column) => (
                <nav key={column.id} aria-label={column.title} className="flex flex-col gap-3">
                  <p className="text-xs font-semibold tracking-widest uppercase opacity-60">{column.title}</p>
                  <ul className="flex flex-col gap-2 text-sm">
                    {column.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="opacity-80 transition-opacity hover:opacity-100">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          ) : null}
        </div>

        {copyright ? (
          <div
            className="w-full border-t"
            style={{ borderColor: "color-mix(in oklab, var(--shop-on-footer) 15%, transparent)" }}
          >
            <div className={cn(BAND, "py-5 text-xs opacity-60")}>{copyright}</div>
          </div>
        ) : null}
      </footer>
    </div>
  )
}
