// Types
import type { WebMessages } from "@/locales"

/**
 * The one place a panel `errorCode` becomes a sentence. The services throw codes; the screens ask
 * here — the same division `../auth/auth-error-copy.ts` sets up for the auth domain.
 *
 * It reads the code structurally rather than through `instanceof`, because three service errors now
 * reach the same screen: a refused save (`StoreRequestError`), a postcode that does not exist
 * (`CepRequestError`) and an upload with no storage behind it yet (`UploadError`). They are separate
 * classes so each service owns its own failures, and they share one dictionary because a shopkeeper
 * reads one panel.
 *
 * An unknown code answers the catch-all rather than showing a reader an identifier.
 */
function errorCodeOf(error: unknown): string {
  if (error instanceof Error && "errorCode" in error && typeof error.errorCode === "string") {
    return error.errorCode
  }

  return "UNKNOWN"
}

export function storeErrorCopy(error: unknown, messages: WebMessages): string | undefined {
  if (!error) return undefined

  const code = errorCodeOf(error)

  return messages.errors[code as keyof WebMessages["errors"]] ?? messages.errors.UNKNOWN
}

/**
 * One sentence for a card that has one place to put it. A tabbed form shows a single alert, and a
 * save, a postcode lookup and an upload can all be the last thing that went wrong — the newest
 * failure is the one the shopkeeper just caused, so the caller passes them in that order.
 */
export function firstStoreErrorCopy(errors: unknown[], messages: WebMessages): string | undefined {
  const failed = errors.find(Boolean)

  return failed ? storeErrorCopy(failed, messages) : undefined
}
