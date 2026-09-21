// React
import type { CSSProperties, ReactNode } from "react"

// Libs
import { SearchIcon, ShoppingBagIcon, UserRoundIcon } from "lucide-react"

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

  /** Band 1 — the header. Absent hrefs mean the icon does not render: nothing here is decorative. */
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
      {/* ---------------------------------------------------------------- 1 · header */}
      <header
        className="sticky top-0 z-30 w-full border-b border-current/10 backdrop-blur"
        style={{ backgroundColor: "color-mix(in oklab, var(--shop-background) 88%, transparent)" }}
      >
        <div className={cn(BAND, "flex h-16 items-center gap-3 sm:gap-6")}>
          <Link href={homeHref} className="flex shrink-0 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={text.logoAlt} className="size-9 rounded-lg object-cover" />
            ) : null}
            <span className="hidden text-base font-semibold sm:inline">{name}</span>
          </Link>

          {searchAction ? (
            <form method="get" action={searchAction} role="search" className="relative min-w-0 flex-1">
              <label htmlFor="storefront-search" className="sr-only">
                {text.search}
              </label>
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-60"
              />
              <input
                id="storefront-search"
                type="search"
                name="busca"
                defaultValue={searchValue}
                placeholder={text.search}
                className="h-10 w-full rounded-full border border-current/15 bg-transparent pr-3 pl-9 text-sm outline-none focus-visible:border-current/40"
              />
              {Object.entries(searchHidden ?? {}).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <button type="submit" className="sr-only">
                {text.searchAction}
              </button>
            </form>
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
      </header>

      {/* ---------------------------------------------------------------- 2 · categories */}
      {categories ? (
        <div className="w-full border-b border-current/10">
          <div className={cn(BAND, "py-3")}>{categories}</div>
        </div>
      ) : null}

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
      <footer className="w-full border-t border-current/10">
        <div className={cn(BAND, "flex flex-col items-center gap-4 py-8 text-center text-sm")}>
          <p className="font-semibold">{name}</p>
          {addressLine ? <p className="opacity-70">{addressLine}</p> : null}

          {links.length ? (
            <nav aria-label={text.socialLabel} className="flex items-center gap-4">
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
                    <Icon className="size-6" />
                  </a>
                )
              })}
            </nav>
          ) : null}
        </div>
      </footer>
    </div>
  )
}
