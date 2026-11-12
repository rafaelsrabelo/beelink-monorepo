// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { forwardSignedIn, refuseForeignOrigin } from "@/lib/bff"

/**
 * One photo or PDF of an affiliate's document (12/11/2026), handed to the API as a stream — as the
 * image uploads are — so this app never holds the bytes. `refuseForeignOrigin`: a file is
 * multipart, which the JSON check would refuse outright.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/stores/[slug]/affiliate-documents">): Promise<NextResponse> {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const contentType = request.headers.get("content-type")
  if (!contentType?.startsWith("multipart/form-data") || !request.body) {
    return NextResponse.json({ statusCode: 400, errorCode: "BAD_REQUEST", message: "Expected a multipart body" } satisfies ApiErrorBody, { status: 400 })
  }

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, { path: `/stores/${slug}/affiliate-documents`, method: "POST", rawBody: { stream: request.body, contentType } })
  return NextResponse.json(payload, { status })
}
