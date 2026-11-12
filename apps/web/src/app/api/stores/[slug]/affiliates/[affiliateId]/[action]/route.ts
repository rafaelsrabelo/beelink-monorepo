// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

type Context = RouteContext<"/api/stores/[slug]/affiliates/[affiliateId]/[action]">

/** The acts the API takes on an affiliate; any other word is not one, and never reaches it. */
const ACTIONS = new Set(["resend", "pause", "resume", "end"])

/**
 * Send the invite again, pause, resume or end (IMPULSEIA-104). The answer is the affiliate as they now
 * stand. Whether their link credits anyone changes with the last three (IMPULSEIA-105), and the shop
 * window keeps that answer under the shop's tag: it goes with the act.
 */
export async function POST(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, affiliateId, action } = await context.params
  if (!ACTIONS.has(action)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: `No such action: ${action}` }, { status: 404 })

  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliates/${encodeURIComponent(affiliateId)}/${action}`, method: "POST" })
  if (status >= 200 && status < 300 && action !== "resend") revalidateStore(slug)
  return NextResponse.json(payload, { status })
}
