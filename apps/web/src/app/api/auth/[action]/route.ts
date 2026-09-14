// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardToApi } from "@/lib/bff"

/**
 * The auth calls that carry no token. They are listed rather than passed through, so this handler
 * can never become an open proxy to the API.
 */
const FORWARDED = new Set(["register", "verify-email", "resend-verification", "forgot-password", "reset-password"])

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/auth/[action]">,
): Promise<NextResponse> {
  const { action } = await context.params

  if (!FORWARDED.has(action)) {
    return NextResponse.json(
      { statusCode: 404, errorCode: "NOT_FOUND", message: "Unknown action" },
      { status: 404 },
    )
  }

  return forwardToApi(request, `/auth/${action}`)
}
