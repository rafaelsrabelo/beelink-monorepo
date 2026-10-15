// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { forwardSignedIn, readJsonBody, refuseCrossOrigin } from "@/lib/bff"

/**
 * Who bee-link charges for the signed-in account's pages (BEELINK-291): the account's, not a page's,
 * so no slug is in the address. Read with the document masked, as the API answers it.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: "/billing/account", method: "GET" })
  return NextResponse.json(payload, { status })
}

/**
 * Keeps the name and the CPF or CNPJ, and has the account's customer at bee-link's Asaas account
 * match them. The body goes as it came: the API alone checks the document's digits, and nothing here
 * keeps or logs it. The API limits it per address, and `forwardSignedIn` hands it the shopkeeper's.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const refused = refuseCrossOrigin(request)
  if (refused) return refused

  const { status, payload } = await forwardSignedIn(request, { path: "/billing/account", method: "PUT", body: (await readJsonBody(request)) ?? {} })
  return NextResponse.json(payload, { status })
}
