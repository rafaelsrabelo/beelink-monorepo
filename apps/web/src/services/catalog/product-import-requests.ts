// Types
import type { ProductImportExtraction, ProductImportPayload, ProductImportResult } from "@harness-monorepo/contracts"

// App
import { CatalogRequestError } from "./catalog-requests"

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

async function answerOf<T>(response: Response): Promise<T> {
  if (!response.ok) throw new CatalogRequestError(errorCodeOf(await response.json().catch(() => null)))
  return (await response.json()) as T
}

const importPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/products/import`

/**
 * The menu, read into drafts. No `content-type` set by hand, for the reason `uploadImage` gives:
 * the browser writes it for a `FormData` body, boundary included.
 */
export async function extractProducts(slug: string, file: File): Promise<ProductImportExtraction> {
  const body = new FormData()
  body.append("file", file)

  return answerOf<ProductImportExtraction>(await fetch(`${importPath(slug)}/extract`, { method: "POST", body }))
}

/** JSON declared, as every other admin call declares it: `refuseCrossOrigin` answers 415 otherwise. */
export async function importProducts(slug: string, payload: ProductImportPayload): Promise<ProductImportResult> {
  return answerOf<ProductImportResult>(
    await fetch(importPath(slug), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  )
}
