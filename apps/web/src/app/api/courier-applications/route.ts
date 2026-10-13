// Next
import type { NextRequest, NextResponse } from "next/server"

// App
import { forwardToApi } from "@/lib/bff"

/**
 * A person sends the landing's courier form (BEELINK-322).
 *
 * Anonymous: no token travels, and none is read. What this handler adds is the two things the API's
 * guard needs from here — the origin and content-type check that stops another site posting to it,
 * and the visitor's address, which the per-IP limit is keyed on. Without that address every visitor
 * would share this server's one bucket of five.
 *
 * The body carries a CPF, an e-mail and a phone, and goes through as it came: nothing of it is read,
 * kept or logged here. The API's answer goes back as it was written — a 204 that never says whether
 * the CPF was already on the list, a field's own refusal, or the limit.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return forwardToApi(request, "/courier-applications")
}
