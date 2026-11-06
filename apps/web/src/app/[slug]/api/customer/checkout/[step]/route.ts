// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { CustomerCheckoutAnswer, PurchaseAddressPayload } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf, refuseForeignOrigin } from "@/lib/bff"
import { CHECKOUT_EMAIL_KEY, CHECKOUT_ERROR_KEY } from "@/lib/checkout-identity"
import { CUSTOMER_ACCESS_COOKIE, clearCustomerSessionCookies, setPurchaseSessionCookie } from "@/lib/customer-session-cookies"
import { ADDRESS_ERROR_KEY } from "@/lib/saved-address"
import { shopAddressOf } from "@/lib/shop-address"
import { SHOP_SLUG } from "@/lib/shopper-forward"
import { safeBackOf } from "@/lib/storefront-routes"

const STEPS = ["identificar", "endereco", "sair"] as const
type Step = (typeof STEPS)[number]

/**
 * A visitor's checkout (plan 2026-11-06--P0-checkout-sem-codigo), from its plain forms: who is buying
 * (`identificar`) opens their purchase session — no code, no account, the same for any e-mail — the
 * address they type is kept on it (`endereco`), and "Alterar" ends it (`sair`). Under the shop's path,
 * where the shopper's cookies are written. Every answer is a 303 back to the checkout (`retorno`), so it
 * works with no script, as the sign-in's forms do.
 *
 * A form post, so the origin check alone. The API's limit by address sees the visitor's (`clientIpOf`).
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/checkout/[step]">) {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug, step } = await params
  if (!SHOP_SLUG.test(slug) || !STEPS.includes(step as Step)) {
    return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such page" }, { status: 404 })
  }

  const here = shopAddressOf(request.headers, slug)
  const form = await request.formData().catch(() => null)
  const field = (name: string) => {
    const value = form?.get(name)
    return typeof value === "string" ? value : ""
  }
  const clientIp = clientIpOf(request)
  const accessToken = request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value
  const shop = `/stores/${encodeURIComponent(slug)}/customer`

  // Back to the checkout, always inside this shop whatever the form claimed, with what to say.
  const land = (query: Record<string, string>) => {
    const page = new URL(safeBackOf(here, field("retorno")), publicOriginOf(request))
    for (const [key, value] of Object.entries(query)) page.searchParams.set(key, value)
    return NextResponse.redirect(page, 303)
  }
  const refusalOf = async (response: Response | null, whole: string) => {
    if (!response) return "UNKNOWN"
    if (response.status === 400) return whole
    const body: unknown = await response.json().catch(() => null)
    return isApiErrorBody(body) ? String(body.errorCode) : response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"
  }
  // The session ended or expired under the visitor: back to "Seus dados", saying so, with nothing left of it.
  const ended = () => {
    const answer = land({ [CHECKOUT_ERROR_KEY]: "CUSTOMER_PURCHASE_ENDED" })
    clearCustomerSessionCookies(answer, here)
    return answer
  }

  switch (step as Step) {
    case "identificar": {
      const email = field("email").trim()
      const response = await callApi({ path: `${shop}/checkout`, body: { name: field("name").trim(), email, phone: field("phone") }, clientIp }).catch(() => null)
      if (!response?.ok) return land({ [CHECKOUT_ERROR_KEY]: await refusalOf(response, "CUSTOMER_CHECKOUT_INVALID"), [CHECKOUT_EMAIL_KEY]: email })
      const answer = land({})
      setPurchaseSessionCookie(answer, here, ((await response.json()) as CustomerCheckoutAnswer).purchase)
      return answer
    }
    case "endereco": {
      if (!accessToken) return ended()
      const body = {
        zipCode: field("zipCode"),
        street: field("street"),
        number: field("number") || null,
        complement: field("complement") || null,
        neighborhood: field("neighborhood") || null,
        city: field("city"),
        state: field("state"),
      } satisfies PurchaseAddressPayload
      const response = await callApi({ path: `${shop}/purchase/address`, method: "PUT", body, accessToken, clientIp }).catch(() => null)
      if (response?.status === 401) return ended()
      if (!response?.ok) return land({ [ADDRESS_ERROR_KEY]: await refusalOf(response, "CUSTOMER_ADDRESS_FIELDS_INVALID") })
      return land({})
    }
    case "sair": {
      if (accessToken) await callApi({ path: `${shop}/purchase`, method: "DELETE", accessToken, clientIp }).catch(() => null)
      const answer = land({})
      clearCustomerSessionCookies(answer, here)
      return answer
    }
  }
}
