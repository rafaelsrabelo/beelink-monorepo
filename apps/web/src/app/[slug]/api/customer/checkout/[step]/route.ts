// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { AuthSession, CustomerCheckoutAnswer } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf, refuseForeignOrigin } from "@/lib/bff"
import { CHECKOUT_EMAIL_KEY, CHECKOUT_ERROR_KEY, CODE_RESENT_KEY, CODE_STEP_KEY } from "@/lib/checkout-identity"
import { setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { shopAddressOf } from "@/lib/shop-address"
import { SHOP_SLUG } from "@/lib/shopper-forward"
import { safeBackOf } from "@/lib/storefront-routes"

const STEPS = ["identificar", "codigo", "reenviar"] as const
type Step = (typeof STEPS)[number]

/**
 * The checkout's "who is buying" (plan 2026-11-05--compra-sem-cadastro), from its plain forms:
 * a name, an e-mail and a WhatsApp (`identificar`), the code e-mailed to an account the shop already
 * has (`codigo`), and another code (`reenviar`). Under the shop's path, where the shopper's cookies
 * are written. Every answer is a 303 back to the checkout (`retorno`), signed in or with the next step
 * or the refusal in its address — so it works with no script, as the sign-in's forms do.
 *
 * A form post, so the origin check alone: a form cannot say it speaks JSON. The API's limit by address
 * sees the visitor's (`clientIpOf`): this is the door that opens accounts.
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
  const email = field("email").trim()
  const clientIp = clientIpOf(request)
  const door = `/stores/${encodeURIComponent(slug)}/customer/checkout`

  // Back to the checkout, always inside this shop whatever the form claimed, with what to say.
  const land = (query: Record<string, string>) => {
    const page = new URL(safeBackOf(here, field("retorno")), publicOriginOf(request))
    for (const [key, value] of Object.entries(query)) page.searchParams.set(key, value)
    return NextResponse.redirect(page, 303)
  }
  const signedIn = (session: AuthSession) => {
    const answer = land({})
    setCustomerSessionCookies(answer, here, session)
    return answer
  }
  const refusalOf = async (response: Response | null, whole: string) => {
    if (!response) return "UNKNOWN"
    if (response.status === 400) return whole
    const body: unknown = await response.json().catch(() => null)
    return isApiErrorBody(body) ? String(body.errorCode) : response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"
  }
  const codeStep = { [CODE_STEP_KEY]: "1", [CHECKOUT_EMAIL_KEY]: email }

  switch (step as Step) {
    case "identificar": {
      const response = await callApi({ path: door, body: { name: field("name").trim(), email, phone: field("phone") }, clientIp }).catch(() => null)
      if (!response?.ok) return land({ [CHECKOUT_ERROR_KEY]: await refusalOf(response, "CUSTOMER_CHECKOUT_INVALID"), [CHECKOUT_EMAIL_KEY]: email })
      const answer = (await response.json()) as CustomerCheckoutAnswer
      return answer.kind === "SESSION" ? signedIn(answer.session) : land(codeStep)
    }
    case "codigo": {
      const response = await callApi({ path: `${door}/code`, body: { email, code: field("code") }, clientIp }).catch(() => null)
      if (!response?.ok) return land({ ...codeStep, [CHECKOUT_ERROR_KEY]: await refusalOf(response, "CUSTOMER_CODE_INVALID") })
      return signedIn((await response.json()) as AuthSession)
    }
    case "reenviar": {
      const response = await callApi({ path: `${door}/code/resend`, body: { email }, clientIp }).catch(() => null)
      if (!response?.ok) return land({ ...codeStep, [CHECKOUT_ERROR_KEY]: await refusalOf(response, "CUSTOMER_CHECKOUT_INVALID") })
      return land({ ...codeStep, [CODE_RESENT_KEY]: "1" })
    }
  }
}
