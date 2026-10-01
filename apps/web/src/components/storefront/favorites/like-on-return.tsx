"use client"

// React
import { useEffect, useRef } from "react"

// Next
import { usePathname, useRouter, useSearchParams } from "next/navigation"

// App
import { LIKE_ON_RETURN_KEYS } from "@/lib/favorite-list-query"
import { useToggleFavorite } from "@/services/favorites/favorite-hooks"

export interface LikeOnReturnProps {
  slug: string
  onRefused: (error: unknown) => void
}

/**
 * A visitor pressed a heart, signed in, and came back here with `curtir` in the address: the like is
 * made now, once, and the two words leave the address so a reload or a shared link does not like again.
 */
export function LikeOnReturn({ slug, onRefused }: LikeOnReturnProps) {
  const search = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const toggle = useToggleFavorite(slug)
  const done = useRef<string | null>(null)
  const productId = search.get(LIKE_ON_RETURN_KEYS.product)
  const variantId = search.get(LIKE_ON_RETURN_KEYS.variant)

  useEffect(() => {
    if (!productId || done.current === productId) return
    done.current = productId
    toggle.mutate({ productId, variantId, like: true }, { onError: onRefused })

    const rest = new URLSearchParams(search)
    rest.delete(LIKE_ON_RETURN_KEYS.product)
    rest.delete(LIKE_ON_RETURN_KEYS.variant)
    router.replace((rest.size > 0 ? `${pathname}?${rest}` : pathname) as Parameters<typeof router.replace>[0], { scroll: false })
  }, [productId, variantId, search, pathname, router, toggle, onRefused])

  return null
}
