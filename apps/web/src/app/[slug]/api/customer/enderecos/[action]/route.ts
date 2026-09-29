// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { CustomerSavedAddress, SaveCustomerAddressPayload } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody, type ApiCall } from "@/lib/api"
import { clientIpOf, refuseForeignOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { ADDRESS_ERROR_KEY, ADDRESS_NOTICE_KEY, DELIVER_TO_KEY, type AddressNotice } from "@/lib/saved-address"
import { callAsShopper } from "@/lib/shopper-call"
import { SHOP_SLUG } from "@/lib/shopper-forward"
import { safeBackOf } from "@/lib/storefront-routes"

const ACTIONS = ["salvar", "remover", "padrao"] as const
type Action = (typeof ACTIONS)[number]

const NOTICE_OF: Record<Action, AddressNotice> = { salvar: "endereco-salvo", remover: "endereco-removido", padrao: "endereco-padrao" }

/** An address's id: nothing else goes into the API's path — `..` would climb out of the address. */
const ADDRESS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Any 400 from a save is the address at large: the form already holds each field to its rule. */
function refusalOf(status: number, code: string): string {
  return status === 400 ? "CUSTOMER_ADDRESS_FIELDS_INVALID" : code
}

/**
 * The shopper's addresses at a shop, from the profile tab's plain forms (BEELINK-148): saving one,
 * new or edited (`salvar`), removing one (`remover`) and making one the default (`padrao`). Under the
 * shop's own path, where the shopper's cookies live; every answer is a 303, so it all works with no
 * script. A change lands on `retorno` with what it did; a refusal goes back to `formulario`, which
 * says it. A save on the way from the cart (`entregar=1`) lands there with the address to deliver to.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/enderecos/[action]">) {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug, action } = await params
  if (!SHOP_SLUG.test(slug) || !ACTIONS.includes(action as Action)) {
    return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such page" }, { status: 404 })
  }

  const form = await request.formData().catch(() => null)
  const field = (name: string) => {
    const value = form?.get(name)
    return typeof value === "string" ? value : ""
  }
  const shop = `/stores/${encodeURIComponent(slug)}/customer/addresses`
  const id = field("id")
  // A save without an id is a new address; any other id that is not one is an address not found.
  if ((id || action !== "salvar") && !ADDRESS_ID.test(id)) {
    const refusal = new URL(safeBackOf(slug, field("formulario") || field("retorno")), request.url)
    refusal.searchParams.set(ADDRESS_ERROR_KEY, "CUSTOMER_ADDRESS_NOT_FOUND")
    return NextResponse.redirect(refusal, 303)
  }
  const call = callOf(action as Action, shop, id, field)

  const answered = await callAsShopper(request, slug, (accessToken) => callApi({ ...call, accessToken, clientIp: clientIpOf(request) }).catch(() => null))
  if (answered.status === "signedOut") {
    const signedOut = NextResponse.redirect(new URL(`/${slug}`, request.url), 303)
    clearCustomerSessionCookies(signedOut.cookies, slug)
    return signedOut
  }
  const { response, renewed } = answered

  let landing: URL
  if (response?.ok) {
    landing = new URL(safeBackOf(slug, field("retorno")), request.url)
    landing.searchParams.set(ADDRESS_NOTICE_KEY, NOTICE_OF[action as Action])
    if (action === "salvar" && field(DELIVER_TO_KEY) === "1") landing.searchParams.set(DELIVER_TO_KEY, ((await response.json()) as CustomerSavedAddress).id)
  } else {
    landing = new URL(safeBackOf(slug, field("formulario") || field("retorno")), request.url)
    const body: unknown = response ? await response.json().catch(() => null) : null
    const code = isApiErrorBody(body) ? String(body.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN"
    landing.searchParams.set(ADDRESS_ERROR_KEY, response ? refusalOf(response.status, code) : "UNKNOWN")
  }

  const answer = NextResponse.redirect(landing, 303)
  if (renewed) setCustomerSessionCookies(answer.cookies, slug, renewed)
  return answer
}

/** The API call each action makes: a save is a `PUT` of the whole address with an id, a `POST` without. */
function callOf(action: Action, shop: string, id: string, field: (name: string) => string): Omit<ApiCall, "accessToken" | "clientIp"> {
  if (action === "remover") return { path: `${shop}/${id}`, method: "DELETE" }
  if (action === "padrao") return { path: `${shop}/${id}/default`, method: "POST" }

  const body = {
    label: field("label"),
    recipientName: field("recipientName"),
    zipCode: field("zipCode"),
    street: field("street"),
    number: field("number"),
    complement: field("complement"),
    neighborhood: field("neighborhood"),
    city: field("city"),
    state: field("state"),
    isDefault: field("isDefault") === "1",
  } satisfies SaveCustomerAddressPayload
  return id ? { path: `${shop}/${id}`, method: "PUT", body } : { path: shop, method: "POST", body }
}
