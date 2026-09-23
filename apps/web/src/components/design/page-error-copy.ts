// Types
import type { WebMessages } from "@/locales"

/**
 * The one place a page `errorCode` becomes a sentence, the way `../store/store-error-copy.ts` does
 * it for the shop. The service throws the code; the screen asks here.
 *
 * It exists because a refused delete used to fail in silence: the dialog closed, the band stayed,
 * and nothing on the screen said why. An unknown code answers the catch-all rather than showing a
 * reader an identifier.
 */
export function pageErrorCopy(error: unknown, messages: WebMessages): string | undefined {
  if (!error) return undefined

  const code =
    error instanceof Error && "errorCode" in error && typeof error.errorCode === "string" ? error.errorCode : "UNKNOWN"

  return messages.errors[code as keyof WebMessages["errors"]] ?? messages.errors.UNKNOWN
}
