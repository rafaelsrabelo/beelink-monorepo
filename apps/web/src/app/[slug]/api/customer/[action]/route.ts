// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { AuthSession } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf, refuseForeignOrigin } from "@/lib/bff"
import {
  CUSTOMER_REFRESH_COOKIE,
  clearCustomerSessionCookies,
  setCustomerSessionCookies,
} from "@/lib/customer-session-cookies"
import { callAsShopper } from "@/lib/shopper-call"
import { BACK_KEY, MODE_KEY, PASSWORD_REPLACED_KEY, safeBackOf } from "@/lib/storefront-routes"

/** The profile refusals a field names for itself; any other 400 is "check the fields". */
const OWN_FIELD_REFUSALS: ReadonlySet<string> = new Set(["CUSTOMER_CPF_INVALID", "CUSTOMER_BIRTH_DATE_INVALID"])

function profileRefusalOf(status: number, code: string): string {
  return status === 400 && !OWN_FIELD_REFUSALS.has(code) ? "CUSTOMER_FIELDS_INVALID" : code
}

/**
 * Under the shop's own path, not `/api`: the shopper's session cookies live on `/<slug>`, and a
 * handler anywhere else would never receive them (`customer-session-cookies.ts`).
 *
 * The shop's sign-in page posts here, as a plain `<form>`: signing in (`entrar`), signing up
 * (`criar`), asking for a new password (`senha`) or a new confirmation link (`reenviar`, from an
 * expired one), setting the new password from the e-mailed link (`nova-senha`), saving the shopper's
 * details (`perfil`) and signing out (`sair`). Every answer is a 303 —
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
    const page = new URL(safeBackOf(slug, field("retorno")), publicOriginOf(request))
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

      const answer = NextResponse.redirect(new URL(back, publicOriginOf(request)), 303)
      setCustomerSessionCookies(answer.cookies, slug, (await response.json()) as AuthSession)
      return answer
    }
    case "criar": {
      const response = await callApi({ path: `${shop}/register`, body: { name: field("name").trim(), email, password: field("password"), returnTo: back }, clientIp }).catch(
        () => null,
      )
      if (response?.status === 400) return bounce("criar", { erro: "CUSTOMER_SIGN_UP_INVALID", email })
      if (!response?.ok) return bounce("criar", { erro: response ? await codeOf(response) : "UNKNOWN", email })
      return bounce("criar", { enviado: "1", email })
    }
    case "senha": {
      const response = await callApi({ path: `${shop}/forgot-password`, body: { email, returnTo: back }, clientIp }).catch(() => null)
      if (!response?.ok) return bounce("senha", { erro: response ? await codeOf(response) : "UNKNOWN", email })
      return bounce("senha", { enviado: "1" })
    }
    case "reenviar": {
      const response = await callApi({ path: `${shop}/resend-verification`, body: { email, returnTo: back }, clientIp }).catch(() => null)
      if (!response?.ok) return bounce("criar", { erro: response ? await codeOf(response) : "UNKNOWN", email })
      return bounce("criar", { enviado: "1", email })
    }
    case "perfil": {
      const page = new URL(safeBackOf(slug, field("retorno")), publicOriginOf(request))
      const body = {
        name: field("name").trim(),
        phone: field("phone"),
        cpf: field("cpf"),
        birthDate: field("birthDate"),
      }
      const saved = await callAsShopper(request, slug, (accessToken) =>
        callApi({ path: `${shop}/me`, method: "PATCH", body, accessToken, clientIp }).catch(() => null),
      )
      if (saved.status === "signedOut") {
        const signedOut = NextResponse.redirect(new URL(`/${slug}`, publicOriginOf(request)), 303)
        clearCustomerSessionCookies(signedOut.cookies, slug)
        return signedOut
      }
      const { response, renewed } = saved

      // A refusal goes back to the form (`formulario`), wherever a save would have gone: a phone the
      // shop already has is said there, and nowhere else.
      const landing = response?.ok ? page : new URL(safeBackOf(slug, field("formulario") || field("retorno")), publicOriginOf(request))
      if (response?.ok) landing.searchParams.set("salvo", "1")
      else landing.searchParams.set("erro", response ? profileRefusalOf(response.status, await codeOf(response)) : "UNKNOWN")

      const answer = NextResponse.redirect(landing, 303)
      if (renewed) setCustomerSessionCookies(answer.cookies, slug, renewed)
      return answer
    }
    case "nova-senha": {
      // Refused, back to the new-password page itself, token and all; saved, on to the sign-in.
      const retry = (erro: string) => {
        const page = new URL(safeBackOf(slug, field("retorno")), publicOriginOf(request))
        page.searchParams.set("erro", erro)
        return NextResponse.redirect(page, 303)
      }
      const password = field("password")
      if (password !== field("confirmacao")) return retry("CUSTOMER_PASSWORD_MISMATCH")

      const response = await callApi({ path: "/auth/reset-password", body: { token: field("token"), password }, clientIp }).catch(() => null)
      if (!response?.ok) {
        const code = response ? await codeOf(response) : "UNKNOWN"
        return retry(response?.status === 400 && code !== "AUTH_TOKEN_INVALID" ? "CUSTOMER_PASSWORD_INVALID" : code)
      }
      // The API ended every session of that account. A session of another account in this browser
      // is not that account's, and stays: nothing here knows whose link it was.
      const signIn = new URL(safeBackOf(slug, field("entrada")), publicOriginOf(request))
      signIn.searchParams.set(PASSWORD_REPLACED_KEY, "1")
      return NextResponse.redirect(signIn, 303)
    }
    case "sair": {
      const refreshToken = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value
      // Signing out always ends here, the API reachable or not: the cookies go either way.
      if (refreshToken) await callApi({ path: `${shop}/logout`, body: { refreshToken }, clientIp }).catch(() => null)

      const answer = NextResponse.redirect(new URL(`/${slug}`, publicOriginOf(request)), 303)
      clearCustomerSessionCookies(answer.cookies, slug)
      return answer
    }
    default:
      return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such action" }, { status: 404 })
  }
}
