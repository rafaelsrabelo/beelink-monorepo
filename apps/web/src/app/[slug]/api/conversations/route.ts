// Next
import type { NextRequest } from "next/server"

// App
import { refuseCrossOrigin } from "@/lib/bff"
import { forwardAsShopper, SHOP_SLUG, shopperRefusal } from "@/lib/shopper-forward"

/** The shopper's conversations at this shop — those still taking messages first — as the API lists them. */
export async function GET(request: NextRequest, { params }: RouteContext<"/[slug]/api/conversations">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await params
  if (!SHOP_SLUG.test(slug)) return shopperRefusal(404, "NOT_FOUND", "No such shop")

  return forwardAsShopper(request, slug, { path: `/stores/${encodeURIComponent(slug)}/customer/conversations`, method: "GET" })
}
