// Types
import type {
  CreateStoreCustomerPayload,
  StoreCustomer,
  StoreCustomerDetail,
  StoreCustomerListQuery,
  StoreCustomerPage,
  UpdateStoreCustomerPayload,
} from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class CustomerRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "CustomerRequestError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/** A page of the shop's customers, through this app's own route handler; the API's address is server-only. */
export async function fetchStoreCustomers(slug: string, query: StoreCustomerListQuery = {}): Promise<StoreCustomerPage> {
  const search = new URLSearchParams()
  if (query.q) search.set("q", query.q)
  if (query.stage) search.set("stage", query.stage)
  if (query.sort) search.set("sort", query.sort)
  if (query.page && query.page > 1) search.set("page", String(query.page))
  if (query.pageSize) search.set("pageSize", String(query.pageSize))

  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/customers${search.size ? `?${search.toString()}` : ""}`, {
    method: "GET",
    headers: JSON_HEADERS,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new CustomerRequestError(errorCodeOf(payload))
  return payload as StoreCustomerPage
}

/** One of the shop's customers, as their record reads them — also the one a new order was opened for. */
export async function fetchStoreCustomer(slug: string, customerId: string): Promise<StoreCustomerDetail> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/customers/${encodeURIComponent(customerId)}`, {
    method: "GET",
    headers: JSON_HEADERS,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new CustomerRequestError(errorCodeOf(payload))
  return payload as StoreCustomerDetail
}

/** Corrects the shop's record of a customer; a phone another customer has is `CUSTOMER_PHONE_TAKEN`. */
export async function updateStoreCustomer(slug: string, customerId: string, payload: UpdateStoreCustomerPayload): Promise<StoreCustomerDetail> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/customers/${encodeURIComponent(customerId)}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new CustomerRequestError(errorCodeOf(body))
  return body as StoreCustomerDetail
}

/** Registers a customer with no account; a phone the shop has is `CUSTOMER_PHONE_TAKEN`. */
export async function createStoreCustomer(slug: string, payload: CreateStoreCustomerPayload): Promise<StoreCustomer> {
  const response = await fetch(`/api/stores/${encodeURIComponent(slug)}/customers`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new CustomerRequestError(errorCodeOf(body))
  return body as StoreCustomer
}
