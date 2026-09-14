// Types
import type { User } from "@harness-monorepo/contracts"

/**
 * What a failed call carries: the API's stable code, never a sentence. The screen turns the code
 * into copy in the reader's language (apps/web/AGENTS.md).
 */
export class AuthRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "AuthRequestError"
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const errorCode =
      typeof payload === "object" && payload !== null && "errorCode" in payload
        ? String((payload as { errorCode: unknown }).errorCode)
        : "UNKNOWN"

    throw new AuthRequestError(errorCode)
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export function signIn(values: { email: string; password: string }): Promise<User> {
  return post<User>("/api/session", values)
}

export async function signOut(): Promise<void> {
  const response = await fetch("/api/session", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  })

  if (!response.ok) throw new AuthRequestError("UNKNOWN")
}

export function signUp(values: { name: string; email: string; password: string }): Promise<User> {
  return post<User>("/api/auth/register", values)
}

export function resendVerification(email: string): Promise<void> {
  return post<void>("/api/auth/resend-verification", { email })
}

export function forgotPassword(email: string): Promise<void> {
  return post<void>("/api/auth/forgot-password", { email })
}

export function resetPassword(values: { token: string; password: string }): Promise<void> {
  return post<void>("/api/auth/reset-password", values)
}
