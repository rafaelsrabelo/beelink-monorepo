// React
import type { CSSProperties, ReactNode } from "react"

// Libs
import { ShoppingBagIcon, UserRoundIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
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
  text: string
  header: string
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
  cartHref?: string
  cartCount?: number
  accountHref?: string

  /** Band 2 — the categories, rendered edge to edge above everything else. */
  categories?: ReactNode

  /** Band 3 — the cover, when the shopkeeper chose one. */
  banner?: StorefrontBanner | null
  /** Band 6 — a second one, under the products. */
  bannerBelow?: StorefrontBanner | null

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

/** Every band is full-bleed; what is centred is the content inside it. */
const BAND = "mx-auto w-full max-w-6xl px-4 sm:px-6"

function Banner({ banner, Link, tall }: { banner: StorefrontBanner; Link: LinkComponent; tall?: boolean }) {
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
  searchAction,
  searchValue = "",
  searchHidden,
  cartHref,
  cartCount,
  accountHref,
  categories,
  banner,
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

  const dressed = {
    "--shop-background": colors.background,
    "--shop-primary": colors.primary,
    "--shop-text": colors.text,
    "--shop-header": colors.header,
    backgroundColor: "var(--shop-background)",
    color: "var(--shop-text)",
  } as CSSProperties

  return (
    <div style={dressed} className="flex min-h-svh flex-col">
      {/* ---------------------------------------------------------------- 0 · the strip */}
      {announcement ? (
        <div
          className="w-full text-[11px] font-medium tracking-wide uppercase"
          style={{ backgroundColor: "var(--shop-text)", color: "var(--shop-background)" }}
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
        style={{ backgroundColor: "var(--shop-header)", color: "var(--shop-background)" }}
      >
        <div className={cn(BAND, "flex h-16 items-center gap-3 sm:gap-6")}>
          <Link href={homeHref} className="flex shrink-0 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={text.logoAlt} className="size-9 rounded-lg object-cover" />
            ) : null}
            <span className="hidden text-base font-semibold sm:inline">{name}</span>
          </Link>

          {/* Never autofocused: the header is on every page, and a caret that jumps into it puts
              a phone keyboard over the shop on every arrival. */}
          {searchAction ? (
            <StorefrontSearch
              action={searchAction}
              value={searchValue}
              hidden={searchHidden}
              tone="panel"
              messages={messages}
            />
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
                    style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-background)" }}
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
            style={{ borderColor: "color-mix(in oklab, var(--shop-background) 18%, transparent)" }}
          >
            <div className={BAND}>{categories}</div>
          </div>
        ) : null}
      </header>

      {/* ---------------------------------------------------------------- 3 · the cover */}
      {banner ? <Banner banner={banner} Link={Link} tall /> : null}

      {/* ---------------------------------------------------------------- 4 · what the shop promises */}
      {highlights.length ? (
        <div className="w-full" style={{ backgroundColor: "color-mix(in oklab, var(--shop-header) 12%, transparent)" }}>
          <ul className={cn(BAND, "grid grid-cols-2 gap-4 py-5 sm:grid-cols-4")}>
            {highlights.map((highlight) => (
              <li key={highlight.id} className="text-center text-xs">
                <p className="font-semibold">{highlight.title}</p>
                {highlight.detail ? <p className="opacity-70">{highlight.detail}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- 5 · the shop itself */}
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
                style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-background)" }}
              >
                <WhatsAppIcon className="size-5" />
                {text.order}
              </a>
            ) : null}
          </div>
        ) : null}

        {children}
      </main>

      {/* ---------------------------------------------------------------- 6 · the second cover */}
      {bannerBelow ? <Banner banner={bannerBelow} Link={Link} /> : null}

      {/* ---------------------------------------------------------------- 7 · footer */}
      {/*
        Painted in `--shop-header` like the top of the page: the two ends of a shop are the same
        furniture, and a footer in the page's own background just looks like the page running out.

        Columns and not one centred stack, because a footer is a map — the shop's own pages on one
        side and who the shop is on the other. The screen builds the columns: a block that knew
        what "Produtos" links to would be a block holding the route word this whole scheme exists
        to keep out of components.
      */}
      <footer className="w-full" style={{ backgroundColor: "var(--shop-header)", color: "var(--shop-background)" }}>
        <div className={cn(BAND, "flex flex-col gap-10 py-12 sm:flex-row sm:justify-between")}>
          <div className="flex max-w-xs flex-col gap-4">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="" aria-hidden="true" className="size-9 rounded-lg object-cover" />
              ) : null}
              <p className="text-base font-semibold">{name}</p>
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
            style={{ borderColor: "color-mix(in oklab, var(--shop-background) 15%, transparent)" }}
          >
            <div className={cn(BAND, "py-5 text-xs opacity-60")}>{copyright}</div>
          </div>
        ) : null}
      </footer>
    </div>
  )
}
