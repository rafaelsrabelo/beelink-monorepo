// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { forwardSignedIn, refuseForeignOrigin } from "@/lib/bff"

/**
 * The upload lane, and nothing more: a hook asks this app, this app asks the API.
 *
 * It used to end here, calling Cloudinary itself, and that was wrong in a way worth writing down.
 * A route handler in this app cannot decide who anybody is — it holds the session cookie, but the
 * token inside it is only ever validated by the API. Checking that a cookie is *present* is not
 * authentication: a request with `bl_access=anything` passed, and every file it carried was stored
 * and billed to this product's account. `forwardSignedIn` attaches the token and the API decides.
 *
 * The body is handed through as a stream rather than read and rebuilt, so this app never holds the
 * bytes and there is no second size limit here to fall out of step with the API's.
 *
 * `refuseForeignOrigin` and not `refuseCrossOrigin`: a file arrives as `multipart/form-data`,
 * which a plain cross-site form can post, so the JSON check the rest of the admin lane uses would
 * reject it outright.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const contentType = request.headers.get("content-type")

  if (!contentType?.startsWith("multipart/form-data") || !request.body) {
    return NextResponse.json(
      { statusCode: 400, errorCode: "BAD_REQUEST", message: "Expected a multipart body" } satisfies ApiErrorBody,
      { status: 400 },
    )
  }

  const { status, payload } = await forwardSignedIn(request, {
    path: "/uploads",
    method: "POST",
    rawBody: { stream: request.body, contentType },
  })

  return NextResponse.json(payload, { status })
}
