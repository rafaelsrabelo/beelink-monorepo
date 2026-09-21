// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Types
import type { ApiErrorBody } from "@harness-monorepo/contracts"

// App
import { refuseForeignOrigin } from "@/lib/bff"
import { cloudinaryConfig, uploadImage } from "@/lib/cloudinary"
import { ACCESS_COOKIE } from "@/lib/session-cookies"

/**
 * The one lane that puts bytes anywhere. Every image in the panel — the logo today, a banner and
 * the product pictures next — goes through `uploadImage()` in the browser and lands here.
 *
 * It answers `{ url }`, and nothing about the storage behind it reaches the client: swapping
 * Cloudinary for a bucket is this file and `lib/cloudinary.ts`, with no screen changed.
 *
 * A deployment with no credentials still serves the panel and refuses here with
 * `UPLOAD_NOT_CONFIGURED`, which the web's error dictionary turns into a real sentence. That is a
 * state worth being able to run in — a preview build needs no storage account — and it is why the
 * configuration is read per request rather than asserted at boot.
 *
 * `refuseForeignOrigin` and not `refuseCrossOrigin`: a file is posted as `multipart/form-data`,
 * which `refuseCrossOrigin`'s JSON check would reject outright. The session cookie is still
 * required, so this is never an open drop box — an upload endpoint that is not is someone else's
 * free image host, billed to this account.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  if (!request.cookies.get(ACCESS_COOKIE)) {
    return error(401, "AUTH_UNAUTHENTICATED", "Sign in to continue")
  }

  const config = cloudinaryConfig()

  // Checked before the body is read: there is no reason to buffer megabytes that have nowhere to go.
  if (!config) {
    return error(501, "UPLOAD_NOT_CONFIGURED", "No storage adapter is configured for uploads")
  }

  let file: FormDataEntryValue | null

  try {
    file = (await request.formData()).get("file")
  } catch {
    return error(400, "BAD_REQUEST", "Expected a multipart body with a file")
  }

  if (!(file instanceof File)) {
    return error(400, "BAD_REQUEST", "Expected a file under the name 'file'")
  }

  const uploaded = await uploadImage(file, config)

  switch (uploaded.status) {
    case "uploaded":
      return NextResponse.json({ url: uploaded.url }, { status: 200 })
    case "unsupported":
      return error(415, "UNSUPPORTED_MEDIA_TYPE", "That image format is not accepted")
    case "too-large":
      return error(413, "PAYLOAD_TOO_LARGE", "That image is over the size limit")
    case "unavailable":
      // 502 and not 500: this app is healthy and the shopkeeper chose a perfectly good picture —
      // the storage service did not take it. The sentence the panel shows says exactly that.
      return error(502, "BAD_GATEWAY", "The storage service did not accept the upload")
  }
}

function error(statusCode: number, errorCode: string, message: string): NextResponse {
  return NextResponse.json({ statusCode, errorCode, message } satisfies ApiErrorBody, { status: statusCode })
}
