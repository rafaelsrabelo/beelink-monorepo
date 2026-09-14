// Types
import type { WebMessages } from "@/locales"

// App
import { AuthRequestError } from "@/services/auth/auth-requests"

/**
 * The one place an API `errorCode` becomes a sentence. Services throw codes; screens ask here.
 * An unknown code answers the catch-all rather than showing a reader an identifier.
 */
export function errorCopy(error: unknown, messages: WebMessages): string | undefined {
  if (!error) return undefined

  const code = error instanceof AuthRequestError ? error.errorCode : "UNKNOWN"

  return messages.errors[code as keyof WebMessages["errors"]] ?? messages.errors.UNKNOWN
}
