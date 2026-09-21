// Types
import type { ZipCodeAddress } from "@/lib/viacep"

// App
import { toZipCodeDigits } from "@/lib/viacep"

export type { ZipCodeAddress } from "@/lib/viacep"

/**
 * What a failed lookup carries: the handler's stable code, never a sentence — the same division
 * `stores/store-requests.ts` sets up. `CEP_NOT_FOUND` and `CEP_UNAVAILABLE` are different codes so
 * the screen can say two different true things.
 */
export class CepRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "CepRequestError"
  }
}

/** Declared on a bodyless read too: refuseCrossOrigin() answers 415 to anything that omits it. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/**
 * Asks this app's own handler, which asks ViaCEP. The browser never reaches the postcode service,
 * so a shopkeeper's address is not handed to a third party on every keystroke.
 *
 * The mask is stripped here as well as in the handler: the field accepts "12345-678", the path
 * segment holds eight digits, and the two must not disagree about what was looked up.
 */
export async function fetchZipCodeAddress(zipCode: string): Promise<ZipCodeAddress> {
  const digits = toZipCodeDigits(zipCode)

  if (digits.length !== 8) throw new CepRequestError("CEP_INVALID")

  const response = await fetch(`/api/cep/${digits}`, { method: "GET", headers: JSON_HEADERS })

  if (!response.ok) {
    throw new CepRequestError(errorCodeOf(await response.json().catch(() => null)))
  }

  return (await response.json()) as ZipCodeAddress
}
