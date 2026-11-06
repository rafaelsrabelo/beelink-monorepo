// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { forwardSignedIn, refuseForeignOrigin } from "@/lib/bff"

/**
 * A shop's menu, on its way to be read into drafts — the upload lane's shape, for the same
 * reasons `src/app/api/uploads/route.ts` gives: the body is a stream handed through, so the size
 * limit is the API's alone, and the origin check is the one a multipart body can pass.
 *
 * Nothing is written by this call, so nothing the shop window serves is dropped.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/stores/[slug]/products/import/extract">,
): Promise<NextResponse> {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const contentType = request.headers.get("content-type")

  if (!contentType?.startsWith("multipart/form-data") || !request.body) {
    return NextResponse.json(
      { statusCode: 400, errorCode: "BAD_REQUEST", message: "Expected a multipart body" } satisfies ApiErrorBody,
      { status: 400 },
    )
  }

  const { slug } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${encodeURIComponent(slug)}/products/import/extract`,
    method: "POST",
    rawBody: { stream: request.body, contentType },
  })

  return NextResponse.json(payload, { status })
}
