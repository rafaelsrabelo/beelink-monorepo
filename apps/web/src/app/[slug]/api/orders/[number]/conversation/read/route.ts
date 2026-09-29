// Next
import type { NextRequest } from "next/server"

// App
import { refuseCrossOrigin } from "@/lib/bff"
import { forwardAsShopper, ORDER_NUMBER, SHOP_SLUG, shopperRefusal } from "@/lib/shopper-forward"

/** The shop's messages on the order, read by the shopper now; the answer is the conversation as it stands. */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/orders/[number]/conversation/read">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await params
  if (!SHOP_SLUG.test(slug)) return shopperRefusal(404, "NOT_FOUND", "No such shop")
  if (!ORDER_NUMBER.test(number)) return shopperRefusal(404, "ORDER_NOT_FOUND", "No such order")

  return forwardAsShopper(request, slug, { path: `/stores/${encodeURIComponent(slug)}/customer/orders/${number}/conversation/read`, body: {} })
}
