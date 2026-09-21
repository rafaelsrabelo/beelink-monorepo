// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

/**
 * A created shop answers with its own record. Reading the slug back out of it — rather than out of
 * what was posted — means the invalidation follows what the API actually stored, which is the
 * normalised slug and not the one the browser typed.
 */
function slugOf(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("slug" in payload)) return null
  const { slug } = payload as { slug: unknown }
  return typeof slug === "string" ? slug : null
}

/** The shops this person owns. `GET /stores/mine` upstream — the legacy `GET /api/user/stores`. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: "/stores/mine", method: "GET" })

  return NextResponse.json(payload, { status })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, {
    path: "/stores",
    method: "POST",
    body: (await readJsonBody(request)) ?? {},
  })

  const slug = status === 201 ? slugOf(payload) : null

  // A shop that did not exist a moment ago may already have a cached 404 under its own tag: the
  // storefront answers /<slug> to anyone, crawlers included, before the shopkeeper finishes here.
  if (slug) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}
