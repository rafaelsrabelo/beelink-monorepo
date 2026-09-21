// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"
import { revalidateStore } from "@/lib/revalidate"

type Context = RouteContext<"/api/stores/[slug]/products/[productId]">

export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, productId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/products/${productId}`,
    method: "GET",
  })

  return NextResponse.json(payload, { status })
}

export async function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, productId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/products/${productId}`,
    method: "PUT",
    body: (await readJsonBody(request)) ?? {},
  })

  if (status === 200) revalidateStore(slug)

  return NextResponse.json(payload, { status })
}

export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { slug, productId } = await context.params
  const { status, payload } = await forwardSignedIn(request, {
    path: `/stores/${slug}/products/${productId}`,
    method: "DELETE",
  })

  if (status === 200 || status === 204) revalidateStore(slug)

  return NextResponse.json(payload ?? {}, { status: status === 204 ? 200 : status })
}
