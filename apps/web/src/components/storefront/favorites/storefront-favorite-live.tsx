"use client"

// Next
import { usePathname, useSearchParams } from "next/navigation"

// UI
import { StorefrontFavoriteButton } from "@harness-monorepo/ui/blocks/storefront/storefront-favorite-button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { LIKE_ON_RETURN_KEYS } from "@/lib/favorite-list-query"
import { BACK_KEY } from "@/lib/storefront-routes"
import { useFavoriteIds, useToggleFavorite } from "@/services/favorites/favorite-hooks"
import { useFavorites, type FavoritesContextValue } from "./favorites-provider"
import { useTrack } from "../tracking/use-track"

export interface StorefrontFavoriteLiveProps {
  productId: string
  productName: string
  /** What it costs now, where the page knows: it goes with the like told as made. */
  priceCents?: number
  /** The combination chosen on the product's page; null likes the product as a whole. */
  variantId?: string | null
  look?: "icon" | "text"
  messages: UiMessages
}

/**
 * A heart wired to the shop: pressed for a product the shopper liked, turning at the press. For a
 * visitor it is the way to sign in, which comes back here with the product to like in the address.
 * Outside a shop's pages — the panel's previews — it draws nothing, and asks nothing.
 */
export function StorefrontFavoriteLive(props: StorefrontFavoriteLiveProps) {
  const favorites = useFavorites()
  if (!favorites) return null
  return favorites.signedIn ? <SignedInHeart {...props} favorites={favorites} /> : <SignInHeart {...props} favorites={favorites} />
}

type HeartProps = StorefrontFavoriteLiveProps & { favorites: FavoritesContextValue }

function SignedInHeart({ productId, productName, priceCents, variantId = null, look = "icon", messages, favorites }: HeartProps) {
  const ids = useFavoriteIds(favorites.slug, true)
  const toggle = useToggleFavorite(favorites.slug)
  const liked = ids.data?.productIds.includes(productId) ?? false
  const track = useTrack()
  // Told once the shop kept it, and only a like: one refused at the cap was never added, and a heart turned off adds nothing.
  const told = liked ? {} : { onSuccess: () => track({ name: "AddToWishlist", product: { id: productId, name: productName, ...(priceCents !== undefined ? { priceCents } : {}) } }) }

  return (
    <StorefrontFavoriteButton
      name={productName}
      liked={liked}
      look={look}
      // Only while the first read is on its way: one that failed leaves the heart pressable, and the press says why.
      disabled={ids.isPending}
      onToggle={() => toggle.mutate({ productId, variantId, like: !liked }, { onError: favorites.report, ...told })}
      messages={messages}
    />
  )
}

/** Back to this very page after signing in, with the product — and its combination, when chosen — to like on arrival. */
function SignInHeart({ productId, productName, variantId = null, look = "icon", messages, favorites }: HeartProps) {
  const pathname = usePathname()
  const back = new URLSearchParams(useSearchParams())
  back.set(LIKE_ON_RETURN_KEYS.product, productId)
  if (variantId) back.set(LIKE_ON_RETURN_KEYS.variant, variantId)
  else back.delete(LIKE_ON_RETURN_KEYS.variant)
  const signInHref = `${favorites.signInPath}?${new URLSearchParams({ [BACK_KEY]: `${pathname}?${back}` })}`

  return <StorefrontFavoriteButton name={productName} liked={false} look={look} signInHref={signInHref} linkComponent={AppLink} messages={messages} />
}
