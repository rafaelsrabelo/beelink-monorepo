// Types
import type { AcceptedAffiliate, AffiliateAcceptancePayload, AffiliateInvitation, AffiliateSignUpPayload, AffiliateSlugAvailability } from "@harness-monorepo/contracts"

/**
 * What a failed call about an invite carries: the API's stable code and, for the refusals that say
 * more — whom an invite is for, why a `/name` does not serve — its `details`. Never a sentence.
 */
export class AffiliateInviteError extends Error {
  constructor(
    readonly errorCode: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(errorCode)
    this.name = "AffiliateInviteError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, method: "GET" | "POST" = "GET", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {}
    const details = typeof record.details === "object" && record.details !== null ? (record.details as Record<string, unknown>) : {}
    throw new AffiliateInviteError(typeof record.errorCode === "string" ? record.errorCode : "UNKNOWN", response.status, details)
  }
  return payload as T
}

const invite = (token: string) => `/api/affiliate-invites/${encodeURIComponent(token)}`

export function fetchAffiliateInvitation(token: string): Promise<AffiliateInvitation> {
  return ask(invite(token))
}

export function checkAffiliateSlug(token: string, slug: string): Promise<AffiliateSlugAvailability> {
  return ask(`${invite(token)}/slug?slug=${encodeURIComponent(slug)}`)
}

export function acceptAffiliateInvite(token: string, payload: AffiliateAcceptancePayload): Promise<AcceptedAffiliate> {
  return ask(`${invite(token)}/accept`, "POST", payload)
}

/** Through the session's own handler: it writes the new account's cookies and answers only what was accepted. */
export function signUpThroughAffiliateInvite(token: string, payload: AffiliateSignUpPayload): Promise<AcceptedAffiliate> {
  return ask(`/api/session/affiliate-invite/${encodeURIComponent(token)}`, "POST", payload)
}
