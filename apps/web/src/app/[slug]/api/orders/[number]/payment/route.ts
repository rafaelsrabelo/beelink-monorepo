// Next
import type { NextRequest } from "next/server"

// App
import { refuseCrossOrigin } from "@/lib/bff"
import { forwardAsShopper, ORDER_NUMBER, SHOP_SLUG, shopperRefusal } from "@/lib/shopper-forward"

const pathOf = (slug: string, number: string) => `/stores/${encodeURIComponent(slug)}/customer/orders/${number}/payment`

/**
 * The charge of one of the shopper's orders (BEELINK-205), as the bee-link API knows it: a Pix's
 * code and QR, a card's hosted invoice, or none. The payment screen reads it here again and again
 * while it waits — never Asaas, which the browser is told nothing of beyond the invoice's address.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/[slug]/api/orders/[number]/payment">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await params
  if (!SHOP_SLUG.test(slug)) return shopperRefusal(404, "NOT_FOUND", "No such shop")
  if (!ORDER_NUMBER.test(number)) return shopperRefusal(404, "ORDER_NOT_FOUND", "No such order")

  return forwardAsShopper(request, slug, { path: pathOf(slug, number), method: "GET" })
}

/**
 * Makes sure the order has a charge good to pay — "Gerar pagamento", "Gerar novo Pix". Nothing is
 * sent with it: the order says what is charged and how. The visitor's address goes along, since the
 * API limits these per address — each may talk to the shop's Asaas account.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/orders/[number]/payment">) {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, number } = await params
  if (!SHOP_SLUG.test(slug)) return shopperRefusal(404, "NOT_FOUND", "No such shop")
  if (!ORDER_NUMBER.test(number)) return shopperRefusal(404, "ORDER_NOT_FOUND", "No such order")

  return forwardAsShopper(request, slug, { path: pathOf(slug, number), body: {} })
}
