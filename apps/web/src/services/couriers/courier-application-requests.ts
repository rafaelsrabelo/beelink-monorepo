// Types
import type { CourierApplicationPayload } from "@harness-monorepo/contracts"

/**
 * What a failed send carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9).
 * `UNKNOWN` is every failure that came with no code — the network, or an answer that was not the
 * API's.
 */
export class CourierApplicationRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "CourierApplicationRequestError"
  }
}

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload ? String((payload as { errorCode: unknown }).errorCode) : "UNKNOWN"
}

/**
 * A person asks to deliver with Beelink (BEELINK-322). The path is this app's own route handler —
 * the API's address is server-only — and the answer is a 204 with nothing in it. A CPF, an e-mail or
 * a WhatsApp already on the list is a refusal like a wrong field's, with a code of its own.
 *
 * A send that never reached the server throws the same error as one it refused: the screen has one
 * thing to read, a code.
 */
export async function sendCourierApplication(payload: CourierApplicationPayload): Promise<void> {
  let response: Response
  try {
    response = await fetch("/api/courier-applications", {
      method: "POST",
      // `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON.
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new CourierApplicationRequestError("UNKNOWN")
  }

  if (response.ok) return

  throw new CourierApplicationRequestError(errorCodeOf(await response.json().catch(() => null)))
}
