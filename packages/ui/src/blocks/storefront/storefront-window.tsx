// React
import type { CSSProperties, ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
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

export interface StorefrontWindowProps {
  name: string
  description?: string | null
  logoUrl?: string | null
  /** Shown only when the shopkeeper chose the banner layout AND supplied one. */
  bannerImageUrl?: string | null
  colors: StorefrontColors
  links?: readonly StorefrontLink[]
  /** `wa.me/<digits>`, built by the screen. Absent means the shop has no WhatsApp on file. */
  orderHref?: string
  /** What goes under the window — the catalogue, once there is one. */
  children?: ReactNode
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
 * What a customer sees when they open a shop's address.
 *
 * It wears the shopkeeper's own four colours, and that is the whole reason this block does not use
 * the design system's tokens for its surface: the panel is ours and looks like us, the window is
 * theirs and must not. The colours arrive as data and are written to CSS custom properties, which
 * is also why `web/no-hex-colors` is untroubled by them — it forbids a literal in source, and
 * there is none here.
 *
 * Nothing on this page reads a session, and nothing here is a link back into the panel. A visitor
 * is anonymous and the HTML is cached and served to crawlers, so anything personal would be one
 * visitor's answer handed to the next.
 */
export function StorefrontWindow({
  name,
  description,
  logoUrl,
  bannerImageUrl,
  colors,
  links = [],
  orderHref,
  children,
  messages = defaultMessages,
}: StorefrontWindowProps) {
  const text = messages.storefront

  // Custom properties rather than inline colours on each element: one place decides, and a child
  // that needs the shop's primary asks for it by name instead of being handed it again.
  const dressed = {
    "--shop-background": colors.background,
    "--shop-primary": colors.primary,
    "--shop-text": colors.text,
    "--shop-header": colors.header,
    backgroundColor: "var(--shop-background)",
    color: "var(--shop-text)",
  } as CSSProperties

  return (
    <div style={dressed} className="min-h-svh">
      {bannerImageUrl ? (
        <img
          src={bannerImageUrl}
          alt=""
          // Decorative: the shop's name is the heading below, and a screen reader reading the
          // banner would announce the name twice before saying anything useful.
          aria-hidden="true"
          className="h-40 w-full object-cover sm:h-56"
        />
      ) : (
        <div aria-hidden="true" className="h-3 w-full" style={{ backgroundColor: "var(--shop-header)" }} />
      )}

      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8 text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={text.logoAlt}
            className="-mt-16 size-24 rounded-2xl border-4 object-cover shadow-sm"
            style={{ borderColor: "var(--shop-background)" }}
          />
        ) : null}

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{name}</h1>
          {description ? <p className="text-sm opacity-80">{description}</p> : null}
        </div>

        {orderHref ? (
          <a
            href={orderHref}
            rel="noreferrer"
            target="_blank"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-medium sm:w-auto"
            style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-background)" }}
          >
            <WhatsAppIcon className="size-5" />
            {text.order}
          </a>
        ) : null}

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
                  // The network is the accessible name: an icon with no words is a link that
                  // announces itself as "link" and nothing else.
                  aria-label={text.networks[link.network]}
                >
                  <Icon className="size-6" />
                </a>
              )
            })}
          </nav>
        ) : null}

        {children}
      </main>
    </div>
  )
}
