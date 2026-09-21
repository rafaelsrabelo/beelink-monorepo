// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedInRaw, refuseForeignOrigin } from "@/lib/bff"

/**
 * The picture of where a shop is, for an `<img>` on the address tab.
 *
 * It cannot use `refuseCrossOrigin`: an image request sets no `content-type`, so the JSON check
 * would refuse every one of them. What it uses instead is `Sec-Fetch-Site`, which the browser
 * writes and a page cannot forge — an `<img>` on someone else's site says `cross-site` and is
 * turned away here. Absent, it is a caller that is not a browser, and one without this cookie.
 *
 * That matters because this costs money: an image tag on any page, loaded by a shopkeeper who is
 * signed in, would otherwise spend this account's quota from their browser.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const site = request.headers.get("sec-fetch-site")

  if (site !== null && site !== "same-origin") {
    return new NextResponse(null, { status: 403 })
  }

  const lat = request.nextUrl.searchParams.get("lat") ?? ""
  const lon = request.nextUrl.searchParams.get("lon") ?? ""

  const answer = await forwardSignedInRaw(request, {
    path: `/addresses/map?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    method: "GET",
  })

  // No body on any of these: the caller is an `<img>`, and a JSON error in an image slot renders
  // as a broken picture with the reason nowhere a person can read it. The status is the message.
  if (!answer) return new NextResponse(null, { status: 401 })
  if (!answer.ok) return new NextResponse(null, { status: answer.status })

  return new NextResponse(answer.body, {
    status: 200,
    headers: {
      "content-type": answer.headers.get("content-type") ?? "image/png",
      // The same picture for the same point, for a day, in this person's browser only. Never
      // shared and never ours: MapTiler's terms allow a temporary personal cache and forbid a
      // server-side one, and this is the former by construction.
      "cache-control": "private, max-age=86400",
    },
  })
}
