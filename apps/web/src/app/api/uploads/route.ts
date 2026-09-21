// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { refuseForeignOrigin } from "@/lib/bff"
import { ACCESS_COOKIE } from "@/lib/session-cookies"

/**
 * The upload seam, with nothing behind it yet.
 *
 * WHAT REPLACES THIS: one storage adapter, called from here — read the multipart body, hand the
 * bytes to Cloudinary / an S3-compatible bucket / a mounted volume, and answer `{ url }` with the
 * public address it returns. Where the bytes go is a decision taken apart from this change, which
 * is why this handler exists at all: everything above it — `uploadImage()`, the hook, the field,
 * the sentence the shopkeeper reads — is finished and does not change when the adapter lands.
 *
 * Until then it refuses honestly. `UPLOAD_NOT_CONFIGURED` has an entry in the web's error
 * dictionary, so the shopkeeper is told that uploads are not switched on yet and that pasting a
 * URL still works — rather than being shown "Algo deu errado" and left to guess.
 *
 * `refuseForeignOrigin` and not `refuseCrossOrigin`: a file is posted as `multipart/form-data`,
 * which `refuseCrossOrigin`'s JSON check would reject outright. The session cookie is still
 * required, so this never becomes an open drop box — and the adapter must keep both checks.
 */
export function POST(request: NextRequest): NextResponse {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  if (!request.cookies.get(ACCESS_COOKIE)) {
    return error(401, "AUTH_UNAUTHENTICATED", "Sign in to continue")
  }

  return error(501, "UPLOAD_NOT_CONFIGURED", "No storage adapter is configured for uploads")
}

function error(statusCode: number, errorCode: string, message: string): NextResponse {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}
