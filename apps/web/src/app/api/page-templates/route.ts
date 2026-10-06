// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, refuseCrossOrigin } from "@/lib/bff"

/**
 * The models the home of a store not created yet may open with, for the create form: asked by the
 * type picked there and, to order the suggested ones, its category. Beside `stores` and not under
 * it, as `store-categories` is: there is no shop to key it by. It only lists.
 *
 * Only the two keys the API reads are passed on, and an empty one is left out: `?categoryId=` would
 * be refused as an id that is none, and no category is what an empty field means.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const asked = request.nextUrl.searchParams
  const query = new URLSearchParams()
  for (const key of ["storeType", "categoryId"]) {
    const value = asked.get(key)
    if (value) query.set(key, value)
  }

  const { status, payload } = await forwardSignedIn(request, {
    path: `/page-templates${query.size ? `?${query.toString()}` : ""}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}
