/**
 * What a failed call carries: the API's stable code, never a sentence. The screen turns the code
 * into copy in the reader's language (apps/web/AGENTS.md).
 */
export class PageRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "PageRequestError"
  }
}

/**
 * Declared on every call, a bodyless read included: `refuseCrossOrigin` answers 415 to a request
 * that does not say it speaks JSON, which is what makes a form posted from another site unable to
 * reach these handlers at all.
 */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/** Every path here is this app's own route handler; the API's address is server-only. */
export async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: JSON_HEADERS, ...init })
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) throw new PageRequestError(errorCodeOf(payload))

  return payload as T
}
