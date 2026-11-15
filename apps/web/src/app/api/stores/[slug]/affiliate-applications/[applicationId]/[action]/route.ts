// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

type Context = RouteContext<"/api/stores/[slug]/affiliate-applications/[applicationId]/[action]">

/** The decisions the API takes on an application; any other word is not one, and never reaches it. */
const ACTIONS = new Set(["approve", "refuse"])

/**
 * An application approved — on the table named, else the page's — or refused (plan 2026-11-14). Nothing
 * the shop window shows changes with it: an invited affiliate has no link until they accept.
 */
export async function POST(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, applicationId, action } = await context.params
  if (!ACTIONS.has(action)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: `No such action: ${action}` }, { status: 404 })

  const body = action === "approve" ? ((await readJsonBody(request)) ?? {}) : undefined
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-applications/${encodeURIComponent(applicationId)}/${action}`, method: "POST", ...(body ? { body } : {}) })
  return NextResponse.json(payload, { status })
}
