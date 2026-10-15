// Types
import type {
  BillingAccount,
  BillingAccountAnswer,
  BillingAccountPayload,
  CouponRedemptionPayload,
  PlanCatalog,
  StoreSubscriptionAnswer,
  SubscriptionChoice,
  SubscriptionChoicePayload,
} from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class BillingRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "BillingRequestError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new BillingRequestError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

const subscriptionOf = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/subscription`

/** The plans on sale with what each cycle costs, and the trial's days: where the screen's figures come from. */
export function fetchPlanCatalog(): Promise<PlanCatalog> {
  return ask("/api/billing/plans")
}

/** Who the account's pages are charged to, the document masked; `account: null` while it never said. */
export function fetchBillingAccount(): Promise<BillingAccountAnswer> {
  return ask("/api/billing/account")
}

export function saveBillingAccount(payload: BillingAccountPayload): Promise<BillingAccount> {
  return ask("/api/billing/account", "PUT", payload)
}

/** Where the page stands, as the bee-link API last knew it: nothing is asked of Asaas. */
export function fetchStoreSubscription(slug: string): Promise<StoreSubscriptionAnswer> {
  return ask(subscriptionOf(slug))
}

/** The cycle chosen: the answer holds the invoice of the subscription's first charge, at Asaas. */
export function chooseSubscriptionCycle(slug: string, payload: SubscriptionChoicePayload): Promise<SubscriptionChoice> {
  return ask(subscriptionOf(slug), "PUT", payload)
}

/** Where the page stands once the API asked Asaas — at most once in ten seconds for a page. */
export function checkStoreSubscription(slug: string): Promise<StoreSubscriptionAnswer> {
  return ask(`${subscriptionOf(slug)}/check`, "POST", {})
}

/** A coupon of bee-link's used on the page (BEELINK-224): the answer is the page as it then reads, free for a month. */
export function redeemCoupon(slug: string, payload: CouponRedemptionPayload): Promise<StoreSubscriptionAnswer> {
  return ask(`${subscriptionOf(slug)}/coupon`, "POST", payload)
}
