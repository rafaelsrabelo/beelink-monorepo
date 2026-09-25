// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { AuthSession } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, refuseForeignOrigin } from "@/lib/bff"
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  clearCustomerSessionCookies,
  setCustomerSessionCookies,
} from "@/lib/customer-session-cookies"
import { refreshCustomerSession } from "@/lib/refresh-customer-session"
import { BACK_KEY, MODE_KEY, safeBackOf } from "@/lib/storefront-routes"

/**
 * Under the shop's own path, not `/api`: the shopper's session cookies live on `/<slug>`, and a
 * handler anywhere else would never receive them (`customer-session-cookies.ts`).
 *
 * The shop's sign-in page posts here, as a plain `<form>`: signing in (`entrar`), signing up
 * (`criar`), asking for a new password (`senha`) or a new confirmation link (`reenviar`, from an
 * expired one), saving the shopper's details (`perfil`) and signing out (`sair`). Every answer is a 303 —
 * to where the shopper was going, or back to the page with the refusal in the address — so it all
 * works with no script on the page, and the password never passes through page code.
 *
 * A form post, so it takes the origin check alone: a form cannot say it speaks JSON. The origin is
 * what stops another site posting a sign-in in the shopper's browser.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/[action]">) {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug, action } = await params
  // The segment arrives decoded: with `%2Fevil.example`, every `/${slug}` below would be another site.
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such shop" }, { status: 404 })

  const form = await request.formData().catch(() => null)
  const field = (name: string) => {
    const value = form?.get(name)
    return typeof value === "string" ? value : ""
  }
  const back = safeBackOf(slug, field(BACK_KEY))
  const clientIp = clientIpOf(request)
  const email = field("email").trim()

  // Back to the sign-in page, with what to say: always inside this shop, whatever the form claimed.
  const bounce = (mode: string, query: Record<string, string>) => {
    const page = new URL(safeBackOf(slug, field("retorno")), request.url)
    if (mode !== "entrar") page.searchParams.set(MODE_KEY, mode)
    page.searchParams.set(BACK_KEY, back)
    for (const [key, value] of Object.entries(query)) page.searchParams.set(key, value)
    return NextResponse.redirect(page, 303)
  }
  const codeOf = async (response: Response) => {
    const body: unknown = await response.json().catch(() => null)
    return isApiErrorBody(body) ? String(body.errorCode) : response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"
  }
  const shop = `/stores/${encodeURIComponent(slug)}/customer`

  switch (action) {
    case "entrar": {
      const response = await callApi({ path: `${shop}/login`, body: { email, password: field("password") }, clientIp }).catch(() => null)
      if (!response?.ok) return bounce("entrar", { erro: response ? await codeOf(response) : "UNKNOWN", email })

      const answer = NextResponse.redirect(new URL(back, request.url), 303)
      setCustomerSessionCookies(answer.cookies, slug, (await response.json()) as AuthSession)
      return answer
    }
    case "criar": {
      const response = await callApi({ path: `${shop}/register`, body: { name: field("name").trim(), email, password: field("password") }, clientIp }).catch(() => null)
      if (response?.status === 400) return bounce("criar", { erro: "CUSTOMER_SIGN_UP_INVALID", email })
      if (!response?.ok) return bounce("criar", { erro: response ? await codeOf(response) : "UNKNOWN", email })
      return bounce("criar", { enviado: "1", email })
    }
    case "senha": {
      const response = await callApi({ path: `${shop}/forgot-password`, body: { email }, clientIp }).catch(() => null)
      if (!response?.ok) return bounce("senha", { erro: response ? await codeOf(response) : "UNKNOWN", email })
      return bounce("senha", { enviado: "1" })
    }
    case "reenviar": {
      const response = await callApi({ path: `${shop}/resend-verification`, body: { email }, clientIp }).catch(() => null)
      if (!response?.ok) return bounce("criar", { erro: response ? await codeOf(response) : "UNKNOWN", email })
      return bounce("criar", { enviado: "1", email })
    }
    case "perfil": {
      const page = new URL(safeBackOf(slug, field("retorno")), request.url)
      const body = {
        name: field("name").trim(),
        phone: field("phone"),
        address: Object.fromEntries(["zipCode", "street", "number", "complement", "neighborhood", "city", "state"].map((key) => [key, field(key)])),
      }
      const save = (accessToken: string) => callApi({ path: `${shop}/me`, method: "PATCH", body, accessToken, clientIp }).catch(() => null)

      // The proxy renews a session whose access cookie is gone before this runs; a token that ran
      // out in between is renewed here — once — and the new pair stored on this answer.
      let renewed: AuthSession | null = null
      let response = await save(request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value ?? "")
      if (response?.status === 401) {
        const refreshToken = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value
        const outcome = refreshToken ? await refreshCustomerSession(slug, refreshToken, clientIp) : { status: "rejected" as const }
        if (outcome.status !== "renewed") {
          const signedOut = NextResponse.redirect(new URL(`/${slug}`, request.url), 303)
          clearCustomerSessionCookies(signedOut.cookies, slug)
          return signedOut
        }
        renewed = outcome.session
        response = await save(renewed.accessToken)
      }

      if (response?.ok) page.searchParams.set("salvo", "1")
      else page.searchParams.set("erro", response?.status === 400 ? "CUSTOMER_FIELDS_INVALID" : response ? await codeOf(response) : "UNKNOWN")

      const answer = NextResponse.redirect(page, 303)
      if (renewed) setCustomerSessionCookies(answer.cookies, slug, renewed)
      return answer
    }
    case "sair": {
      const refreshToken = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value
      // Signing out always ends here, the API reachable or not: the cookies go either way.
      if (refreshToken) await callApi({ path: `${shop}/logout`, body: { refreshToken }, clientIp }).catch(() => null)

      const answer = NextResponse.redirect(new URL(`/${slug}`, request.url), 303)
      clearCustomerSessionCookies(answer.cookies, slug)
      return answer
    }
    default:
      return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such action" }, { status: 404 })
  }
}
