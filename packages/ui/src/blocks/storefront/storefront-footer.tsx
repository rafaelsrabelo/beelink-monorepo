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
import { BAND } from "./storefront-band"

export type StorefrontNetwork = "whatsapp" | "instagram" | "tiktok" | "youtube" | "spotify"

export interface StorefrontLink {
  network: StorefrontNetwork
  /** Built by the screen. A block never knows that a handle becomes `instagram.com/<handle>`. */
  href: string
}

/** One column of the footer. The screen builds them, because a block knows no address. */
export interface StorefrontFooterColumn {
  id: string
  title: string
  items: readonly { label: string; href: string }[]
}

export interface StorefrontFooterProps {
  name: string
  logoUrl?: string | null
  addressLine?: string | null
  links?: readonly StorefrontLink[]
  columns?: readonly StorefrontFooterColumn[]
  /** The line under everything. Built by the screen: the year and the name are the shop's. */
  copyright?: string
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
 * The foot of the shop window. Its own file because the window it came out of had passed the
 * line limit; nothing about it changed on the way. The designs 5a and 5b draw no footer, so this
 * is the one band of the shell that has nothing to be copied from.
 *
 * Painted in `--shop-footer` like the top of the page: the two ends of a shop are the same
 * furniture, and a footer in the page's own background just looks like the page running out.
 *
 * Columns and not one centred stack, because a footer is a map — the shop's own pages on one side
 * and who the shop is on the other. The screen builds the columns: a block that knew what
 * "Produtos" links to would be a block holding the route word this whole scheme exists to keep
 * out of components.
 */
export function StorefrontFooter({
  name,
  logoUrl,
  addressLine,
  links = [],
  columns = [],
  copyright,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontFooterProps) {
  const text = messages.storefront

  return (
    <footer className="w-full" style={{ backgroundColor: "var(--shop-footer)", color: "var(--shop-on-footer)" }}>
      <div className={cn(BAND, "flex flex-col gap-10 py-12 shop-sm:flex-row shop-sm:justify-between")}>
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

        {columns.length ? (
          <div className="grid grid-cols-2 gap-8 shop-sm:grid-cols-3">
            {columns.map((column) => (
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
  )
}
