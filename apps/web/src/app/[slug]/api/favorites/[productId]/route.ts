// Next
import type { NextRequest } from "next/server"

// Types
import type { LikeFavoritePayload } from "@harness-monorepo/contracts"

// App
import { refuseCrossOrigin } from "@/lib/bff"
import { forwardAsShopper, SHOP_SLUG, shopperRefusal } from "@/lib/shopper-forward"

/** A product id as the API takes one; anything else names nothing, and nothing is asked. */
const PRODUCT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Context = RouteContext<"/[slug]/api/favorites/[productId]">

async function targetOf({ params }: Context): Promise<{ slug: string; path: string } | null> {
  const { slug, productId } = await params
  if (!SHOP_SLUG.test(slug) || !PRODUCT_ID.test(productId)) return null
  return { slug, path: `/stores/${encodeURIComponent(slug)}/customer/favorites/${productId}` }
}

/**
 * Likes the product — with the combination chosen on its page, or none — as the API answers: 204,
 * and liking it again changes nothing. Only the combination is passed on, and only as an id or null.
 */
export async function PUT(request: NextRequest, context: Context) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const target = await targetOf(context)
  if (!target) return shopperRefusal(404, "NOT_FOUND", "No such product")

  const sent: unknown = await request.json().catch(() => null)
  const variantId = typeof sent === "object" && sent !== null && "variantId" in sent ? sent.variantId : null
  if (variantId !== null && typeof variantId !== "string") return shopperRefusal(400, "BAD_REQUEST", "variantId is an id or null")

  return forwardAsShopper(request, target.slug, { path: target.path, method: "PUT", body: { variantId } satisfies LikeFavoritePayload })
}

/** Unlikes it; one that was not liked answers the same 204. */
export async function DELETE(request: NextRequest, context: Context) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const target = await targetOf(context)
  if (!target) return shopperRefusal(404, "NOT_FOUND", "No such product")

  return forwardAsShopper(request, target.slug, { path: target.path, method: "DELETE" })
}
