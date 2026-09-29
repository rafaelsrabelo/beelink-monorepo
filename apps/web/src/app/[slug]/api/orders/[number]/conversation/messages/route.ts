// Next
import type { NextRequest } from "next/server"

// App
import { readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { forwardAsShopper, ORDER_NUMBER, SHOP_SLUG, shopperRefusal } from "@/lib/shopper-forward"

/**
 * A message from the shopper to the shop about the order; the first one opens the conversation. Only
 * the text goes on, and the visitor's address with it: the API limits messages per address.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/orders/[number]/conversation/messages">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await params
  if (!SHOP_SLUG.test(slug)) return shopperRefusal(404, "NOT_FOUND", "No such shop")
  if (!ORDER_NUMBER.test(number)) return shopperRefusal(404, "ORDER_NOT_FOUND", "No such order")

  const sent = await readJsonBody(request)
  const body = typeof sent === "object" && sent !== null && "body" in sent ? sent.body : undefined

  return forwardAsShopper(request, slug, { path: `/stores/${encodeURIComponent(slug)}/customer/orders/${number}/conversation/messages`, body: { body } })
}
