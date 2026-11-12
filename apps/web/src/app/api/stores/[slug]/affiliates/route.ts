// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/affiliates">

/** What the list may be asked for: the API validates the values, this keeps anything else from riding along. */
const LIST_QUERY = ["status", "page", "pageSize"] as const

/** The shop's affiliates, newest invited first, of one standing or all (IMPULSEIA-104). */
export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const query = new URLSearchParams()
  for (const key of LIST_QUERY) {
    const value = request.nextUrl.searchParams.get(key)
    if (value) query.set(key, value)
  }
  const search = query.size > 0 ? `?${query.toString()}` : ""
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliates${search}`, method: "GET" })
  return NextResponse.json(payload, { status })
}

/** Invite someone: the API writes them INVITED and e-mails the invite. */
export async function POST(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliates`, method: "POST", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
