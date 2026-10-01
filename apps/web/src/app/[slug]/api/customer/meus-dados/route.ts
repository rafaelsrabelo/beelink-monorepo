// Next
import { NextResponse, type NextRequest } from "next/server"

// App
import { PRIVACY_ERROR_KEY } from "@/lib/account-privacy"
import { callApi } from "@/lib/api"
import { clientIpOf, publicOriginOf } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { callAsShopper } from "@/lib/shopper-call"
import { SHOP_SLUG } from "@/lib/shopper-forward"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

/** The day in the file's name, as the shop's country reads it. */
function todayOf(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now)
}

/**
 * "Baixar meus dados" (BEELINK-152): everything the shop keeps about the signed-in shopper, as a
 * file. A link and not a form, so where to come back to (`retorno`) and the sign-in (`entrada`) ride
 * in its address. Read with the shopper's own cookies, which only reach the shop's path; a session
 * that ended goes to the sign-in, and a copy that could not be made back to the section, saying so.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/meus-dados">) {
  const { slug } = await params
  if (!SHOP_SLUG.test(slug)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such page" }, { status: 404 })

  const query = request.nextUrl.searchParams
  const pageOf = (name: string) => new URL(safeBackOf(slug, query.get(name) ?? ""), publicOriginOf(request))

  const answered = await callAsShopper(request, slug, (accessToken) =>
    callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/me/data`, method: "GET", accessToken, clientIp: clientIpOf(request) }).catch(() => null),
  )

  if (answered.status === "signedOut") {
    const signIn = pageOf("entrada")
    signIn.searchParams.set(BACK_KEY, safeBackOf(slug, query.get("retorno") ?? ""))
    const answer = NextResponse.redirect(signIn, 303)
    clearCustomerSessionCookies(answer.cookies, slug)
    return answer
  }
  const { response, renewed } = answered

  const data: unknown = response?.ok ? await response.json().catch(() => null) : null
  let answer: NextResponse
  if (data !== null) {
    answer = new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="meus-dados-${slug}-${todayOf(new Date())}.json"`,
        // A person's whole record: never kept by a cache on the way.
        "cache-control": "no-store, private",
      },
    })
  } else {
    const back = pageOf("retorno")
    back.searchParams.set(PRIVACY_ERROR_KEY, "UNKNOWN")
    answer = NextResponse.redirect(back, 303)
  }
  if (renewed) setCustomerSessionCookies(answer.cookies, slug, renewed)
  return answer
}
