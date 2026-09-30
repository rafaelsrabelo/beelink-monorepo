"use client"

// React
import { createContext, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

// UI
import { StorefrontFavoriteNotice } from "@harness-monorepo/ui/blocks/storefront/storefront-favorite-notice"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { FAVORITES_MAX } from "@/lib/favorite-list-query"
import { ShopperFavoriteError } from "@/services/favorites/favorite-requests"
import { LikeOnReturn } from "./like-on-return"

export interface FavoritesContextValue {
  slug: string
  signedIn: boolean
  /** Where a visitor signs in: the heart adds the way back to it. */
  signInPath: string
  /** The favourites tab, where the cap's notice points. */
  favoritesHref: string
  /** What a refused heart says, at the foot of the screen. */
  report: (error: unknown) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

/** The shop's hearts' shared facts; null outside a shop's pages — the panel's previews — where a heart draws nothing. */
export function useFavorites(): FavoritesContextValue | null {
  return useContext(FavoritesContext)
}

export interface FavoritesProviderProps {
  slug: string
  signedIn: boolean
  signInPath: string
  favoritesHref: string
  messages: UiMessages
  children: ReactNode
}

/**
 * Every heart of a shop's pages reads from here: who is looking, where to sign in, and one notice
 * for what the shop refused. It lives in the shop's layout, which already reads the session for
 * the header; the pages themselves stay the same for everyone.
 */
export function FavoritesProvider({ slug, signedIn, signInPath, favoritesHref, messages, children }: FavoritesProviderProps) {
  const text = messages.storefront
  const [notice, setNotice] = useState<{ message: string; link?: { href: string; label: string } } | null>(null)

  const report = useCallback(
    (error: unknown) => {
      const code = error instanceof ShopperFavoriteError ? error.errorCode : "UNKNOWN"
      setNotice(
        code === "CUSTOMER_FAVORITE_LIMIT"
          ? { message: format(text.favoriteLimit, { count: String(FAVORITES_MAX) }), link: { href: favoritesHref, label: text.favoriteLimitLink } }
          : { message: text.favoriteFailed },
      )
    },
    [favoritesHref, text],
  )
  const value = useMemo(() => ({ slug, signedIn, signInPath, favoritesHref, report }), [slug, signedIn, signInPath, favoritesHref, report])

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      {/* The address is read on the client; alone in its boundary, it holds nothing else back. */}
      {signedIn ? (
        <Suspense fallback={null}>
          <LikeOnReturn slug={slug} onRefused={report} />
        </Suspense>
      ) : null}
      <StorefrontFavoriteNotice message={notice?.message ?? null} {...(notice?.link ? { link: notice.link } : {})} onClose={() => setNotice(null)} linkComponent={AppLink} messages={messages} />
    </FavoritesContext.Provider>
  )
}
